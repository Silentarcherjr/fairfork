import { describe, expect, it } from 'vitest';
import { ALTERNATIVES } from '../src/data/alternatives';
import { buildCandidates, rankOptions } from '../src/lib/ranking';
import type { Timeline } from '../src/types/billing';
import type { Candidate, Preferences } from '../src/types/ranking';
import type { FeatureKey, OfferTerms } from '../src/types/terms';

const START = '2026-11-01';
const ev = { quote: 'x', start: 0, end: 1 };

function prefs(mustHave: Partial<Record<FeatureKey, boolean>> = {}, budget: number | null = null): Preferences {
  return {
    maxMonthlyBudgetMinor: budget,
    mustHave: { ide: false, annualBilling: false, monthlyCancel: false, ...mustHave },
  };
}

function offer(overrides: Partial<OfferTerms> = {}): OfferTerms {
  return {
    trialDays: { status: 'found', value: 7, evidence: ev },
    price: { status: 'found', value: { amountMinor: 1999, currency: 'USD' }, evidence: ev },
    billingPeriod: { status: 'found', value: 'month', evidence: ev },
    autoRenew: { status: 'found', value: true, evidence: ev },
    cancellation: { status: 'not_found' },
    refund: { status: 'not_found' },
    features: {
      ide: { status: 'found', value: true, evidence: ev },
      annualBilling: { status: 'not_found' },
      monthlyCancel: { status: 'not_found' },
    },
    pressureCues: [],
    ...overrides,
  };
}

const knownTimeline: Timeline = {
  status: 'known',
  firstChargeDate: '2026-11-08',
  charges: [{ date: '2026-11-08', amountMinor: 1999 }],
  totalMinor: 23988,
  currency: 'USD',
  assumptions: ['Trial of 7 days counted from the start date.'],
};

describe('buildCandidates', () => {
  it('creates one candidate per catalog price option, and none for the user when terms are null', () => {
    const cands = buildCandidates(null, null, ALTERNATIVES, START, 12);
    expect(cands.some((c) => c.isUserOffer)).toBe(false);
    expect(cands.map((c) => c.id).sort()).toEqual(
      ['claude-pro-month', 'claude-pro-year', 'copilot-pro-month', 'devin-pro-month'].sort(),
    );
  });

  it('computes horizon cost: monthly = amount x horizon, annual = billed once upfront', () => {
    const byId = Object.fromEntries(buildCandidates(null, null, ALTERNATIVES, START, 3).map((c) => [c.id, c]));
    expect(byId['copilot-pro-month'].horizonCostMinor).toBe(3000);
    expect(byId['claude-pro-month'].horizonCostMinor).toBe(6000);
    expect(byId['claude-pro-year'].horizonCostMinor).toBe(20000);
    expect(byId['claude-pro-year'].effectiveMonthlyMinor).toBe(1667);
    expect(byId['claude-pro-year'].label).toBe('Anthropic Claude Pro — annual');
    expect(byId['claude-pro-month'].assumptions).toContain('Charged from the start date; no trial counted.');
  });

  it('sets annualBilling per option and monthlyCancel only for monthly options', () => {
    const byId = Object.fromEntries(buildCandidates(null, null, ALTERNATIVES, START, 12).map((c) => [c.id, c]));
    expect(byId['claude-pro-year'].features).toEqual({ ide: 'yes', annualBilling: 'yes', monthlyCancel: 'no' });
    expect(byId['claude-pro-month'].features).toEqual({ ide: 'yes', annualBilling: 'no', monthlyCancel: 'yes' });
    expect(byId['devin-pro-month'].features.ide).toBe('unverified');
  });

  it('builds the user offer from its own text, with not_found features as unverified', () => {
    const [user] = buildCandidates(offer(), knownTimeline, ALTERNATIVES, START, 12);
    expect(user).toMatchObject({
      id: 'user-offer',
      label: 'Your offer',
      isUserOffer: true,
      period: 'month',
      currency: 'USD',
      horizonCostMinor: 23988,
      effectiveMonthlyMinor: 1999,
    });
    expect(user.features).toEqual({ ide: 'yes', annualBilling: 'unverified', monthlyCancel: 'unverified' });
    expect(user.assumptions).toContain('Judged only by what the pasted text says.');
    expect(user.assumptions).toContain('Trial of 7 days counted from the start date.');
  });

  it('leaves user cost unknown when the timeline is unknown, and maps found=false to no', () => {
    const terms = offer({
      price: { status: 'not_found' },
      features: {
        ide: { status: 'found', value: false, evidence: ev },
        annualBilling: { status: 'not_found' },
        monthlyCancel: { status: 'not_found' },
      },
    });
    const unknown: Timeline = { status: 'unknown', reason: 'No price found', assumptions: [] };
    const [user] = buildCandidates(terms, unknown, ALTERNATIVES, START, 12);
    expect(user.horizonCostMinor).toBeNull();
    expect(user.effectiveMonthlyMinor).toBeNull();
    expect(user.currency).toBeNull();
    expect(user.features.ide).toBe('no');
  });

  it('converts a yearly user price to a monthly equivalent', () => {
    const terms = offer({
      price: { status: 'found', value: { amountMinor: 24000, currency: 'USD' }, evidence: ev },
      billingPeriod: { status: 'found', value: 'year', evidence: ev },
    });
    const [user] = buildCandidates(terms, null, ALTERNATIVES, START, 12);
    expect(user.effectiveMonthlyMinor).toBe(2000);
    expect(user.horizonCostMinor).toBeNull();
  });
});

