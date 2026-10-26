import type { Horizon, Timeline } from '../types/billing';
import type { RankResult } from '../types/ranking';
import { formatMoney } from '../lib/money';
import { formatDate, horizonLabel } from './format';

type Props = {
  timeline: Timeline;
  result: RankResult;
  horizon: Horizon;
  startDate: string;
  comparisonHref?: string;
};

/** One-glance summary at the top of the results: what the offer costs and what currently fits best. */
export function VerdictStrip({ timeline, result, horizon, startDate, comparisonHref = '#comparison' }: Props) {
  const span = horizonLabel(horizon);
  const best = result.bestFit;

  let difference: { minor: number; currency: string } | null = null;
  if (
    timeline.status === 'known' &&
    best &&
    !best.isUserOffer &&
    best.horizonCostMinor !== null &&
    timeline.currency === 'USD' &&
    best.currency === 'USD'
  ) {
    difference = { minor: timeline.totalMinor - best.horizonCostMinor, currency: 'USD' };
  }

  return (
    <section className="verdict" aria-labelledby="verdict-heading">
      <h2 id="verdict-heading" className="sr-only">
        Summary
      </h2>
      <div className="verdict__cell verdict__cell--offer">
        <p className="verdict__kicker">This offer costs</p>
        {timeline.status === 'known' ? (
          <p className="verdict__line">
            <span className="verdict__num verdict__num--coral">{formatMoney(timeline.totalMinor, timeline.currency)}</span>{' '}
            <span className="verdict__rest">over {span}, assuming you don't cancel.</span>
          </p>
        ) : (
          <p className="verdict__line">
            <span className="verdict__num verdict__num--unknown">Unknown</span>{' '}
            <span className="verdict__rest">over {span} — {timeline.reason.charAt(0).toLowerCase() + timeline.reason.slice(1)}</span>
          </p>
        )}
      </div>

      <div className="verdict__cell verdict__cell--best">
        {result.noneQualifies || !best ? (
          <>
            <p className="verdict__kicker">For your requirements</p>
            <p className="verdict__line verdict__line--none">
              No option meets all your requirements — the comparison shows what ruled each one out.
            </p>
          </>
        ) : best.isUserOffer ? (
          <>
            <p className="verdict__kicker">Best fit for your requirements</p>
            <p className="verdict__line">
              <span className="verdict__name">Your offer</span>{' '}
              <span className="verdict__rest">
                is currently the best fit, according to the pasted text
                {best.horizonCostMinor !== null && best.currency
                  ? ` · ${formatMoney(best.horizonCostMinor, best.currency)} over ${span}`
                  : ''}
                .
              </span>
            </p>
          </>
        ) : (
          <>
            <p className="verdict__kicker">Best fit for your requirements</p>
            <p className="verdict__line">
              <span className="verdict__name">{best.label}</span>
              {best.horizonCostMinor !== null && best.currency && (
                <>
                  {' '}
                  <span className="verdict__num verdict__num--petrol">
                    {formatMoney(best.horizonCostMinor, best.currency)}
                  </span>{' '}
                  <span className="verdict__rest">over {span}</span>
                </>
              )}
            </p>
            {difference && (
              <p className="verdict__diff">
                {difference.minor > 0
                  ? `${formatMoney(difference.minor, difference.currency)} less over ${span} if you switch`
                  : difference.minor < 0
                    ? `${formatMoney(-difference.minor, difference.currency)} more over ${span} than this offer if you switch`
                    : `Same cost over ${span} as this offer`}
                {` — if both start on ${formatDate(startDate)} and you don't cancel.`}
              </p>
            )}
          </>
        )}
      </div>

      <a className="verdict__jump" href={comparisonHref}>
        See the comparison <span aria-hidden="true">↓</span>
      </a>
    </section>
  );
}
