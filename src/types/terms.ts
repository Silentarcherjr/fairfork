export type Evidence = { quote: string; start: number; end: number };
export type Field<T> = { status: 'found'; value: T; evidence: Evidence } | { status: 'not_found' };
export type BillingPeriod = 'month' | 'year';
export type FeatureKey = 'ide' | 'annualBilling' | 'monthlyCancel';
export const FEATURE_KEYS: FeatureKey[] = ['ide', 'annualBilling', 'monthlyCancel'];
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  ide: 'IDE integration',
  annualBilling: 'Annual billing',
  monthlyCancel: 'Cancel-anytime monthly',
};
export type PressureCue = { kind: 'scarcity' | 'urgency'; evidence: Evidence };
export type OfferTerms = {
  trialDays: Field<number>;
  price: Field<{ amountMinor: number; currency: string }>; // ISO currency code, e.g. 'USD'
  billingPeriod: Field<BillingPeriod>;
  autoRenew: Field<boolean>;
  cancellation: Field<string>;
  refund: Field<string>;
  features: Record<FeatureKey, Field<boolean>>;
  pressureCues: PressureCue[];
};
