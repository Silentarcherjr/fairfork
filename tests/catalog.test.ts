import { describe, expect, it } from 'vitest';
import { ALTERNATIVES, CATALOG_VERIFIED_AT } from '../src/data/alternatives';
import { FEATURE_KEYS } from '../src/types/terms';

const OFFICIAL_DOMAINS = [
  'github.com',
  'docs.github.com',
  'claude.com',
  'support.claude.com',
  'devin.ai',
  'docs.devin.ai',
  'cognition.com',
];

function expectOfficial(url: string | undefined, quote: string | undefined) {
  expect(url).toBeDefined();
  const parsed = new URL(url!);
  expect(parsed.protocol).toBe('https:');
  expect(OFFICIAL_DOMAINS).toContain(parsed.hostname);
  expect(quote?.trim().length ?? 0).toBeGreaterThan(0);
  expect(quote!.trim().split(/\s+/).length).toBeLessThanOrEqual(25);
}

describe('alternatives catalog', () => {
  it('has at least 3 plans with unique ids', () => {
    expect(ALTERNATIVES.length).toBeGreaterThanOrEqual(3);
    expect(new Set(ALTERNATIVES.map((a) => a.id)).size).toBe(ALTERNATIVES.length);
  });

  it('has a valid verifiedAt date on the catalog and every plan', () => {
    expect(CATALOG_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(CATALOG_VERIFIED_AT))).toBe(false);
    for (const alt of ALTERNATIVES) expect(alt.verifiedAt).toBe(CATALOG_VERIFIED_AT);
  });

  it('cites an official source and quote for every price', () => {
    for (const alt of ALTERNATIVES) {
      expect(alt.prices.length).toBeGreaterThan(0);
      expectOfficial(alt.officialUrl, 'official page');
      for (const p of alt.prices) {
        expect(Number.isInteger(p.amountMinor)).toBe(true);
        expect(p.amountMinor).toBeGreaterThan(0);
        expect(p.currency).toBe('USD');
        expectOfficial(p.sourceUrl, p.quote);
      }
    }
  });

  it('cites an official source and quote for every known term, including conflicts', () => {
    for (const alt of ALTERNATIVES) {
      for (const term of [alt.trial, alt.autoRenew, alt.cancellation, alt.refund]) {
        if (term === 'unknown') continue;
        expectOfficial(term.sourceUrl, term.quote);
      }
      if (alt.refund !== 'unknown' && alt.refund.conflict) {
        expectOfficial(alt.refund.conflict.sourceUrl, alt.refund.conflict.quote);
      }
    }
  });

  it('cites a source for every yes/no feature; unverified needs none', () => {
    for (const alt of ALTERNATIVES) {
      for (const key of FEATURE_KEYS) {
        const f = alt.features[key];
        expect(['yes', 'no', 'unverified']).toContain(f.status);
        if (f.status !== 'unverified') expectOfficial(f.sourceUrl, f.quote);
      }
    }
  });

  it('keeps monthly and annual prices as separate options', () => {
    const claude = ALTERNATIVES.find((a) => a.id === 'claude-pro')!;
    expect(claude.prices.map((p) => p.period).sort()).toEqual(['month', 'year']);
    expect(claude.prices.find((p) => p.period === 'year')!.amountMinor).toBe(20000);
  });

  it('records an explicit "monthly only" statement for Claude Max as annualBilling no', () => {
    const max = ALTERNATIVES.find((a) => a.id === 'claude-max-5x')!;
    expect(max.features.annualBilling.status).toBe('no');
    expect(max.prices.map((p) => p.period)).toEqual(['month']);
  });

  it('records the conflicting Devin refund sources side by side', () => {
    const devin = ALTERNATIVES.find((a) => a.id === 'devin-pro')!;
    expect(devin.refund).not.toBe('unknown');
    if (devin.refund !== 'unknown') {
      expect(devin.refund.conflict).toBeDefined();
      expect(devin.refund.conflict!.sourceUrl).not.toBe(devin.refund.sourceUrl);
    }
  });
});
