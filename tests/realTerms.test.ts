import { describe, expect, it } from 'vitest';
import { buildRealTermsText, realTermsChoices, sourceLabel } from '../src/lib/realTerms';
import { parseOffer } from '../src/lib/parseOffer';
import { ALTERNATIVES } from '../src/data/alternatives';
import { FEATURE_KEYS } from '../src/types/terms';
import type { Alternative } from '../src/types/alternatives';

function catalogQuotes(a: Alternative): Set<string> {
  const q = new Set<string>();
  a.prices.forEach((p) => q.add(p.quote.trim()));
  if (a.trial !== 'unknown') q.add(a.trial.quote.trim());
  if (a.autoRenew !== 'unknown') q.add(a.autoRenew.quote.trim());
  if (a.cancellation !== 'unknown') q.add(a.cancellation.quote.trim());
  if (a.refund !== 'unknown') {
    q.add(a.refund.quote.trim());
    if (a.refund.conflict) q.add(a.refund.conflict.quote.trim());
  }
  for (const k of FEATURE_KEYS) {
    const f = a.features[k];
    if (f.status !== 'unverified' && f.quote) q.add(f.quote.trim());
  }
  return q;
}

describe('buildRealTermsText', () => {
  it.each(ALTERNATIVES.map((a) => [a.id, a] as const))('%s: every line is a verbatim catalog quote, no duplicates', (_id, a) => {
    const { text, sources } = buildRealTermsText(a);
    const lines = text.split('\n');
    const quotes = catalogQuotes(a);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(quotes.has(line)).toBe(true);
    expect(new Set(lines).size).toBe(lines.length);
    expect(sources.length).toBeGreaterThan(0);
    for (const s of sources) {
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.label).not.toMatch(/^https?:/);
    }
    expect(new Set(sources.map((s) => s.url)).size).toBe(sources.length);
  });

  it('verified-absent features still contribute their quote; unverified ones never do', () => {
    const a = ALTERNATIVES[0];
    const alt: Alternative = {
      ...a,
      features: {
        ide: { status: 'unverified', quote: 'SHOULD NOT APPEAR', sourceUrl: 'https://x.example' },
        annualBilling: { status: 'no', quote: 'Monthly only.', sourceUrl: 'https://y.example' },
        monthlyCancel: { status: 'unverified' },
      },
    };
    const { text, sources } = buildRealTermsText(alt);
    expect(text).not.toContain('SHOULD NOT APPEAR');
    expect(text.split('\n')).toContain('Monthly only.');
    expect(sources.map((s) => s.url)).not.toContain('https://x.example');
  });

  it('sourceLabel drops protocol, www and trailing slash', () => {
    expect(sourceLabel('https://www.example.com/pricing/')).toBe('example.com/pricing');
  });
});

describe('realTermsChoices', () => {
  const choices = realTermsChoices(ALTERNATIVES);

  it('offers at least one plan', () => {
    expect(choices.length).toBeGreaterThan(0);
  });

  it('every offered plan parses to a price and period that exactly match a catalog price', () => {
    for (const { alt, realTerms } of choices) {
      const t = parseOffer(realTerms.text);
      expect(t.price.status).toBe('found');
      expect(t.billingPeriod.status).toBe('found');
      if (t.price.status !== 'found' || t.billingPeriod.status !== 'found') continue;
      const period = t.billingPeriod.value;
      const match = alt.prices.find((p) => p.period === period);
      expect(match, alt.id).toBeDefined();
      expect(t.price.value.amountMinor).toBe(match!.amountMinor);
      expect(t.price.value.currency).toBe(match!.currency);
      // Every piece of evidence is a verbatim substring of the real-terms text.
      for (const f of [t.price, t.billingPeriod, t.cancellation, t.refund, t.autoRenew, t.trialDays]) {
        if (f.status === 'found') expect(realTerms.text.slice(f.evidence.start, f.evidence.end)).toBe(f.evidence.quote);
      }
    }
  });

  it('plans whose quotes would parse to a non-catalog price are left out', () => {
    for (const a of ALTERNATIVES) {
      if (choices.some((c) => c.alt.id === a.id)) continue;
      const t = parseOffer(buildRealTermsText(a).text);
      const ok =
        t.price.status === 'found' &&
        t.billingPeriod.status === 'found' &&
        a.prices.some(
          (p) =>
            t.price.status === 'found' &&
            t.billingPeriod.status === 'found' &&
            p.period === t.billingPeriod.value &&
            p.amountMinor === t.price.value.amountMinor,
        );
      expect(ok, a.id).toBe(false);
    }
  });

  it('is sorted by number of parsed fields (descending)', () => {
    for (let i = 1; i < choices.length; i++) expect(choices[i - 1].foundCount).toBeGreaterThanOrEqual(choices[i].foundCount);
  });

  it('accepts an injected parser (deterministic, generic over the catalog)', () => {
    const none = realTermsChoices(ALTERNATIVES, () => parseOffer(''));
    expect(none).toEqual([]);
  });
});
