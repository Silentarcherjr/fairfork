import { describe, it, expect } from 'vitest';
import { calculateBillingTimeline } from '../src/lib/billing';
import { parseOffer } from '../src/lib/parseOffer';
import { addDays, addMonthsClamped, compareISO, isValidISODate, todayISO } from '../src/lib/dates';
import { EXAMPLE_OFFER, SECOND_EXAMPLE_OFFER } from '../src/data/exampleOffer';

describe('dates', () => {
  it('addDays crosses month/year boundaries', () => {
    expect(addDays('2026-10-26', 7)).toBe('2026-11-02');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('addMonthsClamped clamps from the anchor, never chained', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsClamped('2026-11-15', 14)).toBe('2028-01-15');
  });

  it('validates and compares', () => {
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('nope')).toBe(false);
    expect(isValidISODate(todayISO())).toBe(true);
    expect(compareISO('2026-01-01', '2026-01-02')).toBeLessThan(0);
    expect(compareISO('2026-01-02', '2026-01-02')).toBe(0);
  });
});

describe('calculateBillingTimeline', () => {
  const example = parseOffer(EXAMPLE_OFFER);

  it('example offer from 2026-10-26: first charge after the 7-day trial, 12 charges in 12 months', () => {
    const tl = calculateBillingTimeline(example, '2026-10-26', 12);
    if (tl.status !== 'known') throw new Error('expected known');
    expect(tl.firstChargeDate).toBe('2026-11-02');
    expect(tl.charges).toHaveLength(12);
    expect(tl.charges[0]).toEqual({ date: '2026-11-02', amountMinor: 1999 });
    expect(tl.charges[11].date).toBe('2027-10-02');
    expect(tl.totalMinor).toBe(23988);
    expect(tl.currency).toBe('USD');
    expect(tl.assumptions).toContain("Assuming you don't cancel before each charge.");
  });

  it('1-month horizon → 1 charge', () => {
    const tl = calculateBillingTimeline(example, '2026-10-26', 1);
    if (tl.status !== 'known') throw new Error('expected known');
    expect(tl.charges).toHaveLength(1);
    expect(tl.totalMinor).toBe(1999);
  });

  it('3 and 6 month horizons', () => {
    const t3 = calculateBillingTimeline(example, '2026-10-26', 3);
    const t6 = calculateBillingTimeline(example, '2026-10-26', 6);
    expect(t3.status === 'known' && t3.totalMinor).toBe(3 * 1999);
    expect(t6.status === 'known' && t6.totalMinor).toBe(6 * 1999);
  });

  it('changing the price to $29.99 changes the total', () => {
    const tl = calculateBillingTimeline(parseOffer(EXAMPLE_OFFER.replace('$19.99', '$29.99')), '2026-10-26', 12);
    if (tl.status !== 'known') throw new Error('expected known');
    expect(tl.totalMinor).toBe(12 * 2999);
  });

  it('no price → unknown, not $0', () => {
    const tl = calculateBillingTimeline(parseOffer('Start a 7-day free trial, renews monthly.'), '2026-10-26', 12);
    expect(tl).toMatchObject({ status: 'unknown', reason: 'Price not found in the text' });
  });

  it('price but no period → unknown', () => {
    const tl = calculateBillingTimeline(parseOffer('Pay $20 to get started.'), '2026-10-26', 12);
    expect(tl).toMatchObject({ status: 'unknown', reason: 'Billing period not found in the text' });
  });

  it('month-end start without trial clamps to month end', () => {
    const tl = calculateBillingTimeline(parseOffer('$10 per month.'), '2026-01-31', 3);
    if (tl.status !== 'known') throw new Error('expected known');
    expect(tl.charges.map((c) => c.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    expect(tl.assumptions).toContain('No trial found in the text — first charge assumed on the start date.');
    expect(tl.assumptions).toContain('Renewal not stated in the text — projection assumes it continues until canceled.');
  });

  it('yearly offer with 14-day trial → one charge on 2026-11-09 over 12 months', () => {
    const tl = calculateBillingTimeline(parseOffer(SECOND_EXAMPLE_OFFER), '2026-10-26', 12);
    if (tl.status !== 'known') throw new Error('expected known');
    expect(tl.charges).toEqual([{ date: '2026-11-09', amountMinor: 24000 }]);
    expect(tl.totalMinor).toBe(24000);
  });

  it('autoRenew false → only the first charge', () => {
    const tl = calculateBillingTimeline(parseOffer('$15 per month. This plan does not renew.'), '2026-10-26', 12);
    if (tl.status !== 'known') throw new Error('expected known');
    expect(tl.charges).toHaveLength(1);
    expect(tl.totalMinor).toBe(1500);
  });

  it('amounts stay integer cents', () => {
    const tl = calculateBillingTimeline(parseOffer('$0.10/month'), '2026-10-26', 12);
    if (tl.status !== 'known') throw new Error('expected known');
    expect(tl.totalMinor).toBe(120);
    expect(Number.isInteger(tl.totalMinor)).toBe(true);
  });
});
