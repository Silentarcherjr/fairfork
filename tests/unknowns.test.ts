import { describe, expect, it } from 'vitest';
import { collectUnknowns, groupUnknowns, questionFor, NOT_STATED, NOT_VERIFIED, SOURCES_CONFLICT } from '../src/lib/unknowns';
import { parseOffer } from '../src/lib/parseOffer';
import { ALTERNATIVES } from '../src/data/alternatives';
import { EXAMPLE_OFFER } from '../src/data/exampleOffer';
import { FEATURE_KEYS, FEATURE_LABELS } from '../src/types/terms';
import type { Alternative } from '../src/types/alternatives';
import type { OfferTerms } from '../src/types/terms';

const nf = { status: 'not_found' as const };
const found = <T>(value: T) => ({ status: 'found' as const, value, evidence: { quote: 'x', start: 0, end: 1 } });

const emptyTerms: OfferTerms = {
  trialDays: nf,
  price: nf,
  billingPeriod: nf,
  autoRenew: nf,
  cancellation: nf,
  refund: nf,
  features: { ide: nf, annualBilling: nf, monthlyCancel: nf },
  pressureCues: [],
};

const fullAlt: Alternative = {
  id: 'full',
  provider: 'Acme',
  plan: 'Pro',
  officialUrl: 'https://acme.example/pricing',
  verifiedAt: '2026-10-26',
  prices: [{ period: 'month', amountMinor: 1000, currency: 'USD', sourceUrl: 'https://acme.example/pricing', quote: '$10' }],
  trial: { value: null, sourceUrl: 'https://acme.example/a', quote: 'q' },
  autoRenew: { value: true, sourceUrl: 'https://acme.example/a', quote: 'q' },
  cancellation: { value: 'Anytime', sourceUrl: 'https://acme.example/a', quote: 'q' },
  refund: { value: 'None', sourceUrl: 'https://acme.example/a', quote: 'q' },
  features: {
    ide: { status: 'yes' },
    annualBilling: { status: 'no' },
    monthlyCancel: { status: 'yes' },
  },
  caveats: [],
};

describe('collectUnknowns', () => {
  it('nothing recognized → every offer field and feature is listed as not stated', () => {
    const items = collectUnknowns(emptyTerms, []);
    expect(items).toHaveLength(6 + FEATURE_KEYS.length);
    expect(items.every((i) => i.option === 'Your offer' && i.detail === NOT_STATED)).toBe(true);
    expect(items.map((i) => i.fact)).toEqual(
      expect.arrayContaining(['Price', 'Free trial', 'Auto-renewal', 'Cancellation terms', 'Refund policy', ...FEATURE_KEYS.map((k) => FEATURE_LABELS[k])]),
    );
  });

  it('never lists a field that was found in the text', () => {
    const terms: OfferTerms = {
      ...emptyTerms,
      price: found({ amountMinor: 1999, currency: 'USD' }),
      refund: found('Payments are non-refundable.'),
      features: { ...emptyTerms.features, ide: found(true) },
    };
    const facts = collectUnknowns(terms, []).map((i) => i.fact);
    expect(facts).not.toContain('Price');
    expect(facts).not.toContain('Refund policy');
    expect(facts).not.toContain('IDE integration');
    expect(facts).toContain('Free trial');
  });

  it('a fully verified plan contributes nothing (verified "no" and verified "no trial" are not unknowns)', () => {
    expect(collectUnknowns(null, [fullAlt])).toEqual([]);
  });

  it('lists unknown terms and unverified features of a plan, with its official URL', () => {
    const alt: Alternative = {
      ...fullAlt,
      trial: 'unknown',
      refund: 'unknown',
      features: { ...fullAlt.features, annualBilling: { status: 'unverified' } },
    };
    const items = collectUnknowns(null, [alt]);
    expect(items.map((i) => i.fact)).toEqual(['Free trial', 'Refund policy', 'Annual billing']);
    expect(items.every((i) => i.option === 'Acme Pro' && i.detail === NOT_VERIFIED)).toBe(true);
    expect(items.every((i) => i.sourceUrl === 'https://acme.example/pricing')).toBe(true);
  });

  it('conflicting refund sources are listed with both URLs', () => {
    const alt: Alternative = {
      ...fullAlt,
      refund: {
        value: 'No refunds',
        sourceUrl: 'https://acme.example/terms',
        quote: 'q',
        conflict: { value: 'Refunds on request', sourceUrl: 'https://acme.example/help', quote: 'q' },
      },
    };
    const [item] = collectUnknowns(null, [alt]);
    expect(item).toMatchObject({
      fact: 'Refund policy',
      detail: SOURCES_CONFLICT,
      sourceUrl: 'https://acme.example/terms',
      conflictUrl: 'https://acme.example/help',
    });
  });

  it('null terms (before analysis) → catalog gaps only, no "Your offer" rows', () => {
    const items = collectUnknowns(null, ALTERNATIVES);
    expect(items.some((i) => i.option === 'Your offer')).toBe(false);
  });

  it('real catalog + example offer: every catalog row matches an unknown/unverified/conflicting fact', () => {
    const items = collectUnknowns(parseOffer(EXAMPLE_OFFER), ALTERNATIVES);
    expect(items.length).toBeGreaterThan(0);
    for (const a of ALTERNATIVES) {
      const rows = items.filter((i) => i.option === `${a.provider} ${a.plan}`);
      for (const r of rows) {
        if (r.fact === 'Free trial') expect(a.trial).toBe('unknown');
        if (r.fact === 'Auto-renewal') expect(a.autoRenew).toBe('unknown');
        if (r.fact === 'Cancellation terms') expect(a.cancellation).toBe('unknown');
        if (r.fact === 'Refund policy') expect(a.refund === 'unknown' || Boolean(a.refund.conflict)).toBe(true);
        for (const k of FEATURE_KEYS) if (r.fact === FEATURE_LABELS[k]) expect(a.features[k].status).toBe('unverified');
      }
    }
  });

  it('groupUnknowns keeps first-seen option order', () => {
    const groups = groupUnknowns(collectUnknowns(emptyTerms, [{ ...fullAlt, trial: 'unknown' }]));
    expect(groups.map((g) => g.option)).toEqual(['Your offer', 'Acme Pro']);
    expect(groups[1].items).toHaveLength(1);
  });
});

