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
npm run build      # production build — the data assertions in lib/data.ts run here and fail the build if the ledger artifact drifts
```

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FORMSPREE_ENDPOINT` | Formspree form endpoint (e.g. `https://formspree.io/f/xxxxxxxx`). The *Get statement* lead-capture form POSTs here so leads land in a real inbox. If unset, the form shows an inline configuration error rather than silently no-oping. |

Set it in `.env.local` for development and in the Vercel project settings for production.

Placeholders to update before launch: the footer contact email (`hello@causa.co` in `components/landing/LandingPage.tsx`) and the production domain in `metadataBase` (`app/layout.tsx`).

## Data

Every number on every screen traces to `lib/data.ts` (Meridian, June 2026 — fictional sample data, per Part 7 of the spec). The module throws at build time if any row violates claimed ≥ verified ≥ attributable, any column stops summing to its header, or the verdict impacts stop totaling $7,350.

## The attribution core lives in `dylan3796/causa-engine`

The numbers in `lib/data.ts` are not hand-authored — they are the output of the deterministic attribution engine, which lives in its own repo: [`dylan3796/causa-engine`](https://github.com/dylan3796/causa-engine). This repo is the expression; that one is the substance (join engine, causal ladder A/B/C/D, deterministic verdict engine, outcome interpretation, Meridian fixtures, and the full test suite — see its README).

The site consumes exactly one sealed artifact from it:

- **`lib/generated/meridian-ledger.json`** — committed here, produced by the engine's `npm run reconcile`, verified at every build by the golden-pin assertion block in `lib/data.ts`. Never hand-edit it; a hand-edited artifact fails the build, and failing loudly is the product behaving.

**To change a published number:** change the workbook/fixtures in causa-engine, run `npm run reconcile` there (it asserts every figure and regenerates the artifacts, including the human-readable evidence statement `generated/meridian-statement.md`), copy the regenerated `generated/meridian-ledger.json` into `lib/generated/`, and update the pins in `lib/data.ts` deliberately. Any mismatch anywhere fails `npm run build`.
