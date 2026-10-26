import type { Alternative } from '../types/alternatives';
import type { Field, OfferTerms } from '../types/terms';
import { FEATURE_KEYS, FEATURE_LABELS } from '../types/terms';

export type UnknownItem = {
  /** Which option the gap affects, e.g. "Your offer" or "GitHub Copilot Pro". */
  option: string;
  /** The missing fact, e.g. "Refund policy". */
  fact: string;
  /** Why it is unknown. */
  detail: string;
  sourceUrl?: string;
  /** Second official source when two sources conflict. */
  conflictUrl?: string;
};

export const USER_OFFER_LABEL = 'Your offer';
export const NOT_STATED = 'Not stated in the pasted text';
export const NOT_VERIFIED = 'Not verified on official pages';
export const SOURCES_CONFLICT = 'Official sources conflict';

const OFFER_FIELDS: { key: Exclude<keyof OfferTerms, 'features' | 'pressureCues'>; fact: string }[] = [
  { key: 'price', fact: 'Price' },
  { key: 'billingPeriod', fact: 'Billing period' },
  { key: 'trialDays', fact: 'Free trial' },
  { key: 'autoRenew', fact: 'Auto-renewal' },
  { key: 'cancellation', fact: 'Cancellation terms' },
  { key: 'refund', fact: 'Refund policy' },
];

export function alternativeLabel(a: Alternative): string {
  return `${a.provider} ${a.plan}`;
}

/**
 * Every fact that is not stated (your offer) or not verified (catalog plans).
 * Only gaps are listed: anything found in the text or verified on an official page is never included.
 * Pass `terms = null` before analysis to list catalog gaps only.
 */
export function collectUnknowns(terms: OfferTerms | null, alternatives: Alternative[]): UnknownItem[] {
  const items: UnknownItem[] = [];

  if (terms) {
    for (const { key, fact } of OFFER_FIELDS) {
      if ((terms[key] as Field<unknown>).status === 'not_found') {
        items.push({ option: USER_OFFER_LABEL, fact, detail: NOT_STATED });
      }
    }
    for (const k of FEATURE_KEYS) {
      if (terms.features[k].status === 'not_found') {
        items.push({ option: USER_OFFER_LABEL, fact: FEATURE_LABELS[k], detail: NOT_STATED });
      }
    }
  }

  for (const a of alternatives) {
    const option = alternativeLabel(a);
    const gap = (fact: string) => items.push({ option, fact, detail: NOT_VERIFIED, sourceUrl: a.officialUrl });
    if (a.prices.length === 0) gap('Price');
    if (a.trial === 'unknown') gap('Free trial');
    if (a.autoRenew === 'unknown') gap('Auto-renewal');
    if (a.cancellation === 'unknown') gap('Cancellation terms');
    if (a.refund === 'unknown') {
      gap('Refund policy');
    } else if (a.refund.conflict) {
      items.push({
        option,
        fact: 'Refund policy',
        detail: SOURCES_CONFLICT,
        sourceUrl: a.refund.sourceUrl,
        conflictUrl: a.refund.conflict.sourceUrl,
      });
    }
    for (const k of FEATURE_KEYS) {
      if (a.features[k].status === 'unverified') gap(FEATURE_LABELS[k]);
    }
  }

  return items;
}

/** Groups items by option, preserving first-seen order. */
export function groupUnknowns(items: UnknownItem[]): { option: string; items: UnknownItem[] }[] {
  const groups = new Map<string, UnknownItem[]>();
  for (const it of items) {
    const list = groups.get(it.option) ?? [];
    list.push(it);
    groups.set(it.option, list);
  }
  return [...groups.entries()].map(([option, list]) => ({ option, items: list }));
}

/** Deterministic, copyable question to ask the provider about an unknown. */
export function questionFor(item: UnknownItem): string {
  const plan = item.option === USER_OFFER_LABEL ? 'this plan' : item.option;
  if (item.detail === SOURCES_CONFLICT) {
    return `Your terms and help docs disagree on refunds for ${plan} — which applies to me?`;
  }
  switch (item.fact) {
    case 'Refund policy':
      return `If I cancel ${plan}, can I get a refund — and within how many days?`;
    case 'Free trial':
      return `Is there a free trial for ${plan}, and does it convert to a paid plan automatically?`;
    case 'Auto-renewal':
      return `Does ${plan} renew automatically, and how far in advance do you remind me?`;
    case 'Cancellation terms':
      return `How do I cancel ${plan}, and does access continue until the end of the billing period?`;
    case 'Price':
      return `What is the exact price, billing period and currency for ${plan}, including taxes?`;
    case 'Billing period':
      return `Is ${plan} billed monthly or yearly, and on what date is the first charge?`;
    case 'IDE integration':
      return `Does ${plan} include IDE/editor integration (e.g. VS Code, JetBrains)?`;
    case 'Annual billing':
      return `Can I pay for ${plan} annually, and at what price?`;
    case 'Cancel-anytime monthly':
      return `Can I pay for ${plan} monthly and cancel at any time?`;
    default:
      return `Can you confirm the ${item.fact.toLowerCase()} for ${plan} in writing?`;
  }
}
