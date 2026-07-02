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
npm run dev     # http://localhost:3000  (landing) · /demo (interactive demo)
npm run build   # production build — data assertions in lib/data.ts run here and fail the build if the ledger doesn't reconcile
```

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FORMSPREE_ENDPOINT` | Formspree form endpoint (e.g. `https://formspree.io/f/xxxxxxxx`). The *Get statement* lead-capture form POSTs here so leads land in a real inbox. If unset, the form shows an inline configuration error rather than silently no-oping. |

Set it in `.env.local` for development and in the Vercel project settings for production.

Placeholders to update before launch: the footer contact email (`hello@causa.co` in `components/landing/LandingPage.tsx`) and the production domain in `metadataBase` (`app/layout.tsx`).

## Data

Every number on every screen traces to `lib/data.ts` (Meridian, June 2026 — fictional sample data, per Part 7 of the spec). The module throws at build time if any row violates claimed ≥ verified ≥ attributable, any column stops summing to its header, or the verdict impacts stop totaling $7,350.
