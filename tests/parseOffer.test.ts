import { describe, it, expect } from 'vitest';
import { parseOffer } from '../src/lib/parseOffer';
import { EXAMPLE_OFFER, SECOND_EXAMPLE_OFFER } from '../src/data/exampleOffer';
import type { Evidence, OfferTerms } from '../src/types/terms';

function allEvidence(t: OfferTerms): Evidence[] {
  const out: Evidence[] = [];
  const fields = [t.trialDays, t.price, t.billingPeriod, t.autoRenew, t.cancellation, t.refund, ...Object.values(t.features)];
  for (const f of fields) if (f.status === 'found') out.push(f.evidence);
  for (const c of t.pressureCues) out.push(c.evidence);
  return out;
}

function expectEvidenceExact(text: string, t: OfferTerms) {
  for (const e of allEvidence(t)) {
    expect(text.slice(e.start, e.end)).toBe(e.quote);
    expect(e.quote.length).toBeGreaterThan(0);
  }
}

describe('parseOffer — EXAMPLE_OFFER', () => {
  const t = parseOffer(EXAMPLE_OFFER);

  it('extracts trial, price, period and renewal', () => {
    expect(t.trialDays).toMatchObject({ status: 'found', value: 7 });
    expect(t.price).toMatchObject({ status: 'found', value: { amountMinor: 1999, currency: 'USD' } });
    expect(t.billingPeriod).toMatchObject({ status: 'found', value: 'month' });
    expect(t.autoRenew).toMatchObject({ status: 'found', value: true });
  });

  it('does not take the $0 today amount as the price', () => {
    if (t.price.status !== 'found') throw new Error('price not found');
    expect(t.price.evidence.quote).toBe('$19.99');
  });

  it('extracts cancellation and refund sentences', () => {
    expect(t.cancellation.status).toBe('found');
    if (t.cancellation.status === 'found') expect(t.cancellation.value).toMatch(/cancel anytime/);
    expect(t.refund).toMatchObject({ status: 'found', value: 'Payments are non-refundable.' });
  });

  it('extracts features', () => {
    expect(t.features.ide).toMatchObject({ status: 'found', value: true });
    expect(t.features.monthlyCancel).toMatchObject({ status: 'found', value: true });
    expect(t.features.annualBilling.status).toBe('not_found');
  });

  it('finds exactly one scarcity cue', () => {
    expect(t.pressureCues).toHaveLength(1);
    expect(t.pressureCues[0].kind).toBe('scarcity');
    expect(t.pressureCues[0].evidence.quote).toBe('Only 3 spots left');
  });

  it('every evidence slice equals its quote', () => {
    expectEvidenceExact(EXAMPLE_OFFER, t);
  });
});

describe('parseOffer — SECOND_EXAMPLE_OFFER', () => {
  const t = parseOffer(SECOND_EXAMPLE_OFFER);

  it('extracts annual terms', () => {
    expect(t.trialDays).toMatchObject({ status: 'found', value: 14 });
    expect(t.price).toMatchObject({ status: 'found', value: { amountMinor: 24000, currency: 'USD' } });
    expect(t.billingPeriod).toMatchObject({ status: 'found', value: 'year' });
    expect(t.autoRenew).toMatchObject({ status: 'found', value: true });
    expect(t.features.annualBilling).toMatchObject({ status: 'found', value: true });
    expect(t.features.monthlyCancel.status).toBe('not_found');
    expect(t.refund.status).toBe('found');
    expect(t.pressureCues).toEqual([]);
  });

  it('every evidence slice equals its quote', () => {
    expectEvidenceExact(SECOND_EXAMPLE_OFFER, t);
  });
});

