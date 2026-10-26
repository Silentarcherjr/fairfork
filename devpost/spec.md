---
doc: spec
status: approved
---

# FairFork — Technical Spec

## How This Works, In Plain Language
FairFork is a single web page that runs entirely in your browser — there is no server and no API key. It has four pieces:

1. **The offer reader** (`parseOffer`) reads the text you paste and looks for known phrases — "7-day free trial", "$19.99/month", "renews automatically", "cancel anytime", "Only 3 spots left". For every value it finds, it keeps the exact words and where they sit in your text, so the page can highlight them. If it can't find something, it says "not found" instead of guessing.
2. **The cost calculator** (`calculateBillingTimeline`) takes those terms plus a start date and works out every charge date and the total over 1, 3, 6 or 12 months. Money is counted in cents so totals never drift.
3. **The verified catalog** is a small hand-checked file of three real plans (Copilot Pro, Claude Pro, Devin/Windsurf Pro). Every price and feature carries its official link, a short quote and the date we checked it. A feature is either *yes*, *no*, or *not verified*.
4. **The ranker** (`rankOptions`) puts your offer and the catalog plans side by side, applies your budget and must-haves, and sorts them into "Best fit", "Can't confirm" and "Doesn't meet your needs" — always with a written reason.

The page (React components) just shows what those pieces return. Why this shape: everything that decides a number is plain, testable code separate from the screen, so the same input always gives the same answer and we can prove it with tests. No server means nothing secret to leak and nothing for judges to pay for.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. Page loads → `App` puts the labeled fictional example from `src/data/exampleOffer.ts` in the textarea; start date = today.
2. User clicks **Analyze offer** → `parseOffer(text)` returns `OfferTerms` (each field `found` with evidence, or `not_found`).
3. `EvidenceText` renders the original text as plain text, wrapping each evidence range in a `<mark>`; `TermsCard` lists every field with its quote or "Not found in the text".
4. `calculateBillingTimeline(terms, startDate, horizon)` → `Timeline`; `CostTimeline` shows charge dates and total; horizon buttons change `horizon` in `App` state and recompute.
5. `buildCandidates(terms, timeline, ALTERNATIVES, startDate, horizon)` turns the offer and each catalog price option into comparable `Candidate`s.
6. `PreferencesPanel` edits `Preferences` in `App` state → `rankOptions(candidates, prefs)` → `RankResult`.
7. `ComparisonBoard` shows Best fit (+ reason), the qualified list, "Can't confirm" and "Doesn't meet your needs", each card with source link and "Verified on" date.

```
text ─► parseOffer ─► OfferTerms ─┬─► EvidenceText / TermsCard
                                  ├─► calculateBillingTimeline ─► Timeline ─► CostTimeline
ALTERNATIVES (curated file) ──────┴─► buildCandidates ─► rankOptions(prefs) ─► ComparisonBoard
```

## Stack
Accepted by the learner ("procede") on the agent's recommendation.
- **TypeScript 5 + React 18 + Vite** — fast static build, familiar to the learner's brief. Docs: https://react.dev, https://vite.dev/guide/, https://www.typescriptlang.org/docs/
- **Vitest** for unit tests (engine, ranking, data integrity) and **@testing-library/react + jsdom** for a few component checks. Docs: https://vitest.dev, https://testing-library.com/docs/react-testing-library/intro/
- **Plain CSS with custom properties** (no Tailwind) — makes the editorial look easier and avoids a generic template feel.
- **Fonts:** Google Fonts "Fraunces" (headlines) and "Inter" (data), with system serif/sans fallbacks so it still works offline.
- No runtime dependencies beyond React. No date library: dates handled as `YYYY-MM-DD` strings with UTC math in `src/lib/dates.ts`.
- Tradeoff accepted: rules-based extraction only understands common English offer phrasing; documented as a limitation.

## Where It Runs and How Someone Tries It
- Runtime: browser only. Requires Node 20+ for development.
- Local: `npm install` → `npm run dev` → open the printed `http://localhost:5173/fairfork/`.
- Checks: `npm test` (Vitest), `npm run build` (type-check + production build).
- **Deployment (learner accepted):** GitHub Pages via a GitHub Actions workflow (`.github/workflows/deploy.yml`) on every push to `main`. Vite `base: '/fairfork/'`. Public URL: `https://<github-user>.github.io/fairfork/`. Free, no login.
- Submission still requires the demo video (< 3 min, public YouTube/Vimeo) and the public GitHub repo — the deployed URL is an extra.
- Demo recording: record the deployed page in a desktop browser following `prd.md > The Core Journey`.

