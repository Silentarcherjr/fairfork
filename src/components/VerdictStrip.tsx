import type { ReactNode } from 'react';
import type { Horizon, Timeline } from '../types/billing';
import type { RankResult } from '../types/ranking';
import { formatMoney } from '../lib/money';
import { formatDate } from './format';

type Props = {
  timeline: Timeline;
  result: RankResult;
  horizon: Horizon;
  startDate: string;
  comparisonHref?: string;
};

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** One receipt line: label, dotted leader, amount. */
function Line({ label, value, variant }: { label: ReactNode; value: ReactNode; variant?: string }) {
  return (
    <div className={`rline${variant ? ` rline--${variant}` : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * The verdict as a printed receipt: what the offer costs over the horizon and what currently fits best.
 * The difference is shown only when both costs are known and in USD, always as "if you switch".
 */
export function VerdictStrip({ timeline, result, horizon, startDate, comparisonHref = '#comparison' }: Props) {
  const months = `${horizon} mo`;
  const best = result.bestFit;

  let difference: number | null = null;
  if (
    timeline.status === 'known' &&
    best &&
    !best.isUserOffer &&
    best.horizonCostMinor !== null &&
    timeline.currency === 'USD' &&
    best.currency === 'USD'
  ) {
    difference = timeline.totalMinor - best.horizonCostMinor;
  }

  const offerLines: ReactNode[] = [];
  if (timeline.status === 'known') {
    const trialDays = Math.round(dayNumber(timeline.firstChargeDate) - dayNumber(startDate));
    if (trialDays > 0) {
      offerLines.push(<Line key="trial" label="Free trial" value={`${trialDays} ${trialDays === 1 ? 'day' : 'days'}`} />);
    }
    const n = timeline.charges.length;
    const amounts = new Set(timeline.charges.map((c) => c.amountMinor));
    if (n > 0) {
      const each = amounts.size === 1 ? ` × ${formatMoney(timeline.charges[0].amountMinor, timeline.currency)}` : '';
      offerLines.push(
        <Line key="charges" label={`${n} ${n === 1 ? 'charge' : 'charges'}${each}`} value={formatMoney(timeline.totalMinor, timeline.currency)} />,
      );
      offerLines.push(<Line key="first" label="First charge on" value={formatDate(timeline.firstChargeDate)} />);
    }
  }

  return (
    <section className="receipt" aria-labelledby="receipt-heading">
      <header className="receipt__head">
        <h2 id="receipt-heading" className="receipt__title">
          This offer
        </h2>
        <p className="receipt__meta">according to the pasted text · from {formatDate(startDate)}</p>
      </header>

      <dl className="receipt__lines">{offerLines}</dl>

      <dl className="receipt__lines receipt__lines--total">
        {timeline.status === 'known' ? (
          <Line label={`Total / ${months}`} value={formatMoney(timeline.totalMinor, timeline.currency)} variant="total" />
        ) : (
          <Line label={`Total / ${months}`} value="Unknown" variant="total" />
        )}
      </dl>
      <p className="receipt__note">
        {timeline.status === 'known'
          ? `This offer costs ${formatMoney(timeline.totalMinor, timeline.currency)} over ${horizon === 1 ? '1 month' : `${horizon} months`}, assuming you don't cancel.`
          : `Cost unknown — ${timeline.reason.charAt(0).toLowerCase() + timeline.reason.slice(1)}`}
      </p>

      <div className="receipt__cut" aria-hidden="true" />

      <h3 className="receipt__subtitle">Best fit for you</h3>
      {result.noneQualifies || !best ? (
        <p className="receipt__none">No option meets all your requirements — the comparison shows what ruled each one out.</p>
      ) : best.isUserOffer ? (
        <>
          <dl className="receipt__lines">
            <Line
              label="Your offer"
              value={best.horizonCostMinor !== null && best.currency ? formatMoney(best.horizonCostMinor, best.currency) : '—'}
              variant="best"
            />
          </dl>
          <p className="receipt__note">Your offer is currently the best fit for your requirements, according to the pasted text.</p>
        </>
      ) : (
        <>
          <dl className="receipt__lines">
            <Line
              label={best.label}
              value={best.horizonCostMinor !== null && best.currency ? formatMoney(best.horizonCostMinor, best.currency) : 'Unknown'}
              variant="best"
            />
            {difference !== null && (
              <Line
                label={difference >= 0 ? 'If you switch' : 'If you switch, extra'}
                value={
                  <>
                    {difference > 0 ? '−' : difference < 0 ? '+' : ''}
                    {formatMoney(Math.abs(difference), 'USD')}
                    <span aria-hidden="true">*</span>
                  </>
                }
                variant="switch"
              />
            )}
          </dl>
          {difference !== null && (
            <p className="receipt__foot">
              <span aria-hidden="true">* </span>
              {difference > 0
                ? `${formatMoney(difference, 'USD')} less over ${horizon === 1 ? '1 month' : `${horizon} months`} if you switch`
                : difference < 0
                  ? `${formatMoney(-difference, 'USD')} more over ${horizon === 1 ? '1 month' : `${horizon} months`} than this offer if you switch`
                  : `Same cost over ${horizon === 1 ? '1 month' : `${horizon} months`} if you switch`}
              {` — if both start on ${formatDate(startDate)} and you don't cancel.`}
            </p>
          )}
        </>
      )}

      <a className="receipt__jump" href={comparisonHref}>
        See the comparison <span aria-hidden="true">↓</span>
      </a>
    </section>
  );
}
