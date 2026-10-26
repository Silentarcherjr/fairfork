import type { Alternative, PriceOption } from '../types/alternatives';
import type { Horizon, Timeline } from '../types/billing';
import type { Candidate, FeatureValue, Preferences, RankResult, RankedCandidate } from '../types/ranking';
import type { BillingPeriod, FeatureKey, OfferTerms } from '../types/terms';
import { FEATURE_KEYS, FEATURE_LABELS } from '../types/terms';
import { formatMoney } from './money';

const USER_OFFER_ASSUMPTION = 'Judged only by what the pasted text says.';
const NO_TRIAL_ASSUMPTION = 'Charged from the start date; no trial counted.';

function months(n: number): string {
  return n === 1 ? '1 month' : `${n} months`;
}

function userOfferCandidate(terms: OfferTerms, timeline: Timeline | null): Candidate {
  const period: BillingPeriod | null = terms.billingPeriod.status === 'found' ? terms.billingPeriod.value : null;
  const price = terms.price.status === 'found' ? terms.price.value : null;

  let effectiveMonthlyMinor: number | null = null;
  if (price && period === 'month') effectiveMonthlyMinor = price.amountMinor;
  else if (price && period === 'year') effectiveMonthlyMinor = Math.round(price.amountMinor / 12);

  const features = {} as Record<FeatureKey, FeatureValue>;
  for (const key of FEATURE_KEYS) {
    const field = terms.features[key];
    features[key] = field.status === 'found' ? (field.value ? 'yes' : 'no') : 'unverified';
  }

  return {
    id: 'user-offer',
    label: 'Your offer',
    isUserOffer: true,
    period,
    currency: price ? price.currency : null,
    horizonCostMinor: timeline && timeline.status === 'known' ? timeline.totalMinor : null,
    effectiveMonthlyMinor,
    features,
    assumptions: [...(timeline?.assumptions ?? []), USER_OFFER_ASSUMPTION],
  };
}

function alternativeCandidate(alt: Alternative, option: PriceOption, startDate: string, horizon: Horizon): Candidate {
  const isAnnual = option.period === 'year';
  const amount = formatMoney(option.amountMinor, option.currency);

  const assumptions = [NO_TRIAL_ASSUMPTION];
  if (isAnnual) {
    assumptions.push(`Billed ${amount} upfront on ${startDate}; one charge covers 12 months.`);
    if (horizon < 12) assumptions.push(`The full year is paid even if you only count ${months(horizon)}.`);
  } else {
    assumptions.push(
      `Charged ${amount} on ${startDate} and on the same day each following month (${horizon} ${horizon === 1 ? 'charge' : 'charges'}).`,
    );
  }
  if (option.note) assumptions.push(option.note);

  const planFeature = (key: FeatureKey): FeatureValue => alt.features[key].status;

  return {
    id: `${alt.id}-${option.period}`,
    label: `${alt.provider} ${alt.plan} — ${isAnnual ? 'annual' : 'monthly'}`,
    isUserOffer: false,
    alternativeId: alt.id,
    period: option.period,
    currency: option.currency,
    horizonCostMinor: isAnnual ? option.amountMinor : option.amountMinor * horizon,
    effectiveMonthlyMinor: isAnnual ? Math.round(option.amountMinor / 12) : option.amountMinor,
    features: {
      ide: planFeature('ide'),
      // A price option either is yearly billing or it is not; this is a fact about the option itself.
      annualBilling: isAnnual ? 'yes' : 'no',
      // Cancel-anytime monthly only applies to an option paid monthly.
      monthlyCancel: isAnnual ? 'no' : planFeature('monthlyCancel'),
    },
    assumptions,
  };
}

export function buildCandidates(
  terms: OfferTerms | null,
  timeline: Timeline | null,
  alternatives: Alternative[],
  startDate: string,
  horizon: Horizon,
): Candidate[] {
  const candidates: Candidate[] = [];
  if (terms) candidates.push(userOfferCandidate(terms, timeline));
  for (const alt of alternatives) {
    for (const option of alt.prices) candidates.push(alternativeCandidate(alt, option, startDate, horizon));
  }
  return candidates;
}

