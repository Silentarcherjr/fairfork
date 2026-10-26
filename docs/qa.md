# FairFork — QA matrix (adversarial QA and final verification)

## Final verification — 2026-10-26

- **226 automated tests passed** according to the final development checklist. The latest GitHub Actions run also completed `npm test` and `npm run build` successfully.
- The initial adversarial QA pass, preserved below for traceability, reported 125 passed and 2 todo **at that time**, before fixes and additional tests.
- **Fixed:** BUG-1 (pressure-cue false positives), BUG-2 (monthly equivalent billed annually), PERF-1 (long-input performance), and O-1 (unverifiable cost cannot be Best fit).
- **Known limitation:** BUG-3 (introductory prices) remains unsupported and is disclosed in the README.
- Later real-browser mobile, keyboard, desktop, and visual checks passed, as recorded in the **Manual browser checks** section.

## Initial adversarial QA snapshot (historical)

Original run on 2026-10-26: `npm test` → **6 files, 125 passed, 2 todo at the time**; `npm run build` green.
New files: `tests/adversarial.test.ts` (unit + seeded fuzz), `tests/ui.test.tsx` (rendered `<App />`).
Abbreviations: **ADV** = `tests/adversarial.test.ts`, **UI** = `tests/ui.test.tsx`; existing suites by file name.

## Acceptance criteria (devpost/prd.md)

### Fine-print extraction
| PRD criterion | Test file / name | Result |
|---|---|---|
| Every detected value shows the exact quote, highlighted in the original text | UI › "every rendered <mark> text exists literally in the input, and each found term quote is highlighted"; ADV › fuzz "every evidence slice equals its quote…", "rendered highlights: every <mark> is a literal slice…"; parseOffer.test › "every evidence slice equals its quote" | pass |
| Anything not present shows "Not found in the text" — no assumed 7 days, no $0 | UI › "nothing recognizable…", "no trial → no 7-day default…", "no price → Unknown…never $0.00"; ADV › "PRD: missing values are never defaulted" | pass |
| Pressure phrases labeled "Potential pressure cue — not verified", never "lie"/"scam" | UI › "\"only 3 left\" is labeled as an unverified pressure cue; no lie/scam/fraud anywhere"; ADV › "\"only 3 left\" is a scarcity cue with exact offsets" | pass |
| Text with no pressure phrases shows none (no invented findings) | UI › "neutral text → No pressure cues detected"; ADV › "neutral text has no pressure cues" (4 cases) | initially failed for edge cases; **BUG-1 fixed** later (see **Fix status**) |
| Pasted HTML/script appears as plain inert text | UI › "pasted HTML/script is rendered as inert text: no img/script elements are created"; ADV › fuzz render (includes `<script>`/`<img onerror>` tokens) | pass |

### True cost timeline
| PRD criterion | Test file / name | Result |
|---|---|---|
| 7-day trial, $19.99/month, renews → first charge D+7, labeled "assuming you don't cancel" | UI › "7-day trial, $19.99/month, renews → first charge Nov 8 with the explicit assumption"; ADV › "first charge is start + 7 days…" | pass |
| Horizon 1/3/6/12 lists each charge and total; switching updates instantly | UI › "horizon buttons update the total and charge list instantly, with aria-pressed"; billing.test › horizon cases | pass |
| $29.99 + re-analyze changes every total | UI › "changing $19.99 → $29.99 and re-analyzing changes every total (cost + Your offer card)" | pass |
| Unknown price → "Unknown — price not found", not $0 | UI › "no price → …never $0.00 in the cost section or Your offer card" | pass |
| Month-end start dates produce sensible charge dates | ADV › "month-end start (Jan 31, leap year)…"; billing.test › "month-end start without trial clamps to month end" | pass |

### Verified alternatives catalog
| PRD criterion | Test file / name | Result |
|---|---|---|
| 3 real plans, each with clickable official URL and "Verified on 2026-10-26" | UI › "every catalog card links to an https official page and shows Verified on"; catalog.test | pass |
| Features ✓ verified / ✕ verified absent / ? Not verified — three distinct looks | UI › "features use three distinct looks…" (distinct classes `feat--yes/no/unverified`) | pass (DOM); visual distinctness: **manual — pending orchestrator browser check** |
| Annual pricing shows "billed $X upfront" + labeled per-month equivalent | UI › "annual price shows upfront and a labeled per-month equivalent", "a yearly offer is labeled as annual upfront" | pass |
| Section labeled "Curated catalog, verified on [date]" — never "live" | UI › "labels the section Curated catalog… and never claims live" (only "not a live search" allowed) | pass |
| Conflicting official sources shown as "Conflicting sources" with both links | UI › "conflicting official refund sources are shown with both links"; catalog.test › Devin refund | pass |

