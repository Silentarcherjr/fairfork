import type { BillingPeriod, FeatureKey } from './terms';

export type Sourced<T> = { value: T; sourceUrl: string; quote: string };
export type FeatureStatus = { status: 'yes' | 'no' | 'unverified'; sourceUrl?: string; quote?: string };
export type PriceOption = { period: BillingPeriod; amountMinor: number; currency: 'USD'; sourceUrl: string; quote: string; note?: string };
export type Alternative = {
  id: string;
  provider: string;
  plan: string;
  officialUrl: string;
  verifiedAt: string; // ISO date
  prices: PriceOption[];
  trial: Sourced<number | null> | 'unknown'; // null = verified "no trial"
  autoRenew: Sourced<boolean> | 'unknown';
  cancellation: Sourced<string> | 'unknown';
  refund: (Sourced<string> & { conflict?: Sourced<string> }) | 'unknown';
  features: Record<FeatureKey, FeatureStatus>;
  caveats: string[];
};
