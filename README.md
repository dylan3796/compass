# Causa

**The vendor shouldn't grade its own homework.**

Landing page + interactive demo for Causa — the independent verification and attribution layer for AI-agent outcomes. Causa doesn't report outcomes. It settles them.

Two governing documents live at the repo root:

- [`CAUSA.md`](CAUSA.md) — Vision & Product Doctrine (the substance)
- [`causa-plan.md`](causa-plan.md) — the build spec this app implements (the expression)

## Stack

Next.js (App Router) · TypeScript · Tailwind · Framer Motion. Light mode only. Deploys to Vercel as-is.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000  (landing) · /demo (interactive demo)
npm run build      # production build — reconciles the ledger first, then data assertions in lib/data.ts run and fail the build if anything drifts
npm run reconcile  # run the attribution engine over the Meridian fixtures and regenerate lib/engine/generated/meridian-ledger.json
npm test           # engine test suite (vitest): estimators, join, verdicts, golden acceptance, determinism, hygiene
```

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FORMSPREE_ENDPOINT` | Formspree form endpoint (e.g. `https://formspree.io/f/xxxxxxxx`). The *Get statement* lead-capture form POSTs here so leads land in a real inbox. If unset, the form shows an inline configuration error rather than silently no-oping. |

Set it in `.env.local` for development and in the Vercel project settings for production.

Placeholders to update before launch: the footer contact email (`hello@causa.co` in `components/landing/LandingPage.tsx`) and the production domain in `metadataBase` (`app/layout.tsx`).

## Data

Every number on every screen traces to `lib/data.ts` (Meridian, June 2026 — fictional sample data, per Part 7 of the spec). The module throws at build time if any row violates claimed ≥ verified ≥ attributable, any column stops summing to its header, or the verdict impacts stop totaling $7,350.

## The attribution core (`lib/engine`)

The numbers in `lib/data.ts` are no longer hand-authored — they are the output of the deterministic attribution engine in `lib/engine`, run over ~30k synthetic event-level records (activity runs + outcome events for Meridian). The pipeline, per CAUSA.md §6:

**extract → join → verify → estimate → economics → verdict**

- **Join engine** — mines join keys out of semi-structured run payloads (tool-call args, prose, CSV fields), builds the run→entity→outcome contribution graph, and reports coverage honestly (the demo's "61% joinable" Jira figure is computed: 640 keyed runs of 1,049).
- **Causal ladder** — one counterfactual estimator per evidence grade: **A** holdout (control rate projected onto the treated arm), **B** natural experiment (difference-in-differences over a staged rollout; routing-gap two-group), **C** matched pre-agent baseline, **D** deterministic rules. Attribution is an integer counterfactual count, rounded exactly once, so the ledger reconciles to the unit.
- **Verdict engine** — ordered, replayable rules mapping funnel + economics + evidence to REPRICE / RENEGOTIATE / EXPAND / REROUTE / RETIRE, each verdict carrying its metric snapshot and a replay record (input hash, config hash, engine version). No LLM anywhere in the verdict path; no clock, no ambient randomness anywhere in the engine (enforced by test).

`npm run reconcile` (run automatically before `dev` and `build`) executes the full pipeline, asserts every published ledger figure back out of it, and writes `lib/engine/generated/meridian-ledger.json` — the only artifact the site consumes. The engine itself never ships in the client bundle.