describe('parseOffer — missing values are never defaulted', () => {
  it('text with no price → price not_found', () => {
    const t = parseOffer('Start a 7-day free trial. Cancel anytime.');
    expect(t.price.status).toBe('not_found');
    expect(t.trialDays).toMatchObject({ status: 'found', value: 7 });
  });

  it('text without a trial → trialDays not_found', () => {
    const t = parseOffer('Pro plan: $12 per month. Renews automatically.');
    expect(t.trialDays.status).toBe('not_found');
    expect(t.price).toMatchObject({ status: 'found', value: { amountMinor: 1200 } });
  });

  it('empty text → everything not_found', () => {
    const t = parseOffer('');
    expect(t.trialDays.status).toBe('not_found');
    expect(t.price.status).toBe('not_found');
    expect(t.billingPeriod.status).toBe('not_found');
    expect(t.autoRenew.status).toBe('not_found');
    expect(t.cancellation.status).toBe('not_found');
    expect(t.refund.status).toBe('not_found');
    expect(Object.values(t.features).every((f) => f.status === 'not_found')).toBe(true);
    expect(t.pressureCues).toEqual([]);
  });

  it('$0 today alone is not a price', () => {
    expect(parseOffer('Get started for $0 today.').price.status).toBe('not_found');
  });
});

describe('parseOffer — pressure cues', () => {
  it('neutral text → no cues', () => {
    expect(parseOffer('A code assistant plan at $10 per month. You can cancel from settings.').pressureCues).toEqual([]);
  });

  it('detects urgency and scarcity phrases, case-insensitive, with exact offsets', () => {
    const text = 'HURRY! Today only: limited spots. Offer ends tonight, last chance. Expires in 2 hours. Limited time. Almost gone.';
    const t = parseOffer(text);
    const quotes = t.pressureCues.map((c) => `${c.kind}:${c.evidence.quote}`);
    expect(quotes).toEqual([
      'urgency:HURRY',
      'urgency:Today only',
      'scarcity:limited spots',
      'urgency:ends tonight',
      'urgency:last chance',
      'urgency:Expires in',
      'urgency:Limited time',
      'scarcity:Almost gone',
    ]);
    expectEvidenceExact(text, t);
  });

  it('detects "only five seats left"', () => {
    const t = parseOffer('Only five seats left!');
    expect(t.pressureCues).toHaveLength(1);
    expect(t.pressureCues[0].evidence.quote).toBe('Only five seats left');
  });
});

describe('parseOffer — format variants', () => {
  it.each([
    ['7-day free trial', 7],
    ['FREE 7-day trial', 7],
    ['Enjoy 14 days free', 14],
    ['It is free for seven days', 7],
    ['Free start. After thirty days you pay.', 30],
    ['A twenty-one day trial', 21],
  ])('trial: %s → %i', (text, days) => {
    const t = parseOffer(text);
    expect(t.trialDays).toMatchObject({ status: 'found', value: days });
    expectEvidenceExact(text, t);
  });

  it.each([
    ['$19.99/month', 1999, 'USD', 'month'],
    ['US$19.99 per month', 1999, 'USD', 'month'],
    ['19.99 USD monthly', 1999, 'USD', 'month'],
    ['€9 /mo', 900, 'EUR', 'month'],
    ['£5 each month', 500, 'GBP', 'month'],
    ['$1,200 per year', 120000, 'USD', 'year'],
    ['$100 billed yearly', 10000, 'USD', 'year'],
    ['Only $8, paid annually', 800, 'USD', 'year'],
  ])('price: %s', (text, minor, currency, period) => {
    const t = parseOffer(text);
    expect(t.price).toMatchObject({ status: 'found', value: { amountMinor: minor, currency } });
    expect(t.billingPeriod).toMatchObject({ status: 'found', value: period });
    expectEvidenceExact(text, t);
  });

  it.each([
    ['This plan does not renew.', false],
    ['No auto-renewal.', false],
    ["It won't renew on its own.", false],
    ['Subscriptions auto-renew.', true],
    ['We will automatically renew your plan.', true],
  ])('autoRenew: %s', (text, value) => {
    expect(parseOffer(text).autoRenew).toMatchObject({ status: 'found', value });
  });

  it('autoRenew not stated → not_found', () => {
    expect(parseOffer('$5/month').autoRenew.status).toBe('not_found');
  });
});

describe('parseOffer — untrusted input', () => {
  it('parses HTML/script as plain text without throwing', () => {
    const text = '<script>alert(1)</script> $5/month';
    const t = parseOffer(text);
    expect(t.price).toMatchObject({ status: 'found', value: { amountMinor: 500, currency: 'USD' } });
    expect(t.billingPeriod).toMatchObject({ status: 'found', value: 'month' });
    for (const e of allEvidence(t)) expect(typeof e.quote).toBe('string');
    expectEvidenceExact(text, t);
  });
});
