import type { Alternative } from '../types/alternatives';

/**
 * Curated catalog of comparable plans (AI coding assistants, individual developer).
 * Every stored fact was confirmed verbatim on an official provider page on 2026-10-26
 * (raw HTML downloaded with curl, tags stripped, exact phrase matched). Full audit trail,
 * including check times, lives in docs/sources.md.
 *
 * Rules: a feature is 'yes'/'no' only with a verbatim quote; otherwise 'unverified'.
 * Terms without a verbatim quote are 'unknown'. Conflicting official sources are kept
 * side by side (`conflict`). Quotes are trimmed to <= 25 words.
 */
export const CATALOG_VERIFIED_AT = '2026-10-26';

const GH_PLANS = 'https://github.com/features/copilot/plans';
const GH_BILLING = 'https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing';
const GH_CHANGE = 'https://docs.github.com/en/copilot/how-tos/manage-your-account/view-and-change-your-copilot-plan';

const CLAUDE_PRICING = 'https://claude.com/pricing';
const CLAUDE_CANCEL = 'https://support.claude.com/en/articles/8325617-cancel-your-pro-or-max-subscription';
const CLAUDE_REFUND = 'https://support.claude.com/en/articles/12386328-request-a-refund-for-a-paid-claude-plan';
const CLAUDE_CODE_PLAN = 'https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan';

const DEVIN_PRICING = 'https://devin.ai/pricing';
const DEVIN_USAGE = 'https://docs.devin.ai/desktop/accounts/usage';
const COGNITION_TERMS = 'https://cognition.com/legal/platform-terms-of-service';

