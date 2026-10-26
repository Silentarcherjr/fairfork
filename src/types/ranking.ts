import type { BillingPeriod, FeatureKey } from './terms';

export type Preferences = { maxMonthlyBudgetMinor: number | null; mustHave: Record<FeatureKey, boolean> };
export type FeatureValue = 'yes' | 'no' | 'unverified';
export type Candidate = {
  id: string;
  label: string;
  isUserOffer: boolean;
  alternativeId?: string;
  period: BillingPeriod | null;
  currency: string | null;
  horizonCostMinor: number | null;
  effectiveMonthlyMinor: number | null;
  features: Record<FeatureKey, FeatureValue>;
  assumptions: string[];
};
export type RankedCandidate = Candidate & { reasons: string[] };
export type RankResult = {
  qualified: RankedCandidate[];
  cantConfirm: RankedCandidate[];
  excluded: RankedCandidate[];
  bestFit: RankedCandidate | null;
  noneQualifies: boolean;
};
