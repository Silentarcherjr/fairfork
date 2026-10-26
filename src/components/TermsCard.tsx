import type { Field, OfferTerms } from '../types/terms';
import { FEATURE_KEYS, FEATURE_LABELS } from '../types/terms';
import { formatMoney } from '../lib/money';

type Props = { terms: OfferTerms };

type Row = { label: string; field: Field<unknown>; display: string };

function show<T>(field: Field<T>, fmt: (v: T) => string): string {
  return field.status === 'found' ? fmt(field.value) : '';
}

export function TermsCard({ terms }: Props) {
  const rows: Row[] = [
    {
      label: 'Free trial',
      field: terms.trialDays,
      display: show(terms.trialDays, (d) => (d === 1 ? '1 day' : `${d} days`)),
    },
    {
      label: 'Price',
      field: terms.price,
      display: show(terms.price, (p) => formatMoney(p.amountMinor, p.currency)),
    },
    {
      label: 'Billing period',
      field: terms.billingPeriod,
      display: show(terms.billingPeriod, (p) => (p === 'month' ? 'Monthly' : 'Yearly')),
    },
    {
      label: 'Auto-renewal',
      field: terms.autoRenew,
      display: show(terms.autoRenew, (r) => (r ? 'Renews automatically' : 'Does not auto-renew')),
    },
    { label: 'Cancellation', field: terms.cancellation, display: show(terms.cancellation, (s) => s) },
    { label: 'Refund', field: terms.refund, display: show(terms.refund, (s) => s) },
    ...FEATURE_KEYS.map((k) => ({
      label: FEATURE_LABELS[k],
      field: terms.features[k] as Field<unknown>,
      display: show(terms.features[k], (v) => (v ? 'Stated in the text' : 'Stated as not included')),
    })),
  ];

  return (
    <section className="card terms-card" aria-labelledby="terms-heading">
      <h2 id="terms-heading" className="section-title">
        The fine print
      </h2>
      <p className="section-sub">According to the pasted text — each value with its exact quote.</p>
      <dl className="terms-list">
        {rows.map((row) => (
          <div className="terms-row" key={row.label}>
            <dt>{row.label}</dt>
            {row.field.status === 'found' ? (
              <dd>
                {row.display !== row.field.evidence.quote && <span className="terms-row__value">{row.display}</span>}
                <blockquote className="clip">
                  <span className="clip__label">from your text</span>
                  <span className="clip__quote">“{row.field.evidence.quote}”</span>
                </blockquote>
              </dd>
            ) : (
              <dd className="terms-row__missing">Not found in the text</dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
