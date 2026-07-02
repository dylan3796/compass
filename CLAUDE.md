# Causa

Two governing documents live at the repo root. Read both before making product, copy, or design decisions:

- **`CAUSA.md`** — Vision & Product Doctrine. The substance: thesis, product doctrine, language doctrine, scope discipline. When a build decision is ambiguous, this document decides. When the two conflict, this one wins.
- **`causa-plan.md`** — the build spec for the landing page + demo. The expression: design tokens, copy, data module (Part 7), definition of done (Part 8). Do not invent features, copy, or data beyond it.

Build rules that trip people up:

- Light mode only. No `dark:` variants, no `prefers-color-scheme`.
- Colors: paper `#FAF8F4`, ink `#101010`, hairline (ink @ 15%, rules only), verdict red-orange `#E8491D` (verdicts/deltas/adjustments only), ledger green `#0E6B3D` (verified/EXPAND only). Anything else is a defect.
- Banned words in copy: unlock, seamless, leverage, supercharge, empower, journey, effortless, revolutionize, game-changing, robust, cutting-edge, delight.
- Never describe Causa with observability/tracing/evals/monitoring vocabulary.
- All numbers trace to `lib/data.ts` (Part 7 of the spec); its assertion block must keep failing the build if the math stops reconciling.
- Any screen that doesn't end in a decision is a defect.

App: Next.js (App Router) + TypeScript + Tailwind + Framer Motion, at the repo root. `npm run dev` to develop, `npm run build` to verify (data assertions run at build time). Lead capture posts to `NEXT_PUBLIC_FORMSPREE_ENDPOINT` (see README).
