// Agent D — adversarial QA: unit-level checks and a seeded fuzz of parseOffer.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import { parseOffer } from '../src/lib/parseOffer';
import { calculateBillingTimeline, ASSUMPTION_NO_CANCEL, ASSUMPTION_NO_TRIAL } from '../src/lib/billing';
import { buildCandidates, rankOptions } from '../src/lib/ranking';
import { ALTERNATIVES } from '../src/data/alternatives';
import { EXAMPLE_OFFER, SECOND_EXAMPLE_OFFER } from '../src/data/exampleOffer';
import { EvidenceText } from '../src/components/EvidenceText';
import type { Evidence, OfferTerms } from '../src/types/terms';
import type { Horizon } from '../src/types/billing';
import type { Preferences } from '../src/types/ranking';

const START = '2026-11-01';

function prefs(must: Partial<Preferences['mustHave']> = {}, budget: number | null = null): Preferences {
  return { maxMonthlyBudgetMinor: budget, mustHave: { ide: false, annualBilling: false, monthlyCancel: false, ...must } };
}

function rank(text: string | null, p: Preferences, horizon: Horizon = 12) {
  const terms = text === null ? null : parseOffer(text);
  const tl = terms ? calculateBillingTimeline(terms, START, horizon) : null;
  return rankOptions(buildCandidates(terms, tl, ALTERNATIVES, START, horizon), p, horizon);
}

/** All evidence objects in a parse result. */
function allEvidence(t: OfferTerms): Evidence[] {
  const out: Evidence[] = [];
  for (const f of [t.trialDays, t.price, t.billingPeriod, t.autoRenew, t.cancellation, t.refund]) {
    if (f.status === 'found') out.push(f.evidence);
  }
  for (const f of Object.values(t.features)) if (f.status === 'found') out.push(f.evidence);
  for (const c of t.pressureCues) out.push(c.evidence);
  return out;
}

function assertEvidenceSound(text: string, t: OfferTerms) {
  for (const ev of allEvidence(t)) {
    expect(Number.isInteger(ev.start)).toBe(true);
    expect(Number.isInteger(ev.end)).toBe(true);
    expect(ev.start).toBeGreaterThanOrEqual(0);
    expect(ev.end).toBeLessThanOrEqual(text.length);
    expect(ev.end).toBeGreaterThan(ev.start);
    expect(text.slice(ev.start, ev.end)).toBe(ev.quote);
  }
}

describe('PRD: 7-day / $19.99 / renews automatically', () => {
  const text = '7-day trial, then $19.99/month, renews automatically';

  it('first charge is start + 7 days, with the "you don\'t cancel" assumption', () => {
    const t = parseOffer(text);
    const tl = calculateBillingTimeline(t, START, 12);
    expect(tl.status).toBe('known');
    if (tl.status !== 'known') return;
    expect(tl.firstChargeDate).toBe('2026-11-08');
    expect(tl.charges[0]).toEqual({ date: '2026-11-08', amountMinor: 1999 });
    expect(tl.charges).toHaveLength(12);
    expect(tl.totalMinor).toBe(23988);
    expect(tl.assumptions).toContain(ASSUMPTION_NO_CANCEL);
  });

  it('month-end start (Jan 31, leap year) produces clamped, non-drifting dates', () => {
    const t = parseOffer('$10/month, renews automatically');
    const tl = calculateBillingTimeline(t, '2028-01-31', 3);
    expect(tl.status === 'known' && tl.charges.map((c) => c.date)).toEqual(['2028-01-31', '2028-02-29', '2028-03-31']);
  });
});

describe('PRD: missing values are never defaulted', () => {
  it('no trial → trial not_found and first charge on the start date (no 7-day default)', () => {
    const t = parseOffer('$19.99/month, renews automatically. Cancel anytime.');
    expect(t.trialDays.status).toBe('not_found');
    const tl = calculateBillingTimeline(t, START, 1);
    expect(tl.status === 'known' && tl.firstChargeDate).toBe(START);
    expect(tl.assumptions).toContain(ASSUMPTION_NO_TRIAL);
  });

  it('no price → timeline unknown, never a $0 total; user offer cost null', () => {
    const t = parseOffer('Start your 7-day free trial. Renews automatically. Cancel anytime.');
    expect(t.price.status).toBe('not_found');
    const tl = calculateBillingTimeline(t, START, 12);
    expect(tl.status).toBe('unknown');
    const user = buildCandidates(t, tl, ALTERNATIVES, START, 12).find((c) => c.isUserOffer)!;
    expect(user.horizonCostMinor).toBeNull();
    expect(user.effectiveMonthlyMinor).toBeNull();
  });

  it('"$0 today" alone is not a price', () => {
    expect(parseOffer('Get started for $0 today!').price.status).toBe('not_found');
  });
});

