---
doc: scope
status: approved
---

# FairFork

Know the true cost. Find a better choice. Paste a subscription offer; see what it really costs over time and how it stacks up against real, source-linked alternatives — in one app.

## The Unique Kernel
One flow instead of three tabs: **cited fine print → computed cost over time → verified alternatives that re-rank when you mark what you actually need.** Every number links to where it came from and when it was checked; anything not verified is shown as *unknown*, never guessed. A "better fit" badge is explained by rules and tradeoffs, not a magic AI score.

## Who It's For
An individual developer deciding whether to pay for an AI coding assistant (e.g. a "Pro" plan with a trial or monthly auto-renewal). Today they open several pricing pages, skim terms, and miss the renewal date, the annual-vs-monthly catch, or the refund rule hidden in the fine print.

## The Core Loop
Paste an offer's text → see the extracted terms highlighted in the original text → see the billing timeline and 1/3/6/12-month cost → compare against 2–3 verified plans → toggle a must-have (budget, annual billing, IDE support…) and watch the recommendation change with an explanation. They come back each time a new subscription or trial tempts them.

## Inspiration & Identity
"Editorial decision lab": light background with deep black, coral for pressure cues, petrol green for the neutral alternative; editorial typography; clipped quotes from the original offer as evidence; quick, sober transitions; no fake charts. References (not copied): DarkScan, AgreeGuard, TermAlert, BestAIPlan.

## Why This Matters to the Learner
"Many companies hide relevant information in the fine print." Comparing with other apps is always worthwhile — and it's better when everything lives in a single app.

## What "Working" Looks Like
In under a minute on screen: paste a "FREE 7-day trial… then $19.99/month, renews automatically" offer → FairFork highlights the trial, price and auto-renewal in the pasted text, flags "Only 3 spots left" as an *unverified* pressure cue, shows the first charge date and the 12-month cost → compares it with real plans (candidates: GitHub Copilot Pro, Claude Pro, Devin/Windsurf Pro) each with official link and verification date → the user marks a must-have and the winner changes, with the reason shown. **The "oh, that's cool" beat:** the cheapest plan stops being the best fit the moment a requirement is ticked — and "not verified" is treated differently from "doesn't have it."

## The POC Boundary
- Pasted text input (a labeled fictional example preloaded so it works instantly).
- Extraction of trial, price, currency, billing period, auto-renewal, cancellation/refund, pressure phrases — each with the exact quote; missing → "Not found".
- Deterministic cost timeline (1/3/6/12 months), assumptions visible.
- Curated, clearly labeled catalog of 2–3 real plans with official URL + verified date + unknowns.
- One preference panel (budget + must-have feature) that re-ranks and explains, including "no option fits".
- No login, no backend required, runs free.

## Later
URL input via a safe allowlisted fetch, AI-assisted extraction server-side, "As advertised vs what it means" fair-version rewrite, export/copy summary, more providers and currencies, term-change alerts, browser extension.

## Explicitly Cut
- Live web search / crawling — can't be done reliably and safely today; the UI must never claim "live".
- Universal "any contract / any website" analysis — comparisons are only meaningful within one niche.
- Login, payments, stored personal data — not needed to prove the kernel; adds risk.
- OCR/screenshots — extra dependency, not core.
- Legal/financial verdicts ("this is illegal / a scam") — FairFork shows evidence and tradeoffs, not advice.
