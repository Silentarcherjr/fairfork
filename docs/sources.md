# Catalog sources

Every fact in `src/data/alternatives.ts` was checked on **2026-10-26**. For each official page, the raw HTML was downloaded with `curl -sL -A "Mozilla/5.0 …"`. Script and style blocks and tags were stripped, and the stored quote was matched **verbatim** against the page text. The match ignored whitespace only, because tag stripping inserts spaces (for example `( $200` becomes `($200`). A script re-checked every stored quote against the downloaded text, and all of them matched. Times are UTC.

A fact with no verbatim quote on an official page is stored as `unverified` (features) or `unknown` (terms). It is never guessed. The catalog is curated, not live: prices and terms can change after the date checked.

## GitHub Copilot Pro

| Fact | Value | URL | Verbatim quote | Checked at (UTC) | Method |
|---|---|---|---|---|---|
| Price (monthly) | $10/mo | https://github.com/features/copilot/plans | "Pro $10 per month" | 2026-10-26 16:16:53 | curl + grep |
| Price currency | USD | https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing | "Copilot Pro $10 USD" (table row) | 2026-10-26 16:16:54 | curl + grep |
| Trial | unknown | https://github.com/github-copilot/pro | Redirects to the GitHub sign-in page. No trial statement on the pages checked. | 2026-10-26 16:16:55 | curl |
| Auto-renew | yes (recurring monthly cycles) | https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing | "your initial billing cycle will run from 3 September until and including 2 October, and then on the same days of subsequent months." | 2026-10-26 16:16:54 | curl + grep |
| Cancellation | Anytime; takes effect at end of billing cycle | https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing | "You can cancel your Copilot plan at any time. The cancellation will take effect at the end of your current billing cycle." | 2026-10-26 16:16:54 | curl + grep |
| Refund | Only a specific case is stated: a prorated refund when a company seat replaces your personal plan | https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing | "You will receive a prorated refund for any remaining portion of your personal plan's current billing cycle." | 2026-10-26 16:16:54 | curl + grep |
| Feature: IDE | yes | https://github.com/features/copilot/plans | "GitHub Copilot is available in multiple IDEs including Visual Studio Code, Visual Studio, JetBrains IDEs, XCode, Vim, Neovim, Zed, and Eclipse." | 2026-10-26 16:16:53 | curl + grep |
| Feature: annual billing | unverified | (plans page and billing docs) | No annual price for new subscribers. The docs nav lists only "Model multipliers for annual plans (legacy)". | 2026-10-26 16:16:54 | curl + grep |
| Feature: cancel-anytime monthly | yes | https://docs.github.com/en/copilot/how-tos/manage-your-account/view-and-change-your-copilot-plan | "You can cancel your Copilot plan at any time. You’ll retain access to your current features until your billing cycle ends." | 2026-10-26 16:16:55 | curl + grep |
| Taxes / regional | none found | (all pages above) | No tax or regional statement. The extra-usage budget "is set in US dollars". | 2026-10-26 16:16:54 | curl + grep |

## Claude Pro (Anthropic)