export const ALTERNATIVES: Alternative[] = [
  {
    id: 'copilot-pro',
    provider: 'GitHub',
    plan: 'Copilot Pro',
    officialUrl: GH_PLANS,
    verifiedAt: CATALOG_VERIFIED_AT,
    prices: [
      {
        period: 'month',
        amountMinor: 1000,
        currency: 'USD',
        sourceUrl: GH_PLANS,
        quote: 'Pro $10 per month',
      },
    ],
    trial: 'unknown',
    autoRenew: {
      value: true,
      sourceUrl: GH_BILLING,
      quote:
        'your initial billing cycle will run from 3 September until and including 2 October, and then on the same days of subsequent months.',
    },
    cancellation: {
      value: 'Cancel anytime; the cancellation takes effect at the end of the current billing cycle.',
      sourceUrl: GH_BILLING,
      quote:
        'You can cancel your Copilot plan at any time. The cancellation will take effect at the end of your current billing cycle.',
    },
    refund: {
      value:
        'Only stated case: a prorated refund when a company (Business/Enterprise) seat replaces your personal plan. No general refund policy found.',
      sourceUrl: GH_BILLING,
      quote: "You will receive a prorated refund for any remaining portion of your personal plan's current billing cycle.",
    },
    features: {
      ide: {
        status: 'yes',
        sourceUrl: GH_PLANS,
        quote:
          'GitHub Copilot is available in multiple IDEs including Visual Studio Code, Visual Studio, JetBrains IDEs, XCode, Vim, Neovim, Zed, and Eclipse.',
      },
      // Official pages mention annual plans only as "(legacy)"; no annual price for new subscribers was found.
      annualBilling: { status: 'unverified' },
      monthlyCancel: {
        status: 'yes',
        sourceUrl: GH_CHANGE,
        quote:
          'You can cancel your Copilot plan at any time. You’ll retain access to your current features until your billing cycle ends.',
      },
    },
    caveats: [
      'GitHub docs mention annual Copilot plans only as "legacy"; no annual price for new subscribers was found.',
      'Usage beyond included AI credits is metered; the extra-usage budget is set in US dollars.',
      'No tax or regional pricing statement was found on the pages checked.',
    ],
  },
  {
    id: 'claude-pro',
    provider: 'Anthropic',
    plan: 'Claude Pro',
    officialUrl: CLAUDE_PRICING,
    verifiedAt: CATALOG_VERIFIED_AT,
    prices: [
      {
        period: 'month',
        amountMinor: 2000,
        currency: 'USD',
        sourceUrl: CLAUDE_PRICING,
        quote: '$20 if billed monthly.',
      },
      {
        period: 'year',
        amountMinor: 20000,
        currency: 'USD',
        sourceUrl: CLAUDE_PRICING,
        quote: '$17 Per month with annual subscription discount ($200 billed up front).',
        note: 'Billed $200 upfront once a year (about $16.67/mo; the page rounds this to $17/mo).',
      },
    ],
    trial: 'unknown',
    autoRenew: {
      value: true,
      sourceUrl: CLAUDE_PRICING,
      quote: 'To avoid the next charge, cancel at least 24 hours before your renewal date.',
    },
    cancellation: {
      value: 'Cancel anytime; the plan stays active until the end of the current billing period.',
      sourceUrl: CLAUDE_CANCEL,
      quote:
        'Your cancellation will take effect at the end of your current billing period and you can continue using your paid plan until then.',
    },
    refund: {
      value:
        'Non-refundable except as the Consumer Terms or law provide; in the EEA and UK, a prorated refund within 14 days of purchase.',
      sourceUrl: CLAUDE_REFUND,
      quote:
        'Except as expressly provided in our Consumer Terms of Service or where required by law, all payments are non-refundable.',
    },
    features: {
      ide: {
        status: 'yes',
        sourceUrl: CLAUDE_CODE_PLAN,
        quote:
          'Your Pro or Max plan also covers Claude Code in supported IDEs, including VS Code, Cursor and other VS Code forks, and JetBrains IDEs',
      },
      annualBilling: {
        status: 'yes',
        sourceUrl: CLAUDE_PRICING,
        quote: '$17 Per month with annual subscription discount ($200 billed up front).',
      },
      monthlyCancel: {
        status: 'yes',
        sourceUrl: CLAUDE_PRICING,
        quote: 'You can cancel anytime, and your plan stays active until the end of your current billing period.',
      },
    },
    caveats: [
      'Prices shown don’t include applicable tax (per the pricing page).',
      'EEA and UK: a refund is possible within 14 days of purchase, prorated according to use.',
      'Subscriptions bought through the App Store are refunded by Apple, not Anthropic.',
      'Annual option is $200 billed upfront; $17/mo is the advertised per-month equivalent.',
    ],
  },
  {
    id: 'devin-pro',
    provider: 'Cognition',
    plan: 'Devin (formerly Windsurf) Pro',
    officialUrl: DEVIN_PRICING,
    verifiedAt: CATALOG_VERIFIED_AT,
    prices: [
      {
        period: 'month',
        amountMinor: 2000,
        currency: 'USD',
        sourceUrl: DEVIN_PRICING,
        quote: 'Pro POPULAR $20 per month',
        note: 'Currency shown only as "$"; USD assumed.',
      },
    ],
    trial: {
      value: null,
      sourceUrl: DEVIN_USAGE,
      quote: 'Free trials of paid plans are not currently offered, and support cannot apply one to your account.',
    },
    autoRenew: {
      value: true,
      sourceUrl: COGNITION_TERMS,
      quote:
        'will automatically renew for successive periods of the same duration unless you cancel the Service or we terminate it.',
    },
    cancellation: {
      value: 'Cancel anytime; you keep access until the end of the current billing period, then move to Free.',
      sourceUrl: DEVIN_USAGE,
      quote:
        'Upon canceling, you’ll still have access to your plan’s features until the end of the current billing period.',
    },
    refund: {
      value: 'Terms of Service: all payments are non-refundable, except as the Terms provide or law requires.',
      sourceUrl: COGNITION_TERMS,
      quote: 'Except as expressly provided in these Terms or where required by law, all payments are non-refundable.',
      conflict: {
        value: 'Help docs: you can request a refund before using the subscription.',
        sourceUrl: DEVIN_USAGE,
        quote: 'you can request a refund before using the subscription if you change your mind.',
      },
    },
    features: {
      // Docs call Devin Desktop "an AI IDE", but no single official sentence ties the IDE to the Pro plan.
      ide: { status: 'unverified' },
      annualBilling: { status: 'unverified' },
      monthlyCancel: {
        status: 'yes',
        sourceUrl: DEVIN_USAGE,
        quote:
          'As a paid individual user, you can cancel your plan at any time by browsing to the app.devin.ai/settings/plans page.',
      },
    },
    caveats: [
      'windsurf.com/pricing now redirects to devin.ai/pricing; former Windsurf users may be on older terms.',
      'Terms of Service: fees and applicable taxes are charged to your payment method.',
      'Price is shown with "$" only; currency assumed to be USD.',
      'Official refund wording conflicts between the Terms of Service and the help docs.',
    ],
  },
];