### Preferences and explained ranking
| PRD criterion | Test file / name | Result |
|---|---|---|
| Inputs: monthly budget; must-haves IDE / annual / cancel-anytime monthly | UI › "toggling must-haves…", "impossible budget ($1)…", "every form control has an accessible name" | pass |
| Ranking: verified must-haves + budget, lowest horizon cost wins; ties → fewer unknowns | ranking.test › "breaks cost ties by fewer unverified features…", "with no preferences, the cheapest…" | pass — see **O-1** |
| Verifiable failures → "Doesn't meet your needs" with reason | ranking.test › "requiring annual billing…excludes monthly ones with reasons"; UI › "impossible budget" (every card has a reason) | pass |
| Not-verified must-have → "Can't confirm" / "We couldn't verify [feature]", never winner | UI › "toggling must-haves…" (Devin IDE); ADV › "an option with an unverified must-have is never bestFit"; ranking.test | pass |
| No qualifying option → "No option meets all your requirements", no fictional winner | UI › "impossible budget ($1) → … no Best fit badge"; ADV › "impossible budget ($1) → noneQualifies…" | pass |
| Toggling one must-have changes winner (annual → Claude Pro; IDE → Copilot Pro) | UI › "toggling must-haves changes the Best fit…"; ADV › "annual billing → Claude Pro annual; IDE → Copilot Pro" | pass |
| "Your offer" ranks on its own text; other features "Not verified (not stated in the pasted text)" | UI › "features use three distinct looks; your offer says not stated in the pasted text"; UI › EUR offer → Can't confirm; ADV › currency tests | pass |

### States and Boundaries, layout, look
| PRD item | Test file / name | Result |
|---|---|---|
| First use: example pre-filled + labeled fictional; results invite "Analyze offer" | UI › "shows the headline, the fictional-example label…" | pass |
| Empty input: "Paste an offer to analyze", button harmless | UI › "empty / whitespace input…" | pass |
| Nothing recognizable: all Not found, cost Unknown, alternatives visible | UI › "nothing recognizable…" | pass |
| Persistence: nothing saved; Clear empties immediately | UI › "Clear empties the text and results immediately" (refresh-clears: no storage APIs used — code review) | pass |
| No login / works offline | UI › "renders, analyzes and re-ranks with no network calls and no sign-in" (fetch + XHR spied) | pass |
| Keyboard-usable controls | UI › "every element with a React event handler is a native control or focusable", "horizon buttons expose aria-pressed" | pass (static DOM); real Tab order/focus ring: **manual — pending orchestrator browser check** |
| Mobile ≥ 360 px: order true cost → fine print → alternatives → sources; no horizontal scroll | — | **manual — pending orchestrator browser check** |
| Desktop two-column layout | — | **manual — pending orchestrator browser check** |
| Look & feel (editorial, coral/petrol, high contrast, sober transitions) | — | **manual — pending orchestrator browser check** |

### spec.md "Important Failure Modes"
| Failure mode | Test | Result |
|---|---|---|
| Unrecognized phrasing → Not found / Unknown, alternatives visible | UI › "nothing recognizable…" | pass |
| Unverifiable catalog fact → Can't confirm when it matters | UI › Devin IDE "We couldn't verify IDE integration" | pass |
| No option meets requirements | UI/ADV › impossible budget | pass |
| Malicious pasted HTML inert | UI › inert HTML test; ADV › fuzz render | pass |
| Non-USD marked not comparable | UI › "€9/month … Can't confirm"; ADV › EUR ranking tests | pass |

### Fuzz
ADV › "fuzz: parseOffer on ~200 seeded random/garbage strings" (seed 20261026, 210 inputs: random chars incl. emoji/NBSP/zero-width, keyword soup, mutated examples): never throws; all evidence offsets in bounds and `text.slice(start,end) === quote`; trial positive integer; cents non-negative integers; known currency; cues sorted and non-overlapping; timeline total = sum of charges for every horizon; rendered `<mark>`s are literal slices and the evidence body text equals the input exactly. **All pass.**

## Original bugs and observations (historical)

These findings describe the initial QA state, not the final one. Refer to **Fix status** below.

**BUG-1 — pressure-cue false positives on neutral text** (`src/lib/parseOffer.ts`, `SCARCITY_RES[0]` and `URGENCY_RES` `/\bhurry\b/`). Violates "Text with no pressure phrases shows none".
- Input `The plan includes only 2 seats per account.` → expected no cues; actual scarcity cue `"only 2 seats"`.
- Input `No hurry — take your time. $10/month` → expected no cues; actual urgency cue `"hurry"`.
- Severity: low–medium (label is hedged "not verified", but it is an invented finding). Suggested fix: require `left|remaining` after the seat noun for the "only N" rule; skip `hurry` when preceded by `no`.

