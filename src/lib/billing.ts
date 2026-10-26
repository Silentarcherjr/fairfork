import type { OfferTerms } from '../types/terms';
import type { Charge, Horizon, Timeline } from '../types/billing';
import { addDays, addMonthsClamped, compareISO, isValidISODate } from './dates';

export const ASSUMPTION_NO_TRIAL = 'No trial found in the text — first charge assumed on the start date.';
export const ASSUMPTION_RENEWAL_UNKNOWN =
  'Renewal not stated in the text — projection assumes it continues until canceled.';
export const ASSUMPTION_NO_CANCEL = "Assuming you don't cancel before each charge.";
export const ASSUMPTION_NO_RENEW = 'The text says the plan does not renew — only the first charge is shown.';

/**
 * Projects every charge from startDate up to (but not including) startDate + horizon months.
 * Integer minor units only; never invents a price.
 */
export function calculateBillingTimeline(terms: OfferTerms, startDate: string, horizon: Horizon): Timeline {
  const assumptions: string[] = [];

  if (terms.price.status !== 'found') {
    return { status: 'unknown', reason: 'Price not found in the text', assumptions };
  }
  if (!isValidISODate(startDate)) {
    return { status: 'unknown', reason: 'Start date is not a valid date', assumptions };
  }

  let firstChargeDate: string;
  if (terms.trialDays.status === 'found') {
    firstChargeDate = addDays(startDate, terms.trialDays.value);
  } else {
    firstChargeDate = startDate;
    assumptions.push(ASSUMPTION_NO_TRIAL);
  }

  if (terms.billingPeriod.status !== 'found') {
    return { status: 'unknown', reason: 'Billing period not found in the text', assumptions };
  }

  const { amountMinor, currency } = terms.price.value;
  const monthsPerCharge = terms.billingPeriod.value === 'year' ? 12 : 1;
  const horizonEnd = addMonthsClamped(startDate, horizon);
  const charges: Charge[] = [];

  const renews = !(terms.autoRenew.status === 'found' && terms.autoRenew.value === false);
  if (terms.autoRenew.status === 'found') {
    assumptions.push(terms.autoRenew.value ? ASSUMPTION_NO_CANCEL : ASSUMPTION_NO_RENEW);
  } else {
    assumptions.push(ASSUMPTION_RENEWAL_UNKNOWN);
  }

  for (let k = 0; ; k++) {
    const date = addMonthsClamped(firstChargeDate, monthsPerCharge * k);
    if (compareISO(date, horizonEnd) >= 0) break;
    charges.push({ date, amountMinor });
    if (!renews) break;
  }

  const totalMinor = charges.reduce((sum, c) => sum + c.amountMinor, 0);
  return { status: 'known', firstChargeDate, charges, totalMinor, currency, assumptions };
}
