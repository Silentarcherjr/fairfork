import type { ReactNode } from 'react';
import type { Evidence, FeatureKey, OfferTerms } from '../types/terms';
import { FEATURE_KEYS, FEATURE_LABELS } from '../types/terms';

type Props = { text: string; terms: OfferTerms };

type Range = { start: number; end: number; labels: string[]; pressure: boolean };

const FIELD_LABELS: Record<Exclude<keyof OfferTerms, 'features' | 'pressureCues'>, string> = {
  trialDays: 'Free trial',
  price: 'Price',
  billingPeriod: 'Billing period',
  autoRenew: 'Auto-renewal',
  cancellation: 'Cancellation',
  refund: 'Refund',
};

function collectRanges(text: string, terms: OfferTerms): Range[] {
  const raw: Range[] = [];
  const push = (ev: Evidence, label: string, pressure: boolean) => {
    const start = Math.max(0, Math.min(text.length, ev.start));
    const end = Math.max(0, Math.min(text.length, ev.end));
    if (end > start) raw.push({ start, end, labels: [label], pressure });
  };
  (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).forEach((key) => {
    const field = terms[key];
    if (field.status === 'found') push(field.evidence, FIELD_LABELS[key], false);
  });
  FEATURE_KEYS.forEach((key: FeatureKey) => {
    const field = terms.features[key];
    if (field.status === 'found') push(field.evidence, `Feature: ${FEATURE_LABELS[key]}`, false);
  });
  terms.pressureCues.forEach((cue) =>
    push(cue.evidence, `Potential pressure cue (${cue.kind}) — not verified`, true),
  );

  // Merge overlapping ranges so marks never nest or cross.
  raw.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Range[] = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) {
      last.end = Math.max(last.end, r.end);
      for (const l of r.labels) if (!last.labels.includes(l)) last.labels.push(l);
      last.pressure = last.pressure || r.pressure;
    } else {
      merged.push({ ...r, labels: [...r.labels] });
    }
  }
  return merged;
}

/** Shows the analyzed text as plain React text, with each evidence range wrapped in <mark>. */
export function EvidenceText({ text, terms }: Props) {
  const ranges = collectRanges(text, terms);
  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.start > cursor) parts.push(text.slice(cursor, r.start));
    const label = r.labels.join('; ');
    parts.push(
      <mark
        key={i}
        className={r.pressure ? 'ev-mark ev-mark--pressure' : 'ev-mark ev-mark--term'}
        title={label}
        aria-label={`${label}: ${text.slice(r.start, r.end)}`}
      >
        {text.slice(r.start, r.end)}
      </mark>,
    );
    cursor = r.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return (
    <figure className="evidence-text">
      <figcaption className="evidence-text__caption">Your text, marked up</figcaption>
      <p className="evidence-text__body">{parts}</p>
      <ul className="legend" aria-label="Highlight legend">
        <li>
          <span className="legend__swatch legend__swatch--term" aria-hidden="true" /> Detected term
        </li>
        <li>
          <svg className="legend__wave" width="28" height="8" viewBox="0 0 28 8" aria-hidden="true" focusable="false">
            <path d="M0 5 Q 2.33 1 4.67 5 T 9.33 5 T 14 5 T 18.67 5 T 23.33 5 T 28 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>{' '}
          Potential
          pressure cue
        </li>
      </ul>
    </figure>
  );
}