describe('PRD: pressure cues', () => {
  it('"only 3 left" is a scarcity cue with exact offsets', () => {
    const text = 'Great deal — only 3 left at this price.';
    const t = parseOffer(text);
    expect(t.pressureCues).toHaveLength(1);
    expect(t.pressureCues[0].kind).toBe('scarcity');
    expect(t.pressureCues[0].evidence.quote).toBe('only 3 left');
    assertEvidenceSound(text, t);
  });

  it.each([
    'Our assistant costs $10/month and works in VS Code.',
    'Cancel anytime from your settings. Refunds within 14 days.',
    'Unlimited completions. Seats are unlimited for teams.',
    'This is a plain description of a product with no deadline.',
  ])('neutral text has no pressure cues: %s', (text) => {
    expect(parseOffer(text).pressureCues).toEqual([]);
  });

  // Fixed after QA (BUG-1): limits and "no hurry" are not pressure cues.
  it.each(['The plan includes only 2 seats per account.', 'No hurry — take your time. $10/month'])(
    'BUG-1 fixed — not a pressure cue: %s',
    (text) => expect(parseOffer(text).pressureCues).toEqual([]),
  );
});

describe('PRD: currency and period are not confused', () => {
  it('€9/month → EUR, monthly; €90/year → EUR, yearly', () => {
    const m = parseOffer('€9/month');
    expect(m.price.status === 'found' && m.price.value).toEqual({ amountMinor: 900, currency: 'EUR' });
    expect(m.billingPeriod.status === 'found' && m.billingPeriod.value).toBe('month');
    const y = parseOffer('€90 per year');
    expect(y.price.status === 'found' && y.price.value).toEqual({ amountMinor: 9000, currency: 'EUR' });
    expect(y.billingPeriod.status === 'found' && y.billingPeriod.value).toBe('year');
  });

  it('yearly offer → one upfront charge, not 12 monthly charges', () => {
    const tl = calculateBillingTimeline(parseOffer('$120 per year, renews automatically'), START, 12);
    expect(tl.status === 'known' && tl.charges).toEqual([{ date: START, amountMinor: 12000 }]);
  });

  it('a cheap EUR offer is never ranked as cheaper than USD plans when a budget is set → Can\'t confirm', () => {
    const r = rank('€1/month, renews automatically', prefs({}, 5000));
    const user = r.cantConfirm.find((c) => c.isUserOffer);
    expect(user).toBeDefined();
    expect(user!.reasons.join(' ')).toMatch(/not comparable.*EUR/i);
    expect(r.bestFit?.isUserOffer).toBeFalsy();
    expect(r.qualified.some((c) => c.isUserOffer)).toBe(false);
  });

  it('without a budget, a cheap EUR offer is never compared with USD prices', () => {
    const r = rank('€1/month', prefs());
    expect(r.bestFit?.isUserOffer).toBe(false);
    expect(r.qualified.some((c) => c.isUserOffer)).toBe(false);
    expect(r.cantConfirm.find((c) => c.isUserOffer)?.reasons.join(' ')).toMatch(/priced in EUR/);
  });

  it('GBP and CAD are kept as their own currencies', () => {
    const g = parseOffer('£8 per month');
    const c = parseOffer('CAD $15/month');
    expect(g.price.status === 'found' && g.price.value.currency).toBe('GBP');
    expect(c.price.status === 'found' && c.price.value.currency).toBe('CAD');
  });
});

