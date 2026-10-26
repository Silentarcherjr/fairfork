import type {
  BillingPeriod,
  Evidence,
  FeatureKey,
  Field,
  OfferTerms,
  PressureCue,
} from '../types/terms';

// Rules-based, English-only extraction. Everything returned is a literal slice of the
// input text (text.slice(start, end) === quote). Missing values are never defaulted.

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, 'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23,
  'twenty-four': 24, 'twenty-five': 25, 'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28,
  'twenty-nine': 29, thirty: 30,
};

// Longest words first so "twenty-one" wins over "twenty".
const NUM_WORD_ALT = Object.keys(NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .join('|');
const NUM = `(\\d{1,3}|${NUM_WORD_ALT})`;

const notFound = <T>(): Field<T> => ({ status: 'not_found' });

function evidence(text: string, start: number, end: number): Evidence {
  return { quote: text.slice(start, end), start, end };
}

function found<T>(text: string, value: T, start: number, end: number): Field<T> {
  return { status: 'found', value, evidence: evidence(text, start, end) };
}

function toNumber(token: string): number | null {
  const lower = token.toLowerCase();
  if (/^\d+$/.test(lower)) return Number(lower);
  return NUMBER_WORDS[lower] ?? null;
}

type Span = { start: number; end: number };

/** First match of re in text, as a span (re must not be sticky). */
function firstMatch(text: string, re: RegExp): (Span & { m: RegExpExecArray }) | null {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const g = new RegExp(re.source, flags);
  const m = g.exec(text);
  if (!m) return null;
  return { start: m.index, end: m.index + m[0].length, m };
}

function allMatches(text: string, re: RegExp): RegExpExecArray[] {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const g = new RegExp(re.source, flags);
  const out: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = g.exec(text)) !== null) {
    out.push(m);
    if (m[0].length === 0) g.lastIndex++;
  }
  return out;
}

/** Sentence spans (trimmed), split on . ! ? followed by whitespace/end, or on newlines. */
function sentences(text: string): Span[] {
  const spans: Span[] = [];
  const boundary = /[.!?]+(?=\s|$)|\n/g;
  let start = 0;
  let m: RegExpExecArray | null;
  const push = (s: number, e: number) => {
    while (s < e && /\s/.test(text[s])) s++;
    while (e > s && /\s/.test(text[e - 1])) e--;
    if (e > s) spans.push({ start: s, end: e });
  };
  while ((m = boundary.exec(text)) !== null) {
    const end = m[0] === '\n' ? m.index : m.index + m[0].length;
    push(start, end);
    start = m.index + m[0].length;
  }
  push(start, text.length);
  return spans;
}

function sentenceContaining(sents: Span[], index: number): Span | null {
  return sents.find((s) => index >= s.start && index < s.end) ?? null;
}

// ---------- Trial ----------

function parseTrial(text: string): Field<number> {
  const patterns: RegExp[] = [
    // "FREE 7-day trial", "7-day free trial", "14 day trial", "seven-day free trial"
    new RegExp(`\\b(?:free\\s+)?${NUM}[-\\s]days?\\s+(?:free\\s+)?trial\\b`, 'i'),
    // "trial of 7 days", "trial period of 14 days"
    new RegExp(`\\btrial(?:\\s+period)?\\s+(?:of|for)\\s+${NUM}\\s+days?\\b`, 'i'),
    // "14 days free"
    new RegExp(`\\b${NUM}\\s+days?\\s+(?:for\\s+)?free\\b`, 'i'),
    // "free for seven days"
    new RegExp(`\\bfree\\s+for\\s+(?:the\\s+first\\s+)?${NUM}\\s+days?\\b`, 'i'),
  ];
  for (const re of patterns) {
    const hit = firstMatch(text, re);
    if (hit) {
      const n = toNumber(hit.m[1]);
      if (n !== null && n > 0) return found(text, n, hit.start, hit.end);
    }
  }
  // Weak fallback: "After seven days, ..." only when the text talks about a trial / free start.
  if (/\btrial\b|\bfree\b/i.test(text)) {
    const hit = firstMatch(text, new RegExp(`\\bafter\\s+(?:the\\s+first\\s+)?${NUM}\\s+days?\\b`, 'i'));
    if (hit) {
      const n = toNumber(hit.m[1]);
      if (n !== null && n > 0) return found(text, n, hit.start, hit.end);
    }
  }
  return notFound();
}

// ---------- Price, currency, billing period ----------

const MONEY_NUM = `(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)(?![\\d,.]\\d)`;
const CODES = 'USD|EUR|GBP|CAD|AUD';
const MONEY_RE = new RegExp(
  [
    `(US\\$|\\$|€|£)\\s?${MONEY_NUM}(?:\\s?(${CODES})\\b)?`,
    `\\b(${CODES})\\s?\\$?${MONEY_NUM}`,
    `(?<![\\d.,])${MONEY_NUM}\\s?(${CODES})\\b`,
  ].join('|'),
  'g',
);
const SYMBOL_CURRENCY: Record<string, string> = { US$: 'USD', $: 'USD', '€': 'EUR', '£': 'GBP' };

