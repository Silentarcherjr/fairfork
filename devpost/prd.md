---
doc: prd
status: approved
---

# FairFork — Product Requirements

A single-page tool for an individual developer deciding whether to pay for an AI coding assistant: paste an offer, see its cited fine print and true cost over time, and compare it against verified real plans that re-rank when you mark what you need.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. **Arrive.** The page opens instantly — no login. Headline: "What are you really agreeing to?" The input box is pre-filled with a clearly labeled **fictional example** offer ("Example — fictional offer, not a real provider") so the demo works with one click.
2. **Analyze.** The user keeps the example or pastes their own offer text and clicks **Analyze offer**.
3. **See the fine print.** The pasted text is shown back with the detected terms highlighted (trial, price, billing period, auto-renewal, cancellation, refund, pressure phrases). Next to it, a terms card lists each field with its exact quote — or "Not found in the text".
4. **See the true cost.** A timeline shows the trial end / first charge date (from a visible start date the user can change) and every charge in the selected horizon; horizon buttons 1 / 3 / 6 / 12 months update the total.
5. **Compare.** A comparison board shows **"Your offer"** alongside 3 verified real plans (GitHub Copilot Pro, Claude Pro, Devin/Windsurf Pro), each with price, billing basis, cost over the same horizon, cancellation/refund terms, feature flags, official source link and "Verified on" date.
6. **Set what matters.** A preferences panel: monthly budget, plus must-have toggles — IDE integration, annual billing option, cancel-anytime monthly plan.
7. **Get the explained choice.** The board re-ranks: a **"Best fit"** badge on the top option with a plain-English reason ("Cheapest plan that meets: IDE integration, ≤ $15/mo"), options that fail a requirement show why, and options that can't be confirmed are listed separately.
8. **Success** = the user can say what the offer will really cost, what's unknown, and which option fits their needs and why.

## Screens and Layout
One page, top to bottom (no navigation, no other screens):
- **Header + input:** headline, offer textarea, start-date field, "Analyze offer", "Clear".
- **Desktop (wide):** left column = original text with highlights + terms card; right column = cost timeline. Below, full width = comparison board with the preferences panel above it.
- **Mobile (≥ 360 px):** order is true cost → terms/fine print → alternatives + preferences → sources. No horizontal scrolling.
- **Footer:** "About the data" — catalog is curated (not live search), dates of verification, prices may vary by country/taxes, not financial or legal advice.

## Look and Feel
Source: learner brief (carried forward; not re-asked).
- "Editorial decision lab": light paper-like background with deep black text.
- **Coral** = pressure cues and money leaving your pocket; **petrol green** = neutral / better-fit alternative.
- Editorial typography (a serif with character for headlines, clean sans for data); quotes from the offer shown as clipped "evidence" snippets.
- Quick, sober transitions. No fake charts, no generic dashboard template, no stock AI-gradient look.
- High contrast, keyboard-usable controls.

## Features and Behavior

### Fine-print extraction
Source: `scope.md > The POC Boundary`.
Detects, from the pasted text only: trial length, price, currency, billing period (month/year), auto-renewal, cancellation statement, refund statement, pressure phrases (scarcity / urgency such as "Only 3 spots left", "today only").
- [ ] Every detected value shows the exact quote, and that quote is highlighted in the original text.
- [ ] Anything not present shows "Not found in the text" — never a default (no assumed 7 days, no $0).
- [ ] Pressure phrases are labeled "Potential pressure cue — not verified", never "lie" or "scam".
- [ ] Text with no pressure phrases shows none (no invented findings).
- [ ] Pasted HTML/script appears as plain inert text.

### Screenshot import (beta)
Source: learner request at the build checkpoint — copy-pasting offers is friction.
- [ ] Next to the text box, "Import from screenshot (beta)" accepts an image file; text is read in the browser and the image is never uploaded anywhere.
- [ ] While reading, progress is shown; the result **fills the text box only** — it is not analyzed automatically.
- [ ] A notice says "Text read from an image — check it against the screenshot before analyzing; OCR can misread." The example label disappears.
- [ ] If reading fails or finds no text, a calm error appears and the existing text is untouched.

### True cost timeline
Source: `scope.md > What "Working" Looks Like`.
- [ ] With "7-day trial, then $19.99/month, renews automatically" and start date D, the first charge is shown on D + 7 days, labeled with the assumption ("assuming you don't cancel").
- [ ] Horizon 1/3/6/12 months lists each charge date and the total; switching horizon updates instantly.
- [ ] Changing the price in the text to $29.99 and re-analyzing changes every total.
- [ ] Unknown price → cost shows "Unknown — price not found", not $0.
- [ ] Month-end start dates (e.g. Jan 31) produce sensible charge dates.

