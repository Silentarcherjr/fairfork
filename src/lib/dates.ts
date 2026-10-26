// Pure helpers on 'YYYY-MM-DD' strings. All arithmetic is done in UTC so results
// never shift with the viewer's time zone or daylight-saving changes.

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function parts(date: string): { y: number; m: number; d: number } {
  const match = ISO_RE.exec(date);
  if (!match || !isValidISODate(date)) throw new Error(`Invalid ISO date: ${date}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function fromUTC(ms: number): string {
  const dt = new Date(ms);
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function daysInMonth(y: number, m1: number): number {
  // m1 is 1-based; day 0 of the next month is the last day of this month.
  return new Date(Date.UTC(y, m1, 0)).getUTCDate();
}

/** True when s is a real calendar date written as YYYY-MM-DD. */
export function isValidISODate(s: string): boolean {
  if (typeof s !== 'string') return false;
  const match = ISO_RE.exec(s);
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= daysInMonth(y, m);
}

/** Today's date in the viewer's local calendar, as YYYY-MM-DD. */
export function todayISO(): string {
  const now = new Date();
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** date + n days (n may be negative). */
export function addDays(date: string, n: number): string {
  const { y, m, d } = parts(date);
  return fromUTC(Date.UTC(y, m - 1, d + n));
}

/**
 * The date n months after anchor, clamped to the end of the target month.
 * Always computed from the anchor (never chained), so 2026-01-31 +1 → 2026-02-28
 * and +2 → 2026-03-31.
 */
export function addMonthsClamped(anchor: string, n: number): string {
  const { y, m, d } = parts(anchor);
  const totalMonths = y * 12 + (m - 1) + n;
  const ty = Math.floor(totalMonths / 12);
  const tm = totalMonths - ty * 12 + 1;
  const day = Math.min(d, daysInMonth(ty, tm));
  return `${pad(ty, 4)}-${pad(tm)}-${pad(day)}`;
}

/** Negative if a < b, 0 if equal, positive if a > b. */
export function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