// Period phrase directly after a price, e.g. "/month", " per year", " each month", " monthly".
const TIED_PERIOD_RE =
  /^\s*(?:(?:\/\s?|per\s+|each\s+|every\s+|a\s+)(month|mo|year|yr)\b|(monthly)\b|(annually|yearly|per\s+annum)\b)/i;

const MONTH_RE = /\/\s?(?:month|mo)\b|\bper\s+month\b|\beach\s+month\b|\bevery\s+month\b|\bmonthly\b/i;
const YEAR_RE =
  /\/\s?(?:year|yr)\b|\bper\s+year\b|\beach\s+year\b|\bevery\s+year\b|\bannually\b|\bbilled\s+yearly\b|\byearly\b/i;

function toMinor(numStr: string): number {
  const clean = numStr.replace(/,/g, '');
  const [whole, frac = ''] = clean.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}

type PriceCandidate = {
  amountMinor: number;
  currency: string;
  span: Span;
  period: { value: BillingPeriod; span: Span } | null;
  score: number;
};

function periodFromWord(word: string): BillingPeriod {
  const w = word.toLowerCase();
  return w.startsWith('mo') ? 'month' : 'year';
}

function priceCandidates(text: string, sents: Span[]): PriceCandidate[] {
  const out: PriceCandidate[] = [];
  for (const m of allMatches(text, MONEY_RE)) {
    let currency: string;
    let numStr: string;
    if (m[1] !== undefined) {
      currency = m[3] ? m[3].toUpperCase() : SYMBOL_CURRENCY[m[1]];
      numStr = m[2];
    } else if (m[4] !== undefined) {
      currency = m[4].toUpperCase();
      numStr = m[5];
    } else {
      currency = m[7].toUpperCase();
      numStr = m[6];
    }
    const start = m.index;
    const end = m.index + m[0].length;
    const amountMinor = toMinor(numStr);

    let period: PriceCandidate['period'] = null;
    const after = text.slice(end, end + 40);
    const tied = TIED_PERIOD_RE.exec(after);
    if (tied) {
      const lead = tied[0].length - tied[0].trimStart().length;
      const word = tied[1] ?? tied[2] ?? tied[3];
      const pStart = end + lead;
      period = { value: periodFromWord(word), span: { start: pStart, end: end + tied[0].length } };
    }

    let score = 0;
    if (period) score += 10;
    const sent = sentenceContaining(sents, start);
    if (sent && /\b(renew|renews|then|billed|after|charged)\b/i.test(text.slice(sent.start, sent.end))) score += 2;
    if (amountMinor === 0) score -= 5;
    if (/^\s*(?:due\s+)?(?:today|now)\b/i.test(after)) score -= 20;
    out.push({ amountMinor, currency, span: { start, end }, period, score });
  }
  return out;
}

function pickPrice(cands: PriceCandidate[]): PriceCandidate | null {
  let best: PriceCandidate | null = null;
  for (const c of cands) {
    if (c.score < 0) continue;
    if (!best || c.score > best.score) best = c;
  }
  return best;
}

function parseGlobalPeriod(text: string): Field<BillingPeriod> {
  const mo = firstMatch(text, MONTH_RE);
  const yr = firstMatch(text, YEAR_RE);
  const pick = mo && yr ? (mo.start <= yr.start ? mo : yr) : (mo ?? yr);
  if (!pick) return notFound();
  return found(text, pick === mo ? 'month' : 'year', pick.start, pick.end);
}

// ---------- Auto-renew ----------