| Fact | Value | URL | Verbatim quote | Checked at (UTC) | Method |
|---|---|---|---|---|---|
| Price (monthly option) | $20/mo | https://claude.com/pricing | "$20 if billed monthly." | 2026-10-26 16:16:56 | curl + grep |
| Price (annual option) | $200/yr billed upfront (about $16.67/mo; advertised as $17) | https://claude.com/pricing | "$17 Per month with annual subscription discount ($200 billed up front)." | 2026-10-26 16:16:56 | curl + grep |
| Trial | unknown | https://claude.com/pricing | The only "Trials" row is in the Team/Enterprise table ("Trials No No Yes"). Nothing is stated for Pro. | 2026-10-26 16:16:56 | curl + grep |
| Auto-renew | yes | https://claude.com/pricing | "To avoid the next charge, cancel at least 24 hours before your renewal date." | 2026-10-26 16:16:56 | curl + grep |
| Cancellation | Anytime; active until end of billing period | https://support.claude.com/en/articles/8325617-cancel-your-pro-or-max-subscription | "Your cancellation will take effect at the end of your current billing period and you can continue using your paid plan until then." | 2026-10-26 16:16:57 | curl + grep |
| Refund | Non-refundable except per Terms or law; EEA/UK 14 days, prorated | https://support.claude.com/en/articles/12386328-request-a-refund-for-a-paid-claude-plan | "Except as expressly provided in our Consumer Terms of Service or where required by law, all payments are non-refundable." | 2026-10-26 16:16:57 | curl + grep |
| Refund (EEA/UK, caveat) | 14-day prorated refund | https://support.claude.com/en/articles/12386328-request-a-refund-for-a-paid-claude-plan | "In the European Economic Area and the United Kingdom, you may receive a refund within 14 days of purchase." | 2026-10-26 16:16:57 | curl + grep |
| Refund (consistent second source) | — | https://claude.com/pricing | "Payments are generally non-refundable, except where our Consumer Terms of Service say otherwise or where local law requires it." This agrees with the support page, so there is no conflict. | 2026-10-26 16:16:56 | curl + grep |
| Feature: IDE | yes | https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan | "Your Pro or Max plan also covers Claude Code in supported IDEs, including VS Code, Cursor and other VS Code forks, and JetBrains IDEs" | 2026-10-26 16:17:51 | curl + grep |
| Feature: annual billing | yes | https://claude.com/pricing | "$17 Per month with annual subscription discount ($200 billed up front)." (The comparison table also lists "Billing cycle … Monthly and annual" for Pro.) | 2026-10-26 16:16:56 | curl + grep |
| Feature: cancel-anytime monthly | yes | https://claude.com/pricing | "You can cancel anytime, and your plan stays active until the end of your current billing period." | 2026-10-26 16:16:56 | curl + grep |
| Taxes | excluded from prices | https://claude.com/pricing | "Prices shown don’t include applicable tax." | 2026-10-26 16:16:56 | curl + grep |

## Devin (formerly Windsurf) Pro (Cognition)

`https://windsurf.com/pricing` returns HTTP 308 to `https://devin.ai/pricing` (checked 2026-10-26 16:18 UTC).

| Fact | Value | URL | Verbatim quote | Checked at (UTC) | Method |
|---|---|---|---|---|---|
| Price (monthly) | $20/mo (shown with "$" only; USD assumed) | https://devin.ai/pricing | "Pro POPULAR $20 per month" | 2026-10-26 16:16:59 | curl + grep |
| Trial | none (verified) | https://docs.devin.ai/desktop/accounts/usage | "Free trials of paid plans are not currently offered, and support cannot apply one to your account." | 2026-10-26 16:16:59 | curl + grep |
| Auto-renew | yes | https://cognition.com/legal/platform-terms-of-service | "will automatically renew for successive periods of the same duration unless you cancel the Service or we terminate it." (§7.1) | 2026-10-26 16:17:00 | curl + grep |
| Cancellation | Anytime; access until end of billing period, then Free | https://docs.devin.ai/desktop/accounts/usage | "Upon canceling, you’ll still have access to your plan’s features until the end of the current billing period." | 2026-10-26 16:16:59 | curl + grep |
| Refund (source A) | Non-refundable | https://cognition.com/legal/platform-terms-of-service | "Except as expressly provided in these Terms or where required by law, all payments are non-refundable." (§5.3) | 2026-10-26 16:17:00 | curl + grep |
| Refund (source B, **conflict**) | Refund before use | https://docs.devin.ai/desktop/accounts/usage | "you can request a refund before using the subscription if you change your mind." | 2026-10-26 16:16:59 | curl + grep |
| Feature: IDE | unverified | https://docs.devin.ai/desktop/introducing-devin-desktop | The docs say "Devin Desktop is an AI IDE with Devin built in", but no single official sentence ties the IDE to the Pro plan. The pricing compare table uses icons only. | 2026-10-26 16:18:22 | curl + grep |
| Feature: annual billing | unverified | https://devin.ai/pricing | No annual price or yearly billing mentioned. | 2026-10-26 16:16:59 | curl + grep |
| Feature: cancel-anytime monthly | yes | https://docs.devin.ai/desktop/accounts/usage | "As a paid individual user, you can cancel your plan at any time by browsing to the app.devin.ai/settings/plans page." | 2026-10-26 16:16:59 | curl + grep |
| Taxes | charged on top | https://cognition.com/legal/platform-terms-of-service | "we may charge these fees and applicable taxes to the Payment Method on a periodic basis." | 2026-10-26 16:17:00 | curl + grep |

## Not used

ChatGPT Plus, JetBrains AI and Cursor were left out (see `devpost/prd.md > Product Decisions`). Their pages were unreadable, or they had no comparable plan.
