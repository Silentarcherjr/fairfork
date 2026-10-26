export type Charge = { date: string; amountMinor: number }; // date = 'YYYY-MM-DD'
export type Horizon = 1 | 3 | 6 | 12;
export type Timeline =
  | { status: 'known'; firstChargeDate: string; charges: Charge[]; totalMinor: number; currency: string; assumptions: string[] }
  | { status: 'unknown'; reason: string; assumptions: string[] };