function parseAutoRenew(text: string): Field<boolean> {
  const negative =
    /\b(?:does\s+not|doesn't|doesn’t|will\s+not|won't|won’t|do\s+not|don't|don’t)\s+(?:auto(?:matically|-)?\s*)?renew\b|\bno\s+auto(?:matic)?[-\s]?renewal\b|\bnot\s+auto[-\s]?renew\w*/i;
  const neg = firstMatch(text, negative);
  if (neg) return found(text, false, neg.start, neg.end);
  const positive =
    /\brenews?\s+automatically\b|\bautomatically\s+renews?\b|\bauto[-\s]?renew(?:s|al|ed|ing)?\b/i;
  const pos = firstMatch(text, positive);
  if (pos) return found(text, true, pos.start, pos.end);
  return notFound();
}

// ---------- Sentence-based statements ----------

function sentenceField(text: string, sents: Span[], strong: RegExp | null, weak: RegExp): Field<string> {
  const tryRe = (re: RegExp): Field<string> | null => {
    for (const s of sents) {
      if (re.test(text.slice(s.start, s.end))) {
        const quote = text.slice(s.start, s.end);
        return found(text, quote.trim(), s.start, s.end);
      }
    }
    return null;
  };
  return (strong && tryRe(strong)) || tryRe(weak) || notFound();
}

// ---------- Pressure cues ----------

const SCARCITY_RES: RegExp[] = [
  new RegExp(`\\bonly\\s+${NUM}\\s+(?:(?:spots?|seats?|places?|licen[cs]es?)\\s+)?(?:left|remaining)\\b`, 'gi'),
  /\blimited\s+(?:spots|seats|places|availability)\b/gi,
  /\b(?:a\s+)?few\s+(?:spots|seats|places)\s+(?:left|remaining)\b/gi,
  /\balmost\s+gone\b/gi,
];
const URGENCY_RES: RegExp[] = [
  /\btoday\s+only\b/gi,
  /\bends\s+tonight\b/gi,
  /(?<!\bno\s)(?<!\bany\s)\bhurry\b/gi,
  /\blast\s+chance\b/gi,
  /\bexpires\s+in\b/gi,
  /\blimited[-\s]time\b/gi,
];

function parsePressureCues(text: string): PressureCue[] {
  const cues: PressureCue[] = [];
  const add = (kind: PressureCue['kind'], res: RegExp[]) => {
    for (const re of res) {
      for (const m of allMatches(text, re)) {
        const start = m.index;
        const end = start + m[0].length;
        if (cues.some((c) => start < c.evidence.end && end > c.evidence.start)) continue;
        cues.push({ kind, evidence: evidence(text, start, end) });
      }
    }
  };
  add('scarcity', SCARCITY_RES);
  add('urgency', URGENCY_RES);
  return cues.sort((a, b) => a.evidence.start - b.evidence.start);
}

// ---------- Main ----------

// Offers are short; capping keeps worst-case regex time bounded. Offsets stay valid for the original text.
export const MAX_INPUT_CHARS = 20000;

// "$16/month billed annually": a per-month figure that is actually charged once a year.
const BILLED_ANNUALLY_RE = /\b(?:billed|paid|charged)\s+(?:annually|yearly|once\s+a\s+year)\b/i;

export function parseOffer(text: string): OfferTerms {
  const input = typeof text === 'string' ? text.slice(0, MAX_INPUT_CHARS) : '';
  const sents = sentences(input);

  const trialDays = parseTrial(input);

  const cands = priceCandidates(input, sents);
  let best = pickPrice(cands);
  let price: OfferTerms['price'] = notFound();
  let billingPeriod: Field<BillingPeriod> | null = null;

  if (best && best.period?.value === 'month') {
    const sent = sentenceContaining(sents, best.span.start);
    const rest = sent ? input.slice(best.span.end, sent.end) : '';
    const billed = BILLED_ANNUALLY_RE.exec(rest);
    if (billed) {
      const yearly = cands.find((c) => c.period?.value === 'year' && c.currency === best!.currency && c.score >= 0);
      if (yearly) {
        best = yearly;
      } else {
        // No yearly total stated: the yearly charge is 12 × the monthly figure, quoted together.
        const billedEnd = best.span.end + billed.index + billed[0].length;
        price = found(input, { amountMinor: best.amountMinor * 12, currency: best.currency }, best.span.start, billedEnd);
        billingPeriod = found(input, 'year', best.span.end + billed.index, billedEnd);
      }
    }
  }

  if (best && price.status === 'not_found') {
    price = found(input, { amountMinor: best.amountMinor, currency: best.currency }, best.span.start, best.span.end);
  }
  if (!billingPeriod) {
    billingPeriod =
      best && best.period
        ? found(input, best.period.value, best.period.span.start, best.period.span.end)
        : parseGlobalPeriod(input);
  }

  const autoRenew = parseAutoRenew(input);

  const cancellation = sentenceField(
    input,
    sents,
    /\bcancel(?:l?ation)?\b[^.]*?\b(?:any\s*time|at\s+any\s+time)\b|\b(?:you\s+(?:can|may)|to)\s+cancel\b|\bcancell?ation\b/i,
    /\bcancel/i,
  );
  const refund = sentenceField(input, sents, null, /refund|non-refundable|money[-\s]back/i);

  // Features
  const features: Record<FeatureKey, Field<boolean>> = {
    ide: notFound(),
    annualBilling: notFound(),
    monthlyCancel: notFound(),
  };
  const ide = firstMatch(input, /\b(?:VS\s?Code|Visual\s+Studio\s+Code|JetBrains|IDEs?|editor\s+(?:plugins?|extensions?)|editors?)\b/i);
  if (ide) features.ide = found(input, true, ide.start, ide.end);

  if (billingPeriod.status === 'found' && billingPeriod.value === 'year') {
    features.annualBilling = found(input, true, billingPeriod.evidence.start, billingPeriod.evidence.end);
  } else {
    const annual = firstMatch(input, /\bannual\s+plan\b|\bbilled\s+(?:annually|yearly)\b|\bannually\b|\/\s?(?:year|yr)\b/i);
    if (annual) features.annualBilling = found(input, true, annual.start, annual.end);
  }

  if (billingPeriod.status === 'found' && billingPeriod.value === 'month') {
    const anytime = firstMatch(input, /\bcancel\s+(?:any\s*time|at\s+any\s+time)\b/i);
    if (anytime) features.monthlyCancel = found(input, true, anytime.start, anytime.end);
  }

  return {
    trialDays,
    price,
    billingPeriod,
    autoRenew,
    cancellation,
    refund,
    features,
    pressureCues: parsePressureCues(input),
  };
}