describe('PRD: ranking boundaries', () => {
  it('impossible budget ($1) → noneQualifies, no bestFit, each option has a reason', () => {
    const r = rank(EXAMPLE_OFFER, prefs({}, 100));
    expect(r.noneQualifies).toBe(true);
    expect(r.bestFit).toBeNull();
    for (const c of [...r.excluded, ...r.cantConfirm]) expect(c.reasons.length).toBeGreaterThan(0);
  });

  it('annual billing → Claude Pro annual; IDE → Copilot Pro', () => {
    expect(rank(EXAMPLE_OFFER, prefs({ annualBilling: true })).bestFit?.id).toBe('claude-pro-year');
    expect(rank(EXAMPLE_OFFER, prefs({ ide: true })).bestFit?.id).toBe('copilot-pro-month');
  });

  it('an option with an unverified must-have is never bestFit', () => {
    for (const must of [{ ide: true }, { annualBilling: true }, { monthlyCancel: true }]) {
      const r = rank(EXAMPLE_OFFER, prefs(must));
      if (r.bestFit) for (const v of Object.entries(must)) expect(r.bestFit.features[v[0] as 'ide']).toBe('yes');
    }
  });

  it('O-1 fixed — an offer with unknown cost is never crowned, it goes to Can\'t confirm', () => {
    const text = 'Works in VS Code. Annual plan available. Monthly billing — cancel anytime.';
    const r = rank(text, prefs({ ide: true, annualBilling: true, monthlyCancel: true }));
    expect(r.bestFit?.isUserOffer ?? false).toBe(false);
    const offer = r.cantConfirm.find((c) => c.isUserOffer);
    expect(offer?.reasons.join(' ')).toMatch(/Cost not comparable/);
  });
});

describe('BUG-2 fixed: a per-month figure billed annually is a yearly charge', () => {
  it('uses the stated yearly total when present', () => {
    const t = parseOffer('Save 20% — $16/month billed annually ($192/year).');
    expect(t.price.status === 'found' && t.price.value).toEqual({ amountMinor: 19200, currency: 'USD' });
    expect(t.billingPeriod.status === 'found' && t.billingPeriod.value).toBe('year');
    const tl = calculateBillingTimeline(t, '2026-10-26', 1);
    expect(tl.status === 'known' && tl.totalMinor).toBe(19200);
  });

  it('computes 12 × monthly when no yearly total is stated, quoting both parts', () => {
    const text = 'Pro is $19.99/month billed annually.';
    const t = parseOffer(text);
    expect(t.price.status === 'found' && t.price.value).toEqual({ amountMinor: 23988, currency: 'USD' });
    expect(t.price.status === 'found' && t.price.evidence.quote).toBe('$19.99/month billed annually');
    expect(t.billingPeriod.status === 'found' && t.billingPeriod.value).toBe('year');
    assertEvidenceSound(text, t);
  });
});

describe('PERF-1 fixed: pathological input stays fast', () => {
  it.each(['1'.repeat(50000), 'cancel '.repeat(20000)])('parses a %#th huge input under 500 ms', (text) => {
    const t0 = performance.now();
    parseOffer(text);
    expect(performance.now() - t0).toBeLessThan(500);
  });
});

// ---------- Seeded fuzz ----------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VOCAB = [
  '$', '€', '£', 'US$', 'USD', 'EUR', 'CAD', '19.99', '0', '1,200.50', '29', '.', '!', '?', '\n', ' ', ' ', ' ',
  '/month', '/mo', 'per year', '/yr', 'monthly', 'annually', 'billed yearly', 'each month',
  '7-day', 'seven-day', 'twenty-one', 'free', 'trial', 'trial of', 'days', 'after', 'then',
  'renews automatically', 'auto-renew', 'does not renew', 'no automatic renewal',
  'cancel anytime', 'cancellation', 'refund', 'non-refundable', 'money-back',
  'only 3 left', 'only', 'spots', 'Hurry', 'today only', 'limited-time', 'expires in',
  'VS Code', 'JetBrains', 'IDE', 'annual plan', '<script>alert(1)</script>', '<img src=x onerror=alert(1)>',
  ' ', '​', '😀', 'ß', 'İ', '\t', '—', '“', '’',
];
const CHARS = 'abcdefghijklmnopqrstuvwxyz ABCXYZ0123456789$€£.,!?/-\n\t<>"\'&;:()[]{}%*+=_~`^|\\@#😀é';