describe('questionFor', () => {
  const q = (fact: string, option = 'Acme Pro', detail = NOT_VERIFIED) => questionFor({ option, fact, detail });

  it('uses the plan name for catalog plans and "this plan" for your offer', () => {
    expect(q('Free trial')).toBe('Is there a free trial for Acme Pro, and does it convert to a paid plan automatically?');
    expect(q('Free trial', 'Your offer', NOT_STATED)).toBe(
      'Is there a free trial for this plan, and does it convert to a paid plan automatically?',
    );
  });

  it('has a concrete template for every fact the ledger can produce', () => {
    expect(q('Refund policy')).toBe('If I cancel Acme Pro, can I get a refund — and within how many days?');
    expect(q('Auto-renewal')).toBe('Does Acme Pro renew automatically, and how far in advance do you remind me?');
    expect(q('Cancellation terms')).toBe('How do I cancel Acme Pro, and does access continue until the end of the billing period?');
    expect(q('IDE integration')).toBe('Does Acme Pro include IDE/editor integration (e.g. VS Code, JetBrains)?');
    expect(q('Annual billing')).toBe('Can I pay for Acme Pro annually, and at what price?');
    expect(q('Cancel-anytime monthly')).toBe('Can I pay for Acme Pro monthly and cancel at any time?');
    expect(q('Price')).toBe('What is the exact price, billing period and currency for Acme Pro, including taxes?');
    expect(q('Billing period', 'Your offer', NOT_STATED)).toBe('Is this plan billed monthly or yearly, and on what date is the first charge?');
  });

  it('conflicting sources get the conflict question', () => {
    expect(q('Refund policy', 'Acme Pro', SOURCES_CONFLICT)).toBe(
      'Your terms and help docs disagree on refunds for Acme Pro — which applies to me?',
    );
  });

  it('every real ledger item gets a non-generic question ending in "?"', () => {
    const items = collectUnknowns(emptyTerms, ALTERNATIVES);
    for (const it of items) {
      const question = questionFor(it);
      expect(question).toMatch(/\?$/);
      expect(question).not.toContain('in writing');
    }
  });

  it('is deterministic', () => {
    const items = collectUnknowns(emptyTerms, ALTERNATIVES);
    expect(items.map(questionFor)).toEqual(items.map(questionFor));
  });
});
