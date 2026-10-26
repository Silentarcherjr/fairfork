const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };

/** Formats integer minor units (cents) as a display string, e.g. 1999 USD -> "$19.99". */
export function formatMoney(amountMinor: number, currency: string): string {
  const sign = amountMinor < 0 ? '-' : '';
  const abs = Math.abs(amountMinor);
  const major = Math.floor(abs / 100).toLocaleString('en-US');
  const cents = String(abs % 100).padStart(2, '0');
  const symbol = SYMBOLS[currency];
  return symbol ? `${sign}${symbol}${major}.${cents}` : `${sign}${major}.${cents} ${currency}`;
}