function fuzzStrings(n: number, seed: number): string[] {
  const rnd = mulberry32(seed);
  const pick = <T>(xs: T[] | string) => xs[Math.floor(rnd() * xs.length)];
  const out: string[] = ['', ' ', '\n\n', '$', '€', '.', '$.', '$0', '0-day trial', 'only  left'];
  while (out.length < n) {
    const mode = rnd();
    let s = '';
    if (mode < 0.35) {
      const len = Math.floor(rnd() * 200);
      for (let i = 0; i < len; i++) s += pick(CHARS);
    } else if (mode < 0.85) {
      const len = 1 + Math.floor(rnd() * 30);
      for (let i = 0; i < len; i++) s += pick(VOCAB) + (rnd() < 0.6 ? ' ' : '');
    } else {
      // Mutate a real example.
      const base = rnd() < 0.5 ? EXAMPLE_OFFER : SECOND_EXAMPLE_OFFER;
      const chars = [...base];
      const edits = 1 + Math.floor(rnd() * 10);
      for (let i = 0; i < edits; i++) {
        const at = Math.floor(rnd() * chars.length);
        if (rnd() < 0.5) chars.splice(at, 1);
        else chars.splice(at, 0, pick(CHARS) as string);
      }
      s = chars.join('');
    }
    out.push(s);
  }
  return out;
}

describe('fuzz: parseOffer on ~200 seeded random/garbage strings', () => {
  const inputs = fuzzStrings(210, 20261026);

  it('never throws; every evidence slice equals its quote and offsets are in bounds', () => {
    for (const text of inputs) {
      let t: OfferTerms;
      expect(() => (t = parseOffer(text)), JSON.stringify(text)).not.toThrow();
      assertEvidenceSound(text, t!);
    }
  });

  it('values are well-formed (positive integer trial, non-negative integer cents, known currency)', () => {
    for (const text of inputs) {
      const t = parseOffer(text);
      if (t.trialDays.status === 'found') {
        expect(Number.isInteger(t.trialDays.value)).toBe(true);
        expect(t.trialDays.value).toBeGreaterThan(0);
      }
      if (t.price.status === 'found') {
        expect(Number.isInteger(t.price.value.amountMinor)).toBe(true);
        expect(t.price.value.amountMinor).toBeGreaterThanOrEqual(0);
        expect(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).toContain(t.price.value.currency);
      }
    }
  });

  it('pressure cues are sorted and never overlap', () => {
    for (const text of inputs) {
      const cues = parseOffer(text).pressureCues;
      for (let i = 1; i < cues.length; i++) {
        expect(cues[i].evidence.start).toBeGreaterThanOrEqual(cues[i - 1].evidence.end);
      }
    }
  });

  it('the timeline never throws and its total equals the sum of its charges', () => {
    for (const text of inputs) {
      const t = parseOffer(text);
      for (const h of [1, 3, 6, 12] as Horizon[]) {
        const tl = calculateBillingTimeline(t, '2026-01-31', h);
        if (tl.status === 'known') {
          expect(tl.totalMinor).toBe(tl.charges.reduce((s, c) => s + c.amountMinor, 0));
          expect(tl.charges.length).toBeLessThanOrEqual(13);
        } else {
          expect(t.price.status === 'not_found' || t.billingPeriod.status === 'not_found').toBe(true);
        }
      }
    }
  });

  it('rendered highlights: every <mark> is a literal slice and the body text equals the input exactly', () => {
    for (const text of inputs.slice(0, 80)) {
      const { container, unmount } = render(createElement(EvidenceText, { text, terms: parseOffer(text) }));
      const body = container.querySelector('.evidence-text__body')!;
      expect(body.textContent).toBe(text);
      for (const m of container.querySelectorAll('mark')) {
        expect(m.textContent!.length).toBeGreaterThan(0);
        expect(text.includes(m.textContent!)).toBe(true);
        expect(m.querySelector('mark')).toBeNull();
      }
      expect(container.querySelector('script, img')).toBeNull();
      unmount();
    }
  });

  it('a large pasted ToS-sized text (~100 KB) parses quickly', () => {
    const tos = 'You may cancel your subscription at the end of the term. Refunds are not provided. '.repeat(1200);
    const t0 = performance.now();
    parseOffer(tos);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});
