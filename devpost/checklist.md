---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

Parallelization: after slice 1 freezes the contracts in `src/types/*`, the work behind slices 2–4 is implemented in parallel by subagents with exclusive file ownership (A: `src/lib/parseOffer*`, `src/lib/billing*`, `src/lib/dates*`, `src/lib/money*`; B: `src/data/alternatives*`, `src/lib/ranking*`, `docs/sources*`; C: `src/components/*`, `src/styles/*`; D: `tests/*`, `docs/qa*`). The orchestrator owns `package.json`, config, `src/App*`, `src/main*`, README, git and `devpost/*`, integrates, verifies and commits slice by slice in this order.

## Slices

- [x] **1. Paste an offer and see its fine print highlighted with exact quotes**
  Becomes usable: The page opens with a labeled fictional offer; "Analyze offer" highlights trial, price, period, auto-renewal, cancellation/refund and pressure cues in the original text, with a terms card showing each quote or "Not found in the text".
  Why now: This is the first half of the kernel (cited fine print) and it bootstraps the project, the frozen data contracts and the look every later slice builds on.
  PRD ref: `prd.md > The Core Journey` (steps 1–3), `prd.md > Fine-print extraction`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Offer parser — src/lib/parseOffer.ts`, `spec.md > Data Model`, `spec.md > File Structure`, `spec.md > Look and Feel`
  Build: Scaffold Vite + React + TS + Vitest per the spec; write `src/types/*`; implement `parseOffer` with evidence offsets; `OfferInput`, `EvidenceText`, `TermsCard`, `PressureCues`; tokens and base styles; labeled example offer.
  Verify (mechanical): `npm test` passes parser tests (example offer extracts 7 days, $19.99, month, auto-renew, scarcity cue; every quote equals `text.slice(start,end)`; text without price/trial → `not_found`; text with no pressure phrases → none; `<script>` input stays inert); `npm run build` succeeds; dev server renders highlights in the browser.
  Learner check: Open the app, click "Analyze offer" on the example, then paste a different offer text; check that the highlighted words match the terms card and that missing items say "Not found in the text".
  Commit: `Add cited fine-print extraction with highlighted evidence`

- [x] **2. See the true cost over 1/3/6/12 months**
  Becomes usable: A timeline shows the first charge date (from an editable start date) and every charge plus the total for the chosen horizon, with assumptions written out; unknown price shows "Unknown".
  Why now: Turns the cited terms into the money consequence — the second step of the kernel — and the ranking in slice 3 needs these costs.
  PRD ref: `prd.md > True cost timeline`, `prd.md > The Core Journey` (step 4)
  Spec ref: `spec.md > Billing calculator — src/lib/billing.ts, src/lib/dates.ts`, `spec.md > Data Model`
  Build: `dates.ts`, `money.ts`, `calculateBillingTimeline`; `CostTimeline` with horizon buttons; wire start date and horizon in `App`.
  Verify (mechanical): `npm test` passes billing tests (7-day trial + $19.99/mo from 2026-10-26 → first charge 2026-11-02, 12-month total $239.88; $29.99 changes totals; month-end start Jan 31 clamps correctly; yearly period; no price → unknown; autoRenew false → one charge); browser shows totals updating when switching horizon.
  Learner check: Change the start date and switch between 1, 3, 6 and 12 months; edit the price in the text to $29.99, re-analyze, and confirm the totals change.
  Commit: `Add billing timeline and horizon cost`

- [x] **3. Compare with verified real plans and watch the best fit change**
  Becomes usable: A comparison board shows "Your offer" plus Copilot Pro, Claude Pro (monthly and annual) and Devin/Windsurf Pro with source links and "Verified on" dates; budget and must-haves (IDE integration, annual billing, cancel-anytime monthly) re-rank into Best fit / Can't confirm / Doesn't meet your needs with reasons.
  Why now: This is the distinctive part of the kernel (verified alternatives + explained choice); it needs slices 1–2's terms and costs.
  PRD ref: `prd.md > Verified alternatives catalog`, `prd.md > Preferences and explained ranking`, `prd.md > The Core Journey` (steps 5–7)
  Spec ref: `spec.md > Alternatives catalog — src/data/alternatives.ts, docs/sources.md`, `spec.md > Candidates and ranking — src/lib/ranking.ts`, `spec.md > Interface — src/components/*, src/styles/*`
  Build: Re-check every catalog fact on official pages in a browser and record it in `docs/sources.md`; write `alternatives.ts`; `buildCandidates` + `rankOptions`; `PreferencesPanel`, `ComparisonBoard`, `OptionCard`, `AboutData`.
  Verify (mechanical): `npm test` passes ranking and catalog-integrity tests (every price/term has an https official URL and quote; unverified ≠ no; toggling annual billing makes an annual option best fit; toggling IDE integration changes the winner or moves plans to "Can't confirm" per the verified data; impossible requirements → `noneQualifies`); browser shows the board re-ranking when a must-have is toggled.
  Learner check: Tick "Annual billing", then "IDE integration", then set a budget of $5; watch the Best fit badge and the reasons change, and confirm "No option meets all your requirements" appears when nothing fits. Click a source link.
  Commit: `Add verified alternatives and explained ranking`

- [x] **4. Works on a phone, by keyboard, and under awkward input**
  Becomes usable: The page reads well at 360 px in the PRD's mobile order, all controls work by keyboard, empty/unrecognized input shows the planned states, and malicious HTML stays inert.
  Why now: The full journey exists; this hardens it for judges and the recording without adding scope.
  PRD ref: `prd.md > States and Boundaries`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Important Failure Modes`, `spec.md > Look and Feel`
  Build: Adversarial tests and fixes; responsive layout; focus styles; reduced motion; empty and "nothing recognized" states; `docs/qa.md` matrix vs PRD criteria.
  Verify (mechanical): `npm test` and `npm run build` pass; browser check at 360 px shows no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`); tab order reaches every control; second distinct offer text produces correct results.
  Learner check: Open the app on a narrow window or phone, paste an empty box and some nonsense text, and try the page using only the keyboard.
  Commit: `Harden states, mobile layout and accessibility`

- [x] **5. Anyone can run it from the repo or open it at a public URL**
  Becomes usable: README with what/why/how to run/limitations, MIT LICENSE, and a GitHub Pages workflow that builds the app under `/fairfork/`.
  Why now: The submission needs a repo judges can understand and a free way to try it; the optional deploy is prepared last so it ships the finished app.
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > External Services and Dependencies`
  Build: README, LICENSE, `.github/workflows/deploy.yml`, Vite `base`; secret scan of the tree.
  Verify (mechanical): `npm run build && npm run preview` serves the app at `/fairfork/`; workflow YAML is valid; `git grep` finds no keys/tokens; `devpost/learner-profile.md` is not tracked.
  Learner check: Follow the README's run steps yourself from a fresh terminal and confirm the app opens.
  Commit: `Add README, license and Pages deploy workflow`

- [x] **6. Import an offer from a screenshot (beta)**
  Becomes usable: "Import from screenshot (beta)" reads an image in the browser and fills the text box for review, with a notice that OCR can misread; nothing is analyzed automatically.
  Why now: Added at the learner's request after trying the app — copy-pasting offers is the main friction.
  PRD ref: `prd.md > Screenshot import (beta)`
  Spec ref: `spec.md > Screenshot import (beta) — src/components/ImageImport.tsx, src/lib/ocr.ts`
  Build: `src/lib/ocr.ts` (lazy tesseract.js 5.1.1), `ImageImport` inside `OfferInput`, styles, tests with the OCR module mocked.
  Verify (mechanical): `npm test` (134 passed) and `npm run build` (tesseract in a separate lazy chunk); real OCR in the browser on a generated screenshot filled the box, then Analyze highlighted 7 terms and computed $191.88 over 12 months.
  Learner check: Take a screenshot of any pricing text, click "Import from screenshot (beta)", check the text, then Analyze.
  Commit: `Add screenshot import (beta)`

- [x] **7. Push-to-10: Spanish offers, unknowns ledger, copy receipt, richer catalog, design nits**
  Becomes usable: Spanish offers are analyzed with quotes; a "What nobody told you" panel lists every unknown; "Copy receipt" copies a shareable summary; more verified tiers make budget flips richer; hero shows the 3 steps.
  Why now: Learner asked to raise every judging criterion after the final review.
  PRD ref: `prd.md > Spanish offers`, `prd.md > Unknowns ledger ("What nobody told you")`, `prd.md > Copy receipt`
  Spec ref: `spec.md > Push-to-10 additions`
  Build: parser Spanish rules (Agent A), catalog tiers (Agent B), ledger + copy + design nits (Agent C); orchestrator integrates.
  Verify (mechanical): `npm test`, `npm run build`, browser check of a Spanish offer, ledger, copy button, 360 px.
  Learner check: Paste a Spanish offer, check the ledger, click Copy receipt and paste it somewhere.
  Commit: `Add Spanish offers, unknowns ledger, copy receipt and catalog tiers`

- [ ] **8. Real terms and questions to ask before paying**
  Becomes usable: "Try real terms" analyzes verbatim official quotes; each unknown comes with a question to send the provider.
  Why now: Raise Potential Impact (demonstrated on real text) and Innovation (unknowns become actions) before the audit.
  PRD ref: `prd.md > Try real terms`, `prd.md > Ask before you pay`
  Spec ref: `spec.md > Push-to-10 additions`
  Build: `realTerms.ts`, question templates, UI controls, tests.
  Verify (mechanical): `npm test`, `npm run build`, browser check of both features.
  Learner check: Click "Try real terms", then open "What nobody told you" and copy a question.
  Commit: `Add real-terms example and questions to ask before paying`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 3 (full core journey: cited terms → cost → ranking flip), where feedback can still reshape slices 4–5
- [x] Final kick-the-tires exploration and feedback completed — the learner tried the app after slice 5 (one session covering early feedback and final review): "Se ve bien, me gusta"; asked for photo and link import → screenshot import added (slice 6); link import kept deferred

## Final Review

- [x] Screenshot import tested on real pricing-page captures; parser fixes for invented prices committed (`af2e0b6`); learner chose to keep the "beta" label
- [x] Final review complete — feedback resolved and learner confirms ready to ship ("dale, mantenemos")

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: focused alternative, prior practice connected — the real-screenshot OCR investigation during final review (`docs/qa.md` › real-screenshot test; `tests/adversarial.test.ts` › Real-screenshot OCR text) separated OCR misreads from parser bugs; the learner then decided to keep the beta label.
Route and stops: reference route only (not toured): `src/App.tsx` parseOffer(text) → `src/lib/parseOffer.ts` parseOffer → `src/lib/ranking.ts` rankOptions.
Edit outcome: not applicable — learner asked to keep moving toward shipping.
Reflection: transfer question offered in chat; optional.
Activity mode: prior practice + recap.

## Revisions
- Slices 1–3 were implemented in parallel by subagents against the frozen `src/types` contracts and verified together (74/74 tests, `npm run build`, browser check of the example offer and ranking), then committed as three slice commits grouped by file; intermediate commits were not built individually — parallelization made per-slice builds of `App.tsx` impossible.
- Catalog re-verification found Claude Pro's IDE support verbatim on an official support page, so the "IDE integration" must-have no longer flips the winner (Copilot was already cheapest); it now moves Devin Pro to "Can't confirm". The demo flip relies on "Annual billing" (Copilot Pro → Claude Pro annual) and the budget.
- Slice 4 was built while the early checkpoint was pending (it only hardened existing behavior). QA found and fixed: false pressure cues ("only 2 seats per account", "No hurry"), "$16/month billed annually" read as monthly billing, slow parsing on very large input (now capped at 20,000 characters), and an offer with unknown cost being crowned Best fit (now "Can't confirm"). Introductory prices remain a documented limitation.
- Slice 5's live URL can only be verified after the public repo is pushed and Pages is enabled in `6-ship`; locally `npm run build && vite preview` serves the app at `/fairfork/`.
- Added slice 6 (screenshot import, beta) after the learner tried the app and found copy-pasting impractical; URL import stays deferred (needs a server, CORS/SSRF, JS-rendered pricing pages). scope/PRD/spec updated with the learner's agreement ("agrega, nada perdemos").
- Design pass after the final review (learner approved): verdict strip, side-by-side comparison with sticky preferences, visual cost strip — the comparison started ~2,500 px down the page and the Best fit flip happened off screen.
- Visual direction changed to "the marked-up contract" (highlighter yellow, red pen, receipt verdict, Archivo/IBM Plex) after research showed the original cream + serif + coral + Inter look is a common AI-design default; learner approved ("procede").
- Push-to-10 slice verified together: 206/206 tests, build, and a Spanish offer in the browser (7 exact quotes, $191.88 over 12 months, comparison vs Copilot Pro); catalog now 6 verified plans (40 quotes re-checked verbatim); stricter number guard now rejects "$1.200" instead of misreading it as $1.20.