**BUG-2 — "billed annually" next to a per-month price is read as monthly billing** (`parseOffer.ts`, tied period wins over a contradicting "billed annually").
- Input `Save 20% — $16/month billed annually ($192/year)` → expected yearly billing (one $192 upfront charge, or at least flagged); actual `billingPeriod = month` (quote "/month"), timeline = 12 monthly $16 charges, while `features.annualBilling = yes` from the same text. Same for `$19.99/month billed annually` (12 × $19.99 monthly).
- The 12-month total happens to match, but the charge schedule and 1/3/6-month totals are wrong (e.g. 1 month shows $16 instead of $192 upfront). Severity: medium (common real-world phrasing).

**BUG-3 (limitation) — introductory price ignored without an assumption.** Input `first month $1, then $20/month` → first charge $20 on the start date; the $1 intro charge is dropped, no assumption shown. Severity: low.

**PERF-1 — quadratic regex on long digit runs** (`MONEY_RE` third alternative). `parseOffer('1'.repeat(50000))` takes ≈3.6 s (main thread freezes); `'cancel '.repeat(20000)` ≈0.8 s. Realistic 100 KB ToS text parses in ~2 ms (tested). Severity: low.

**O-1 (design question) — unknown-cost "Your offer" can be crowned Best fit.** Input `Works in VS Code. Annual plan available. Monthly billing — cancel anytime.` with all three must-haves and no budget → Best fit = "Your offer" with cost Unknown; reason reads "Listed first over 12 months; its cost could not be compared…". It is honestly labeled, but the PRD rule is "lowest cost … wins"; consider sending unknown-cost options to "Can't confirm" whenever they would be the winner. Documented by ADV test.

## Initial coverage gaps (later manual checks below)
- Visual/layout criteria (360 px no horizontal scroll, mobile order, desktop columns, three feature looks visually distinct, contrast, focus ring) need a real browser — pending orchestrator check.
- jsdom can't test real keyboard Tab order or `<details>` toggling by keyboard; checked statically only.
- "Refreshing clears the text" verified by code review (no localStorage/sessionStorage usage), not by a reload test.
- Start-date picker edge: clearing the date falls back to today (code review only).

## Fix status (orchestrator, after QA)

| Finding | Status | Evidence |
|---|---|---|
| BUG-1 false pressure cues ("only 2 seats per account", "No hurry") | Fixed in `src/lib/parseOffer.ts` (scarcity needs "left/remaining"; "no/any hurry" excluded) | `tests/adversarial.test.ts` › BUG-1 fixed |
| BUG-2 "$16/month billed annually" read as monthly | Fixed: uses the stated yearly total, else 12 × monthly quoting "…/month billed annually" | `tests/adversarial.test.ts` › BUG-2 fixed |
| BUG-3 introductory prices ("first month $1, then $20/month") | Not fixed — documented limitation in README | — |
| PERF-1 quadratic regex on huge input | Fixed: number-boundary lookbehind + input capped at 20,000 chars (textarea `maxLength`) | `tests/adversarial.test.ts` › PERF-1 fixed |
| O-1 unknown-cost offer crowned Best fit | Fixed in `src/lib/ranking.ts`: unknown or non-USD cost → "Can't confirm" ("Cost not comparable") | `tests/adversarial.test.ts` › O-1 fixed |

## Manual browser checks (orchestrator, 2026-10-26, built-in browser, dev server)

| Check | Result |
|---|---|
| 360 × 780 viewport: `scrollWidth` 360 = `innerWidth` 360, no element overflows | Pass |
| Mobile order: The true cost → The fine print → What matters to you → Your offer vs. verified plans → About the data | Pass |
| Keyboard: Tab reaches controls; focused input shows 3 px petrol outline | Pass |
| Desktop: Analyze example → $239.88 / 12 months; "Annual billing" flips Best fit to Claude Pro annual | Pass |
| Three feature states visually distinct (✓ Yes solid, ✕ No struck, ? Not verified dashed) | Pass (screenshot) |

## Screenshot import (beta) — real-screenshot test (2026-10-26)

Real tesseract.js OCR on screenshots captured in the built-in browser, then `parseOffer`:

| Screenshot | OCR of the price | Parsed price / period | Notes |
|---|---|---|---|
| Synthetic offer (light background, 28 px Arial) | correct | $15.99 / month, 14-day trial, 2 cues → $191.88 over 12 months | "AI" misread as "Al" |
| GitHub Copilot plans — Pro card (dark) | "$1 0 usD" | **$10 / month** ✔ (after fixes) | split digits re-joined; "$15 monthly credits" no longer wins |
| GitHub Copilot plans — Free card (dark) | "$0" → "SO" | not found | nothing invented |
| Devin pricing — Pro card (light) | large "$20" not read | not found | OCR misses very large display digits |
| Claude pricing (Spanish locale) | "17 $" → "174%" | not found ✔ (was **$174** before the fix) | English OCR model; percentages never parsed as prices |

Fixes from this test: percentages are never prices; "credits" allowances are de-prioritized; "per user / month" counts as a period; OCR text re-joins split price digits. Result: no invented prices on any screenshot; large display prices on some pages are still missed. The feature stays labeled **beta** and never analyzes automatically.