## Look and Feel
Carried forward from `prd.md > Look and Feel` (revised direction "the marked-up contract").
- Tokens on `:root`: `--paper #FCFCFA` (cool white), `--ink #0E0E0E`, `--muted #55595E`, `--rule #D9DBDD`, `--marker #FFE14D` (highlighter), `--marker-ink #6B5A00`, `--redpen #D0261C`, `--verdict #0B6B4F` (best fit), `--unverified #6E7378`.
- Fonts (Google Fonts, system fallbacks): Archivo (wdth 75–100, wght 600–900) for headlines; IBM Plex Sans for body; IBM Plex Mono for money, quotes, receipt.
- Highlights: `mark` drawn as a marker stroke (skewed yellow background gradient, slightly irregular edges via `border-radius`); pressure cues: `text-decoration: underline wavy var(--redpen)` + margin note.
- Receipt: `VerdictStrip` in mono with dotted leaders and a zigzag torn edge (CSS mask/gradient), no images.
- Fewer containers: sections separated by hairline rules; uppercase tracked labels only where truly needed.
- Transitions ≤ 250 ms; `prefers-reduced-motion` respected. Responsive from 360 px.

## Components

### Offer parser — `src/lib/parseOffer.ts`
Rules-based extraction over the raw text (regex + phrase lists). Returns `OfferTerms`. Each `Evidence` has `start/end` offsets such that `text.slice(start, end) === quote`. Never defaults a missing value. Detects pressure cues (scarcity: "only N left/spots", "limited spots"; urgency: "today only", "ends tonight", "hurry", "last chance"). Feature claims from text: IDE (`VS Code|JetBrains|IDE|editor`), annual billing (`/year|annually|billed yearly|annual plan`), monthly cancel (`cancel anytime` + monthly period).
PRD ref: `prd.md > Fine-print extraction`.

### Billing calculator — `src/lib/billing.ts`, `src/lib/dates.ts`
`calculateBillingTimeline(terms, startDate, horizonMonths)`. First charge = start + trialDays (if trial found) else start (assumption: "No trial found in the text — first charge assumed on the start date"). Monthly renewals by calendar month with end-of-month clamping (Jan 31 → Feb 28/29 → Mar 31 based on the anchor day); yearly renewals once per year. Charges counted while `date < start + horizonMonths`. `autoRenew` false → only the first charge; not found → renewals projected with the assumption written out. Price not found → `{ status: 'unknown' }`.
PRD ref: `prd.md > True cost timeline`.

### Alternatives catalog — `src/data/alternatives.ts`, `docs/sources.md`
Curated, typed data for Copilot Pro, Claude Pro, Devin/Windsurf Pro, verified 2026-10-26 on official pages; every price, term and feature with `sourceUrl` + short quote. Features without a verified quote are `unverified`. Conflicting refund sources recorded with both links. `docs/sources.md` lists every URL, the quote and check time.
PRD ref: `prd.md > Verified alternatives catalog`.

### Candidates and ranking — `src/lib/ranking.ts`
`buildCandidates(...)`: one `Candidate` for "Your offer" plus one per catalog price option (e.g. "Claude Pro — monthly", "Claude Pro — annual"), cost over the same horizon (annual = billed upfront at start; alternatives assumed to start charging on the start date, stated). `rankOptions(candidates, prefs)`:
- must-have `no` → **excluded** with reason; must-have `unverified` → **cantConfirm**; budget: effective monthly cost > budget → excluded; cost unknown or currency ≠ USD with a budget set → cantConfirm ("not comparable").
- qualified sorted by horizon cost ascending, tie → fewer `unverified` features, then label. `bestFit = qualified[0]` with reason text listing the satisfied requirements.
- empty qualified → `noneQualifies: true`.
PRD ref: `prd.md > Preferences and explained ranking`.

### Interface — `src/components/*`, `src/styles/*`
`OfferInput` (textarea, start date, Analyze, Clear, "fictional example" label), `EvidenceText` (escaped text + `<mark>` ranges, never `dangerouslySetInnerHTML`), `TermsCard`, `PressureCues`, `CostTimeline` (horizon buttons 1/3/6/12), `PreferencesPanel` (budget input + 3 must-have checkboxes), `ComparisonBoard` + `OptionCard` (price, billing basis, horizon cost, terms, features, source link, verified date, reasons), `AboutData` footer.
PRD ref: `prd.md > Screens and Layout`, `prd.md > States and Boundaries`.