function missingReason(candidate: Candidate, key: FeatureKey): string {
  const base = `Doesn't offer ${FEATURE_LABELS[key]}`;
  if (!candidate.isUserOffer && key === 'monthlyCancel' && candidate.period === 'year') {
    return `${base}: this option is billed yearly`;
  }
  if (!candidate.isUserOffer && key === 'annualBilling' && candidate.period === 'month') {
    return `${base}: this option is billed monthly`;
  }
  return base;
}

function unverifiedCount(c: Candidate): number {
  return FEATURE_KEYS.filter((k) => c.features[k] === 'unverified').length;
}

/** Comparable cost: known and in USD (the catalog currency). Anything else sorts after. */
function comparableCost(c: Candidate): number | null {
  return c.horizonCostMinor !== null && c.currency === 'USD' ? c.horizonCostMinor : null;
}

function compareCandidates(a: Candidate, b: Candidate): number {
  const ca = comparableCost(a);
  const cb = comparableCost(b);
  if (ca !== cb) {
    if (ca === null) return 1;
    if (cb === null) return -1;
    return ca - cb;
  }
  const ua = unverifiedCount(a);
  const ub = unverifiedCount(b);
  if (ua !== ub) return ua - ub;
  return a.label.localeCompare(b.label);
}

export function rankOptions(candidates: Candidate[], prefs: Preferences, horizon?: Horizon): RankResult {
  const qualified: RankedCandidate[] = [];
  const cantConfirm: RankedCandidate[] = [];
  const excluded: RankedCandidate[] = [];
  const required = FEATURE_KEYS.filter((k) => prefs.mustHave[k]);
  const budget = prefs.maxMonthlyBudgetMinor;

  for (const c of [...candidates].sort(compareCandidates)) {
    const fails: string[] = [];
    const unsure: string[] = [];

    for (const key of required) {
      const value = c.features[key];
      if (value === 'no') fails.push(missingReason(c, key));
      else if (value === 'unverified') unsure.push(`We couldn't verify ${FEATURE_LABELS[key]}`);
    }

    // An option whose cost can't be compared is never crowned: "lowest cost wins" needs a cost.
    if (c.effectiveMonthlyMinor === null || comparableCost(c) === null) {
      unsure.push(
        c.currency !== null && c.currency !== 'USD'
          ? `Cost not comparable: priced in ${c.currency}, the catalog is in USD`
          : 'Cost not comparable: the price or billing period is unknown',
      );
    } else if (budget !== null) {
      if (c.effectiveMonthlyMinor > budget) {
        fails.push(
          `Costs ${formatMoney(c.effectiveMonthlyMinor, 'USD')}/mo, above your ${formatMoney(budget, 'USD')} budget`,
        );
      }
    }

    if (fails.length > 0) excluded.push({ ...c, reasons: [...fails, ...unsure] });
    else if (unsure.length > 0) cantConfirm.push({ ...c, reasons: unsure });
    else qualified.push({ ...c, reasons: ['Meets every requirement you set'] });
  }

  let bestFit: RankedCandidate | null = null;
  if (qualified.length > 0) {
    const met = required.map((k) => FEATURE_LABELS[k]);
    if (budget !== null) met.push(`≤ ${formatMoney(budget, 'USD')}/mo`);
    const period = horizon ? `over ${months(horizon)}` : 'over the selected period';
    const head = `Lowest cost ${period}`;
    const reasons = [met.length > 0 ? `${head} among options that meet: ${met.join(', ')}` : head];
    const cost = comparableCost(qualified[0]);
    if (cost !== null) reasons.push(`${formatMoney(cost, 'USD')} in total ${period}`);
    bestFit = { ...qualified[0], reasons };
    qualified[0] = bestFit;
  }

  return { qualified, cantConfirm, excluded, bestFit, noneQualifies: qualified.length === 0 };
}
