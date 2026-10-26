import type { Horizon, Timeline } from '../types/billing';
import { formatMoney } from '../lib/money';
import { addMonthsClamped } from '../lib/dates';
import { formatDate, horizonLabel } from './format';

type Props = {
  timeline: Timeline;
  horizon: Horizon;
  onHorizonChange: (h: Horizon) => void;
  /** Start date of the horizon; enables the proportional charge strip. */
  startDate?: string;
};

const HORIZONS: Horizon[] = [1, 3, 6, 12];
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function HorizonPicker({ horizon, onHorizonChange }: Pick<Props, 'horizon' | 'onHorizonChange'>) {
  return (
    <div className="segmented" role="group" aria-label="Cost horizon">
      {HORIZONS.map((h) => (
        <button
          key={h}
          type="button"
          className="segmented__btn"
          aria-pressed={h === horizon}
          aria-label={h === 1 ? '1 month' : `${h} months`}
          onClick={() => onHorizonChange(h)}
        >
          {h} mo
        </button>
      ))}
    </div>
  );
}

function ChargeStrip({
  timeline,
  startDate,
  horizon,
}: {
  timeline: Extract<Timeline, { status: 'known' }>;
  startDate: string;
  horizon: Horizon;
}) {
  const start = dayNumber(startDate);
  const end = dayNumber(addMonthsClamped(startDate, horizon));
  const span = Math.max(1, end - start);
  const pct = (iso: string) => Math.min(100, Math.max(0, ((dayNumber(iso) - start) / span) * 100));
  const trialPct = pct(timeline.firstChargeDate);
  const trialDays = Math.round(dayNumber(timeline.firstChargeDate) - start);
  const showInitials = timeline.charges.length <= 13;

  return (
    <div className="strip">
      <div className="strip__track">
        {trialDays > 0 && (
          <div className="strip__trial" style={{ width: `${trialPct}%` }} title={`Free until ${formatDate(timeline.firstChargeDate)}`}>
            <span className="sr-only">
              Free period of {trialDays} days, until {formatDate(timeline.firstChargeDate)}.
            </span>
          </div>
        )}
        <ol className="strip__ticks" aria-label="Charges on a timeline">
          {timeline.charges.map((c, i) => (
            <li
              key={`${c.date}-${i}`}
              className="strip__tick"
              style={{ left: `${pct(c.date)}%` }}
              title={`${formatDate(c.date)} · ${formatMoney(c.amountMinor, timeline.currency)}`}
            >
              <span className="sr-only">
                {formatDate(c.date)}: {formatMoney(c.amountMinor, timeline.currency)}
              </span>
              {showInitials && (
                <span className="strip__initial" aria-hidden="true">
                  {MONTH_INITIALS[Number(c.date.slice(5, 7)) - 1]}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
      <div className="strip__axis" aria-hidden="true">
        <span>
          {formatDate(startDate)}
          {trialDays > 0 && (
            <span className="strip__trial-label">
              {' '}
              · <span className="strip__trial-swatch" /> {trialDays} {trialDays === 1 ? 'day' : 'days'} free
            </span>
          )}
        </span>
        <span>{formatDate(addMonthsClamped(startDate, horizon))}</span>
      </div>
    </div>
  );
}

export function CostTimeline({ timeline, horizon, onHorizonChange, startDate }: Props) {
  return (
    <section className="card cost" aria-labelledby="cost-heading">
      <div className="cost__head">
        <h2 id="cost-heading" className="section-title">
          The true cost
        </h2>
        <HorizonPicker horizon={horizon} onHorizonChange={onHorizonChange} />
      </div>

      {timeline.status === 'known' ? (
        <>
          <p className="cost__total-label">Over the next {horizonLabel(horizon)}, you would pay</p>
          <p className="cost__total" aria-live="polite">
            {formatMoney(timeline.totalMinor, timeline.currency)}
          </p>
          <p className="cost__caveat">
            assuming you don't cancel · {timeline.charges.length}{' '}
            {timeline.charges.length === 1 ? 'charge' : 'charges'}
          </p>
          {startDate && timeline.charges.length > 0 && (
            <ChargeStrip timeline={timeline} startDate={startDate} horizon={horizon} />
          )}
          <p className="cost__first">
            <span className="eyebrow">First charge</span>{' '}
            <strong>{formatDate(timeline.firstChargeDate)}</strong>
          </p>
          {timeline.charges.length > 0 ? (
            <details className="charges-details">
              <summary>Show every charge</summary>
              <ol className="charges" aria-label={`Charges in the next ${horizonLabel(horizon)}`}>
                {timeline.charges.map((c, i) => (
                  <li key={`${c.date}-${i}`} className="charges__item">
                    <span className="charges__date">{formatDate(c.date)}</span>
                    <span className="charges__amount">−{formatMoney(c.amountMinor, timeline.currency)}</span>
                  </li>
                ))}
              </ol>
            </details>
          ) : (
            <p className="hint">No charges fall inside this horizon.</p>
          )}
        </>
      ) : (
        <>
          <p className="cost__total-label">Over the next {horizonLabel(horizon)}</p>
          <p className="cost__total cost__total--unknown" aria-live="polite">
            Unknown <span className="cost__reason">— {timeline.reason}</span>
          </p>
        </>
      )}

      {timeline.assumptions.length > 0 && (
        <div className="assumptions">
          <h3 className="eyebrow">Assumptions</h3>
          <ul>
            {timeline.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