### Screenshot import (beta) — `src/components/ImageImport.tsx`, `src/lib/ocr.ts`
`readTextFromImage(file, onProgress)` lazy-loads **tesseract.js 5.1.1** (dynamic `import()`, so the main bundle and first load are unaffected) and runs English OCR in a Web Worker in the browser. Tesseract downloads its worker, WASM core and English model (~10–15 MB) from the jsDelivr CDN on first use; the image itself never leaves the browser. `ImageImport` renders the file input, progress and errors and calls `onText(text)`; `App` puts the text in the box, clears the example flag and shows the review notice. No auto-analyze. Docs: https://github.com/naptha/tesseract.js
PRD ref: `prd.md > Screenshot import (beta)`.

### Design pass — verdict strip, comparison grid, cost strip
`VerdictStrip` (new, `src/components/VerdictStrip.tsx`) reads the `Timeline` and `RankResult.bestFit`; difference = offer horizon cost − best-fit horizon cost, shown only when both are known and in USD, always phrased as "if you switch" with the start-date assumption. `ComparisonBoard` renders a responsive grid (≥ 1100 px: preferences sticky on the left, cards in columns); `OptionCard` folds terms/sources into `<details>`; the Best fit card animates position changes (FLIP, disabled under reduced motion). `CostTimeline` shows one bar per charge with the list in `<details>`.
PRD ref: `prd.md > Screens and Layout`.

### Push-to-10 additions
- **Spanish in `parseOffer`**: Spanish phrase lists for trial, price (incl. "17 $", "US$"), period ("al mes", "/mes", "mensual", "al año", "anual"), auto-renewal, cancellation, refund, pressure cues; same evidence rules. Implements `prd.md > Spanish offers`.
- **`src/lib/unknowns.ts`** (`collectUnknowns(terms, alternatives)`) and `UnknownsLedger` component. Implements `prd.md > Unknowns ledger ("What nobody told you")`.
- **`src/lib/receiptText.ts`** (`buildReceiptText(...)`) + "Copy receipt" button using `navigator.clipboard.writeText` with a textarea fallback. Implements `prd.md > Copy receipt`.
- **Catalog tiers** in `src/data/alternatives.ts` with `docs/sources.md` entries.

### App shell — `src/App.tsx`, `src/main.tsx`
Holds state (text, analyzed terms, startDate, horizon, preferences) and wires the pure functions to components. Nothing persisted.

## Data Model
Shared contracts in `src/types/*.ts` (frozen before parallel work):

```ts
// src/types/terms.ts
export type Evidence = { quote: string; start: number; end: number };
export type Field<T> = { status: 'found'; value: T; evidence: Evidence } | { status: 'not_found' };
export type BillingPeriod = 'month' | 'year';
export type FeatureKey = 'ide' | 'annualBilling' | 'monthlyCancel';
export type PressureCue = { kind: 'scarcity' | 'urgency'; evidence: Evidence };
export type OfferTerms = {
  trialDays: Field<number>;
  price: Field<{ amountMinor: number; currency: string }>; // currency ISO code, e.g. 'USD'
  billingPeriod: Field<BillingPeriod>;
  autoRenew: Field<boolean>;
  cancellation: Field<string>;
  refund: Field<string>;
  features: Record<FeatureKey, Field<boolean>>;
  pressureCues: PressureCue[];
};

// src/types/billing.ts
export type Charge = { date: string; amountMinor: number }; // date = 'YYYY-MM-DD'
export type Timeline =
  | { status: 'known'; firstChargeDate: string; charges: Charge[]; totalMinor: number; currency: string; assumptions: string[] }
  | { status: 'unknown'; reason: string; assumptions: string[] };

// src/types/alternatives.ts
export type Sourced<T> = { value: T; sourceUrl: string; quote: string };
export type FeatureStatus = { status: 'yes' | 'no' | 'unverified'; sourceUrl?: string; quote?: string };
export type PriceOption = { period: BillingPeriod; amountMinor: number; currency: 'USD'; sourceUrl: string; quote: string; note?: string };
export type Alternative = {
  id: string; provider: string; plan: string; officialUrl: string; verifiedAt: string; // ISO date
  prices: PriceOption[];
  trial: Sourced<number | null> | 'unknown';           // null = verified "no trial"
  autoRenew: Sourced<boolean> | 'unknown';
  cancellation: Sourced<string> | 'unknown';
  refund: (Sourced<string> & { conflict?: Sourced<string> }) | 'unknown';
  features: Record<FeatureKey, FeatureStatus>;
  caveats: string[];                                   // taxes, regional pricing, etc.
};

// src/types/ranking.ts
export type Preferences = { maxMonthlyBudgetMinor: number | null; mustHave: Record<FeatureKey, boolean> };
export type Candidate = {
  id: string; label: string; isUserOffer: boolean; alternativeId?: string;
  period: BillingPeriod | null; currency: string | null;
  horizonCostMinor: number | null; effectiveMonthlyMinor: number | null;
  features: Record<FeatureKey, 'yes' | 'no' | 'unverified'>;
  assumptions: string[];
};
export type RankedCandidate = Candidate & { reasons: string[] };
export type RankResult = {
  qualified: RankedCandidate[]; cantConfirm: RankedCandidate[]; excluded: RankedCandidate[];
  bestFit: RankedCandidate | null; noneQualifies: boolean;
};
```