### Verified alternatives catalog
Source: `scope.md > The POC Boundary`, `scope.md > Explicitly Cut`.
- [ ] Shows 3 real plans: GitHub Copilot Pro, Claude Pro, Devin/Windsurf Pro — each with official URL (clickable) and "Verified on 2026-10-26".
- [ ] Each feature is shown as ✓ verified, ✕ verified absent, or **? Not verified** — three distinct looks.
- [ ] Annual pricing shows both "billed $X upfront" and its per-month equivalent, never mixed with a monthly price unlabeled.
- [ ] Section is labeled "Curated catalog, verified on [date]" — never "live".
- [ ] Conflicting official sources (e.g. refund terms) are shown as "Conflicting sources" with both links.

### Preferences and explained ranking
Source: `scope.md > The Core Loop`.
- [ ] Inputs: monthly budget; must-haves: IDE integration, annual billing option, cancel-anytime monthly.
- [ ] Ranking = among options that meet every must-have with **verified** evidence and fit the budget, lowest cost over the selected horizon wins; ties go to fewer unknowns.
- [ ] Options that **verifiably fail** a must-have are moved to "Doesn't meet your needs" with the reason.
- [ ] Options whose must-have is **not verified** go to "Can't confirm" with "We couldn't verify [feature]" — below verified matches, never the winner.
- [ ] If no option qualifies: "No option meets all your requirements" + which requirement eliminated each one. No fictional winner.
- [ ] Toggling one must-have visibly changes the winner in the demo (e.g. annual billing → Claude Pro; IDE integration → Copilot Pro).
- [ ] "Your offer" participates in the ranking using only what its own text says; its other features are "Not verified (not stated in the pasted text)".

## States and Boundaries
- **First use:** example offer pre-filled and labeled fictional; results area invites "Analyze offer".
- **Empty input:** "Paste an offer to analyze" — button does nothing harmful.
- **Nothing recognizable:** terms card all "Not found", cost "Unknown", alternatives still visible for comparison.
- **No qualifying option:** explicit "No option meets all your requirements" message.
- **Persistence:** nothing is saved; refreshing clears the text. "Clear" empties it immediately.
- **Boundary:** analysis is "according to the pasted text"; FairFork never claims how a service actually behaves beyond its evidence.

## Product Decisions
- Compare **Copilot Pro, Claude Pro, Devin/Windsurf Pro** — the three plans whose terms were verifiable on official pages (learner adopted the agent's recommendation). ChatGPT Plus, JetBrains AI and Cursor excluded: pages unreadable or no comparable plan.
- Must-haves: **budget, IDE integration, annual billing, cancel-anytime monthly** (learner adopted recommendation to add annual billing for a meaningful ranking flip).
- **"Not verified" ≠ "doesn't have it"**: unverified options are kept in a separate "Can't confirm" group, never excluded silently and never crowned (learner adopted recommendation).
- **The pasted offer competes in the ranking** as "Your offer", judged only by its own text (learner adopted recommendation), so the board answers "should I switch?".
- Visual direction carried forward from the learner's brief.
- **Screenshot import added as beta** after trying the app ("agrega, nada perdemos"), accepting the agent's caveat: it only fills the text box for review, so the cited-quote guarantee still applies to the text the user confirms.

## What We're Building
Everything under Features and Behavior and States and Boundaries above: pasted-text input with fictional example, cited extraction, cost timeline with horizons, 3-plan verified catalog, preferences + explained ranking, responsive single page, no login.

## Deferred From the POC
- URL input (needs a safe server fetch; SSRF risk) — later.
- AI-assisted extraction (needs a server-side key; rules-based is enough to prove the kernel) — later.
- "As advertised vs what it means" fair rewrite and export/copy summary — nice, not needed to prove the kernel.

## Possible Later Enhancements
More providers and currencies; term-change alerts; browser extension; history of analyzed offers.

## Non-Goals
- Live web search or price scraping — can't be reliable/safe today; never claim "live".
- Analyzing any contract or any product category — comparisons only make sense within one niche.
- Accounts, payments, storing user text — not needed; adds risk.
- Legal/financial verdicts — evidence and tradeoffs only.

## Open Questions
- Exact feature evidence for each catalog plan must be re-checked in a real browser before it's marked ✓ (research quotes passed through a summarizer). Can be done during build; blocks nothing in spec.