describe('rankOptions with the verified catalog', () => {
  const cands12 = buildCandidates(null, null, ALTERNATIVES, START, 12);

  it('with no preferences, the cheapest option over the horizon wins', () => {
    const r = rankOptions(cands12, prefs(), 12);
    expect(r.bestFit?.id).toBe('copilot-pro-month');
    expect(r.bestFit?.reasons[0]).toBe('Lowest cost over 12 months');
    expect(r.qualified.map((c) => c.id)).toEqual([
      'copilot-pro-month',
      'claude-pro-year',
      'claude-pro-month',
      'devin-pro-month',
    ]);
    expect(r.noneQualifies).toBe(false);
  });

  it('requiring annual billing makes an annual option win and excludes monthly ones with reasons', () => {
    const r = rankOptions(cands12, prefs({ annualBilling: true }), 12);
    expect(r.bestFit?.id).toBe('claude-pro-year');
    expect(r.bestFit?.period).toBe('year');
    expect(r.bestFit?.reasons[0]).toBe('Lowest cost over 12 months among options that meet: Annual billing');
    expect(r.excluded.map((c) => c.id).sort()).toEqual(['claude-pro-month', 'copilot-pro-month', 'devin-pro-month']);
    expect(r.excluded[0].reasons[0]).toMatch(/^Doesn't offer Annual billing/);
  });

  it('an unverified must-have goes to cantConfirm, not excluded, and is never bestFit', () => {
    const r = rankOptions(cands12, prefs({ ide: true }), 12);
    expect(r.bestFit?.id).toBe('copilot-pro-month');
    const devin = r.cantConfirm.find((c) => c.id === 'devin-pro-month');
    expect(devin?.reasons).toEqual(["We couldn't verify IDE integration"]);
    expect(r.excluded.some((c) => c.id === 'devin-pro-month')).toBe(false);
  });

  it('never crowns an unverified option even when it is the cheapest', () => {
    const cheapUnverified: Candidate = {
      id: 'cheap',
      label: 'Cheap but unverified',
      isUserOffer: false,
      period: 'month',
      currency: 'USD',
      horizonCostMinor: 1,
      effectiveMonthlyMinor: 1,
      features: { ide: 'unverified', annualBilling: 'no', monthlyCancel: 'yes' },
      assumptions: [],
    };
    const r = rankOptions([cheapUnverified, ...cands12], prefs({ ide: true }), 12);
    expect(r.bestFit?.id).not.toBe('cheap');
    expect(r.cantConfirm.map((c) => c.id)).toContain('cheap');
  });

  it('a budget below every option means noneQualifies with a reason for each', () => {
    const r = rankOptions(cands12, prefs({}, 500), 12);
    expect(r.noneQualifies).toBe(true);
    expect(r.bestFit).toBeNull();
    expect(r.qualified).toHaveLength(0);
    expect(r.excluded).toHaveLength(4);
    const copilot = r.excluded.find((c) => c.id === 'copilot-pro-month')!;
    expect(copilot.reasons).toEqual(['Costs $10.00/mo, above your $5.00 budget']);
  });

  it('budget and must-have reasons combine; excluded wins over cantConfirm', () => {
    const r = rankOptions(cands12, prefs({ ide: true }, 1500), 12);
    const devin = r.excluded.find((c) => c.id === 'devin-pro-month')!;
    expect(devin.reasons).toEqual(['Costs $20.00/mo, above your $15.00 budget', "We couldn't verify IDE integration"]);
    // Claude annual is $16.67/mo effective, above $15.
    expect(r.excluded.map((c) => c.id)).toContain('claude-pro-year');
    expect(r.bestFit?.id).toBe('copilot-pro-month');
    expect(r.bestFit?.reasons[0]).toBe(
      'Lowest cost over 12 months among options that meet: IDE integration, ≤ $15.00/mo',
    );
  });

  it('requiring cancel-anytime monthly excludes the annual option with a derived reason', () => {
    const r = rankOptions(cands12, prefs({ monthlyCancel: true }), 12);
    const annual = r.excluded.find((c) => c.id === 'claude-pro-year')!;
    expect(annual.reasons).toEqual(["Doesn't offer Cancel-anytime monthly: this option is billed yearly"]);
  });

  it('puts a user offer with unknown cost into cantConfirm when a budget is set', () => {
    const terms = offer({ price: { status: 'not_found' } });
    const cands = buildCandidates(terms, null, ALTERNATIVES, START, 12);
    const r = rankOptions(cands, prefs({}, 5000), 12);
    const user = r.cantConfirm.find((c) => c.isUserOffer)!;
    expect(user.reasons[0]).toMatch(/^Cost not comparable/);
  });

  it('marks a non-USD user offer as not comparable under a budget', () => {
    const terms = offer({ price: { status: 'found', value: { amountMinor: 1000, currency: 'EUR' }, evidence: ev } });
    const r = rankOptions(buildCandidates(terms, null, ALTERNATIVES, START, 12), prefs({}, 5000), 12);
    expect(r.cantConfirm.find((c) => c.isUserOffer)?.reasons[0]).toMatch(/^Cost not comparable/);
  });

  it('ranks a qualifying user offer against the catalog by horizon cost', () => {
    const cands = buildCandidates(offer(), knownTimeline, ALTERNATIVES, START, 12);
    const r = rankOptions(cands, prefs({ ide: true }), 12);
    // $239.88 over 12 months: more than Copilot ($120) and Claude annual ($200), less than Claude monthly ($240).
    expect(r.qualified.map((c) => c.id)).toEqual(['copilot-pro-month', 'claude-pro-year', 'user-offer', 'claude-pro-month']);
  });

  it('breaks cost ties by fewer unverified features, then label', () => {
    const r = rankOptions(buildCandidates(null, null, ALTERNATIVES, START, 1), prefs(), 1);
    // Claude monthly and Devin monthly both cost $20 over 1 month; Devin has more unverified features.
    expect(r.qualified.map((c) => c.id)).toEqual([
      'copilot-pro-month',
      'claude-pro-month',
      'devin-pro-month',
      'claude-pro-year',
    ]);
  });

  it('uses a generic period phrase when no horizon is passed', () => {
    expect(rankOptions(cands12, prefs()).bestFit?.reasons[0]).toBe('Lowest cost over the selected period');
  });
});