Where data lives: everything is in React state in `App`; the catalog is a static module. Leaving or refreshing the page clears everything; nothing is stored.

## File Structure

```
fairfork/
├── index.html                    # page shell, fonts, meta
├── package.json / tsconfig*.json / vite.config.ts   # base '/fairfork/', vitest config
├── LICENSE                       # MIT
├── README.md                     # what, how to run, limitations, Skill Pack usage
├── .github/workflows/deploy.yml  # GitHub Pages deploy on push to main
├── docs/
│   ├── sources.md                # every catalog fact: URL, quote, checked-at
│   └── qa.md                     # QA matrix vs PRD criteria and results
├── src/
│   ├── main.tsx / App.tsx        # entry + state wiring (orchestrator)
│   ├── types/                    # terms.ts, billing.ts, alternatives.ts, ranking.ts (frozen contracts)
│   ├── lib/
│   │   ├── parseOffer.ts         # rules-based extraction with evidence
│   │   ├── billing.ts            # timeline + totals
│   │   ├── dates.ts              # YYYY-MM-DD UTC helpers, month clamping
│   │   ├── money.ts              # minor-unit formatting
│   │   └── ranking.ts            # buildCandidates + rankOptions
│   ├── data/
│   │   ├── alternatives.ts       # curated verified catalog
│   │   └── exampleOffer.ts       # labeled fictional example(s)
│   ├── components/               # OfferInput, EvidenceText, TermsCard, PressureCues,
│   │                             # CostTimeline, PreferencesPanel, ComparisonBoard, OptionCard, AboutData
│   └── styles/                   # tokens.css, app.css
├── tests/                        # *.test.ts(x): parser, billing, ranking, catalog integrity, UI safety
└── devpost/                      # Skill Pack documents
```

## External Services and Dependencies
- **None for the core journey.** No API calls, no keys, no cost.
- **Screenshot import (beta) only:** tesseract.js 5.1.1 fetches its worker/core/English model from cdn.jsdelivr.net on first use (free, no key). Offline, the import shows an error; everything else works.
- Google Fonts stylesheet (optional; system font fallback if blocked).
- GitHub Pages + GitHub Actions (free for public repos). Docs: https://docs.github.com/en/pages, https://vite.dev/guide/static-deploy#github-pages
- Official provider pages are read by humans/agents at build time only, never fetched by the app.

## Important Failure Modes
- **Offer phrasing the rules don't recognize** → fields show "Not found in the text", cost "Unknown — price not found"; alternatives still visible. README states the English-phrasing limitation.
- **A catalog fact can't be re-verified in the browser** → stored as `unverified`/`'unknown'`, never guessed; ranking puts that plan under "Can't confirm" when that fact matters.
- **No option meets the requirements** → "No option meets all your requirements" with each option's eliminating reason.
- **OCR misreads or the CDN is unreachable** → text box is filled for review with a warning, or an error leaves the existing text untouched; nothing is analyzed automatically.
- **Malicious pasted HTML** → rendered as text by React; no `innerHTML` anywhere (tested).

## What Was Simplified and Why
- **Rules-based extraction** instead of AI extraction — no server/keys, deterministic and testable; AI would need a server-side endpoint and schema validation.
- **Curated 3-plan catalog** instead of live search — verifiable and honest today; live search would need safe crawling and constant re-verification.
- **Pasted text only** instead of URL fetch — avoids SSRF risk and a backend.
- **USD only** — no exchange-rate source; other currencies are shown but marked "not comparable".

## Decisions and Open Issues
- Stack, browser-only architecture, and GitHub Pages deployment — learner accepted the agent's recommendation ("procede").
- Each catalog price option is its own candidate (monthly vs annual) — implementation detail derived from `prd.md > Verified alternatives catalog` (annual vs monthly must not be mixed).
- Catalog plans are assumed to start charging on the start date (no trial counted unless verified) — stated as an assumption on each card.
- **Learner uncertainty:** none identified — the learner designed the plan and reported no doubts; recorded as such.
- Open (from `prd.md > Open Questions`): re-check each catalog quote in a real browser before marking it `yes`/`no`; anything not re-confirmed stays `unverified`. Done during build; doesn't block approval.
