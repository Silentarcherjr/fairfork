import type { Alternative } from '../types/alternatives';
import type { OfferTerms } from '../types/terms';
import { FEATURE_KEYS } from '../types/terms';
import { parseOffer } from './parseOffer';

export type RealTermsSource = { url: string; label: string };
export type RealTerms = { text: string; sources: RealTermsSource[] };

/** Short, readable label for an official URL: host + path, no protocol or trailing slash. */
export function sourceLabel(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`;
  } catch {
    return url;
  }
}

/**
 * Builds an offer text made ONLY of a plan's verbatim catalog quotes, one per line, deduplicated.
 * No words are added, so every line is a quote that was matched on an official page.
 */
export function buildRealTermsText(alt: Alternative): RealTerms {
  const lines: string[] = [];
  const urls: string[] = [];
  const add = (quote: string | undefined, url: string | undefined) => {
    const q = quote?.trim();
    if (!q) return;
    if (!lines.includes(q)) lines.push(q);
    if (url && !urls.includes(url)) urls.push(url);
  };

  for (const p of alt.prices) add(p.quote, p.sourceUrl);
  if (alt.trial !== 'unknown') add(alt.trial.quote, alt.trial.sourceUrl);
  if (alt.autoRenew !== 'unknown') add(alt.autoRenew.quote, alt.autoRenew.sourceUrl);
  if (alt.cancellation !== 'unknown') add(alt.cancellation.quote, alt.cancellation.sourceUrl);
  if (alt.refund !== 'unknown') {
    add(alt.refund.quote, alt.refund.sourceUrl);
    if (alt.refund.conflict) add(alt.refund.conflict.quote, alt.refund.conflict.sourceUrl);
  }
  for (const k of FEATURE_KEYS) {
    const f = alt.features[k];
    if (f.status !== 'unverified') add(f.quote, f.sourceUrl);
  }

  return { text: lines.join('\n'), sources: urls.map((url) => ({ url, label: sourceLabel(url) })) };
}

export type RealTermsChoice = { alt: Alternative; realTerms: RealTerms; foundCount: number };

function countFound(terms: OfferTerms): number {
  const fields = [terms.trialDays, terms.price, terms.billingPeriod, terms.autoRenew, terms.cancellation, terms.refund];
  return (
    fields.filter((f) => f.status === 'found').length +
    FEATURE_KEYS.filter((k) => terms.features[k].status === 'found').length
  );
}

/**
 * Plans whose verbatim quotes parse to a price and period that exactly match a catalog price
 * (so "Try real terms" never shows a wrong total), ordered by how many fields parse, then catalog order.
 */
export function realTermsChoices(
  alternatives: Alternative[],
  parse: (text: string) => OfferTerms = parseOffer,
): RealTermsChoice[] {
  const out: RealTermsChoice[] = [];
  for (const alt of alternatives) {
    const realTerms = buildRealTermsText(alt);
    if (!realTerms.text) continue;
    const t = parse(realTerms.text);
    if (t.price.status !== 'found' || t.billingPeriod.status !== 'found') continue;
    const price = t.price.value;
    const period = t.billingPeriod.value;
    const matches = alt.prices.some(
      (p) => p.period === period && p.amountMinor === price.amountMinor && p.currency === price.currency,
    );
    if (!matches) continue;
    out.push({ alt, realTerms, foundCount: countFound(t) });
  }
  return out
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.foundCount - a.c.foundCount || a.i - b.i)
    .map(({ c }) => c);
}
