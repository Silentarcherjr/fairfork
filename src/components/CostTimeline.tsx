import type { Horizon, Timeline } from '../types/billing';
import { formatMoney } from '../lib/money';
import { formatDate, horizonLabel } from './format';

type Props = { timeline: Timeline; horizon: Horizon; onHorizonChange: (h: Horizon) => void };

const HORIZONS: Horizon[] = [1, 3, 6, 12];

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

export function CostTimeline({ timeline, horizon, onHorizonChange }: Props) {
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
          <p className="cost__caveat">assuming you don't cancel</p>
          <p className="cost__first">
            <span className="eyebrow">First charge</span>{' '}
            <strong>{formatDate(timeline.firstChargeDate)}</strong>
          </p>
          {timeline.charges.length > 0 ? (
            <ol className="charges" aria-label={`Charges in the next ${horizonLabel(horizon)}`}>
              {timeline.charges.map((c, i) => (
                <li key={`${c.date}-${i}`} className="charges__item">
                  <span className="charges__date">{formatDate(c.date)}</span>
                  <span className="charges__amount">−{formatMoney(c.amountMinor, timeline.currency)}</span>
                </li>
              ))}
            </ol>
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
