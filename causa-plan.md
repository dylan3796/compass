# CAUSA — Claude Code Execution Plan

Landing page + interactive demo. Complete spec — build end-to-end in one run.
July 2026. This document is the complete specification. Do not invent features, copy, or data beyond it.

## PART 1 — MISSION LOCK

**Motto:** Causa doesn't report outcomes. It settles them.
**Enemy:** AI vendors bill for outcomes, then grade their own homework.
**Claim:** The system of record for what your AI workforce actually delivers.
**Ladder:** Meter (verify) → Verdict (act) → Standard (the benchmark for machine labor).

Every decision passes one test: does this feel like the place where machine labor gets settled — precise, inevitable, slightly intimidating — or like another SaaS tool?

**Claims hygiene:** the voice uses settlement vocabulary (settle, statement, recoveries) as product language, never as a claim to perform accounting or audit services. Site footer must include, small and unapologetic: *Causa provides operational outcome verification. Not accounting, audit, or assurance services.*

## PART 2 — STACK, ORDER, AND THE DEGRADATION LAW

**Stack:** Next.js 14+ (App Router) · TypeScript · Tailwind · Framer Motion. Charts hand-rolled SVG unless otherwise noted. Single repo → Vercel. Light mode only — do not emit `dark:` variants or honor `prefers-color-scheme`.

**Build order (one pass):**
1. Design tokens, type, motion primitives (Part 3) + brand kernel (Part 4)
2. `data.ts` — the reconciled data module (Part 7). Include an assertion block that throws at build time if any row violates claimed ≥ verified ≥ attributable or columns don't sum to headers.
3. Demo `/demo` (Part 6) — build before the landing page
4. Landing page `/` (Part 5)
5. QA against Part 8

**The Degradation Law — cut scope, never quality.** If time, complexity, or bugs force cuts, degrade in exactly this order and no other:
1. Fleet Standard toggle loses its animated re-sort (instant re-sort is fine)
2. Tier diagram becomes a static three-column layout
3. Settlement Funnel becomes a static diagram with final numbers and count-ups only
4. Presenter path in demo dropped

**Untouchable, in priority order:** Screen 3 (Verified Outcome Statement, both personas) · verdict cards with Evidence Grades · lead-capture flow · mobile rendering at 390px. A flawless statement screen with a static funnel beats a janky scroll animation with a mediocre statement screen, every time.

## PART 3 — DESIGN SYSTEM (ANTI-SLOP DOCTRINE)

**Register:** Swiss financial editorial meets kinetic data — a Bloomberg terminal that hired a Milanese art director. Light mode is the thesis: this is ledger paper, not a command center.

**Banned visuals:** purple/indigo gradients · glassmorphism · emoji in headings · 3D blobs · "AI sparkle" icons · floating orbs · testimonial carousels · logo marquees · dark mode.

**Color tokens:** paper `#FAF8F4` · ink `#101010` · hairline = ink at 15% (decorative rules only, never text) · verdict red-orange `#E8491D` (verdicts, deltas, adjustments ONLY — scarcity is the effect) · ledger green `#0E6B3D` (verified/EXPAND states only). Any color use outside these roles is a defect.

**Type:** Display serif (Instrument Serif or Newsreader, Google Fonts) for headlines and verdict stamps. Grotesque (Geist Sans or IBM Plex Sans) for body/UI. Tabular numerals everywhere. Hero H1 `clamp(3rem, 8vw, 7rem)`. All text must pass WCAG AA on the paper background.

**Motion doctrine — "the ledger reconciling": weight settling, not confetti.**
- Count-ups: tabular numerals, ease-out, 800ms, fire once on scroll-into-view.
- Verdict stamps press in: scale 1.15→1.0, −2° rotation, single-frame ink-bleed shadow.
- Section reveals: 12px rise + fade, 400ms, no stagger circus.
- All animation on transform/opacity only. No scroll-jacking anywhere.
- Full `prefers-reduced-motion` support: static end-states, numbers pre-resolved.

**Microcopy law (governs every word not specified in this document):**
- Banned words: unlock, seamless, leverage, supercharge, empower, journey, effortless, revolutionize, game-changing, robust, cutting-edge, delight.
- Buttons: verb + object, ≤3 words (Get statement, Connect source, Export CSV, Draft memo).
- Tooltips and empty states: one sentence, declarative, no exclamation points.
- When in doubt, write like a ledger annotation, not a marketer.

**Budgets (hard constraints):** LCP < 2.5s on the landing page (fonts preloaded, hero animation code-split, no image over 150KB) · every interactive element keyboard-reachable with visible focus states · touch targets ≥ 44px.

## PART 4 — BRAND KERNEL

**Wordmark:** *Causa.* — display serif, ink on paper, terminal period included. No icon, no symbol. Nav: wordmark left; *See the demo* + *Get statement* right.

**Favicon:** the letter C in the display serif, ink on a paper square.

**Page titles:** `Causa — The vendor shouldn't grade its own homework.` (landing) · `Causa — Demo` (demo).

**OG/social image (1200×630, static asset):** paper background, the eyebrow line set large in the serif — *AI vendors bill you for outcomes. Then they grade their own homework.* — wordmark bottom-left. This link will live in LinkedIn posts and DMs; the OG card is the first impression. Treat it as a hero.

**Meta description:** `Causa independently verifies what your AI agents deliver, attributes outcomes to whatever did the work, and settles what happens next. First Verified Outcome Statement in 7 days.`

## PART 5 — LANDING PAGE /

Every interactive element has a specified mobile behavior. Mobile is co-primary — the founder demos from a phone.

### §1 Hero
**Eyebrow (mono, small caps):** AI VENDORS BILL YOU FOR OUTCOMES. THEN THEY GRADE THEIR OWN HOMEWORK.
**H1 (serif):** The vendor shouldn't grade its own homework.
**Sub:** Agents close your tickets, provision your workspaces, draft your documents, and book your revenue — then bill you for it. Causa independently verifies every claimed outcome, attributes it to whatever did the work, and settles what happens next. First Verified Outcome Statement in 7 days.
**CTAs:** *Get statement* (ink button → §CTA flow) · *See the demo →*

**Settlement Funnel (signature element).** Desktop: a horizontal stream of tick-marks (4,812 claimed) flows right through gate one (VERIFIED — 4,203; failures fall away in gray) and gate two (ATTRIBUTABLE — 3,163; more fall), terminating in a green-stamped total. Progress tied to scroll position via transform interpolation — never hijack native scrolling. Mobile: no scrubbing. The funnel renders as a vertical three-stage diagram that plays a single 2.5s timeline animation when tapped or on viewport entry, then rests. Reduced motion: static diagram with final numbers.

### §2 The stakes (three ruled lines)
Outcome pricing is becoming software's default. · Every outcome invoice is currently self-reported. · The payer has no independent record. You're the payer.

### §3 The two buyers (cards; stack vertically on mobile)
**CFO:** An Agent P&L, finally. Spend by vendor and model · verified value delivered · cost per verified outcome · adjustments recovered. Invoice-grade, export-ready.
**Operating leader:** Performance reviews for your digital workforce. Every workflow scored against its baseline, stamped with a verdict, next step drafted.
Beneath both: *One record. It cascades — board deck to team standup.*

### §4 "Two exports and a join key." (data honesty, sold with confidence)
Three tiers. Desktop: stepped diagram, click to expand. Mobile: accordion, Tier 0 expanded by default.
- **Tier 0 — Pilot.** No integration required. Export your agent activity. Export your outcomes. Give us the key that joins them. Statement in 7 days.
- **Tier 1 — One workflow, live.** One read-only activity source (LangSmith, Langfuse, OpenTelemetry, or logs) + one system of record (Zendesk, Salesforce, Jira, ServiceNow, billing).
- **Tier 2 — The full ledger.** Connect the systems where outcomes land. Every workflow, every actor, one statement. No SDK. No proxy. Nothing to rip out.

Closing: *Verification has a floor: the system of record where the outcome lands, and the key joining work to result. That's all we ask — and we'll tell you what's verifiable with what you've connected before you pay for anything.*

### §5 Evidence, graded
**Header:** Not all proof is equal. We grade ours.
Vertical ladder of specimen stamps:
- **A — Held out.** A slice of work your agents never touch. The cleanest counterfactual in commerce.
- **B — Natural experiment.** Staged rollouts, model switches, routing changes — every change you've already made is an experiment. We mine them.
- **C — Baseline.** Your pre-agent history, matched and compared.
- **D — Rules.** Deterministic counterfactual logic. Where every engagement starts. Never where it has to end.

Closing: *Causal inference is about to get very good. The companies feeding graded evidence into their ledger today are the ones who'll trust their numbers when it does. Every Causa verdict carries its grade — and the path to a better one.*

### §6 The Fleet Standard
**Header:** Built or bought, every agent answers to the same bar.
**Body:** You'll build some agents. You'll buy more. Vendors swear by theirs; your platform team swears by theirs. Causa holds the whole fleet — internal, vendor, hybrid — to one standard: verified outcomes per dollar, graded evidence, same ledger.
Interactive fleet table (rows from Part 7, plus Origin badges) with [ All / Built / Bought ] toggle; rows filter and re-rank by $/verified outcome. Mobile: horizontal scroll with pinned first column; toggle as a segmented control above. The moment that lands: a built agent and a bought agent adjacent on identical metrics.

### §7 The vision ladder (the one cinematic full-bleed section)
Meter → Verdict → Standard, serif at full size, scroll-revealed (simple rise+fade per step — no parallax). Standard ends: *Every statement sharpens the Benchmark. Every customer prices machine labor smarter than the last. "Causa Verified" is how agent vendors will prove value — and how buyers will set price.* Then: *Every economy that started paying for results built a verification layer beside it — audits for financial statements, ratings for credit, verification for ads, networks for payments. Machine labor is next. Causa is that layer.*

### §8 Sell-side strip
*Agent vendors: enterprise buyers are going to ask who verified your outcomes. Get Causa Verified before they do.*

### §9 Founder block + final CTA + footer
*Built by the operator who ran partner attribution at a $5B-ARR data company — crediting logic, incentive design, and outcome measurement for the messiest actors in B2B: humans. Agents are the easy part.* Final CTA restates the 7-day promise. Footer: wordmark · contact email · demo link · the claims-hygiene line (Part 1). No fabricated testimonials, logos, or metrics anywhere.

### §CTA — Lead capture flow (a real destination, not a dead end)
*Get statement* opens a single-screen form (modal on desktop, full-screen sheet on mobile): Name · Work email · Monthly agent spend (select: <$5K / $5–25K / $25–100K / $100K+) · optional one-line *What are your agents doing?*
Submit → POST to a Formspree endpoint (placeholder FORMSPREE_ENDPOINT env var, documented in README) so leads land in a real inbox from day one. No stubbed no-op routes.
Confirmation state (same surface, stamp animation): **Received.** + *Your first Verified Outcome Statement is 7 days from your data. We'll reply within one business day with the export checklist — two files and a join key.*
Inline validation, no browser-default alerts. Fully keyboard-operable.

## PART 6 — DEMO APP /demo

**Narrative spine:** the demo is a story, not a tool tour. On entry, a dismissible framing card: *You're looking at Meridian — 140 people, four agent workflows, $9,909/mo in agent spend. This is their June statement. Every screen is Meridian's data.* Persistent banner: `SAMPLE DATA — MERIDIAN (FICTIONAL)`.

**Presenter path:** each screen has a quiet *Next →* in the bottom rail following pitch order (1 → 2 → 3 CFO → 3 Team → 4). Left rail still allows free navigation. (First demo feature to drop under the Degradation Law.)

### Screen 1 — Define outcomes
Catalog of Meridian's four outcomes + custom form. Each outcome displays its contract explicitly: **Event · Quality bar · Counterfactual**. Microcopy: *If it lands in a system of record, Causa can verify it.* Custom form: name · system of record · success event · quality bar · baseline type (holdout / natural experiment / historical baseline / rules) — the baseline choice live-previews the Evidence Grade (A/B/C/D) it earns. This teaches the causality ladder inside the product.

### Screen 2 — Connect sources
Activity tiles: LangSmith, Langfuse, OpenTelemetry, Log upload. Outcome tiles: Zendesk, Salesforce, Jira, ServiceNow, Stripe, Google Drive. Click flips to *Connected — 14,203 runs · 30 days*. One honest partial state: *Jira — 61% of outcomes joinable · improve join key →*. "What's verifiable now" meter: fills as sources connect; copy such as *2 sources connected → 3 of 4 workflows verifiable · Evidence ceiling: Grade C. Add rollout history for Grade B.* Footnote: *No SDK. No proxy. Statement ready in 7 days from first sync.*

### Screen 3 — Verified Outcome Statement (untouchable core; persona toggle [ CFO / Team ])
Shared header: `MERIDIAN · JUNE 2026 · Agent spend $9,909` + state-driven Settlement Funnel: 4,812 claimed → 4,203 verified → 3,163 attributable, count-ups on entry. Beneath: *Adjustment identified: $91.50 · Projected verdict impact: $7,350/mo* — the second figure in verdict red. Verdicts worth 74% of monthly spend is the single most persuasive stat in the demo; make it unmissable.

**CFO view — the Agent P&L:** table per Part 7 (Workflow · Origin · Spend · Verified · $/verified outcome · by-model split as micro horizontal bars · Δ vs May). Dispute row highlighted: *Vendor claimed 3,214 resolutions · 61 reopened within 7 days · adjustment: $91.50*. Buttons: *Download statement* · *Push to ERP* (mocked; stamp animation on click). Mobile: table scrolls horizontally, workflow column pinned.

**Team view — the workforce roster:** rows as workers (name + BUILT/BOUGHT/HYBRID badge) · outcomes verified · quality pass % · $/outcome · vs. baseline · Evidence Grade chip · sparkline. The hybrid row (Meetings) shows the attribution split as a small stacked bar: agent 62% / human 38%. Microcopy: *Performance reviews your agents never had.*

### Screen 4 — Verdicts
Card per workflow: verdict stamp (pressed-in) · Evidence Grade chip · two lines of evidence · dollar impact · one action button opening a mocked artifact in a slide-over (renegotiation email draft, reroute plan, adjustment CSV). Verdicts and numbers exactly per Part 7. Closing teaser card, locked style: *Your cost per resolved ticket: $1.19 · Causa Benchmark median: $1.42 · 71st percentile.* One card only. Build nothing further for Benchmark.

## PART 7 — DATA MODULE (single source of truth; assert at build time)

Company: **Meridian** (fictional) · Period: **June 2026**
Headers (must equal column sums): Claimed **4,812** · Verified **4,203** · Attributable **3,163** · Spend **$9,909** · Adjustment identified **$91.50** · Projected verdict impact **$7,350/mo**

| # | Workflow | Origin | Claimed | Verified | Attributable | Spend | $/verified | Evidence | Verdict | Impact/mo |
|---|----------|--------|---------|----------|--------------|-------|------------|----------|---------|-----------|
| 1 | Support tickets | BOUGHT | 3,214 | 2,802 | 1,989 | $4,821 | $1.72 | A (10% holdout) | RENEGOTIATE | $1,233 |
| 2 | Workspace provisioning | BUILT | 486 | 486 | 486 | $204 | $0.42 | C (12-mo baseline) | EXPAND | $2,140 |
| 3 | Document generation | BUILT | 640 | 601 | 570 | $1,984 | $3.30 | B (model switch) | REROUTE | $1,077 |
| 4 | Qualified meetings | HYBRID | 472 | 314 | 118 | $2,900 | $9.24 | B (staged rollout) | RETIRE agent slice | $2,900 |

**Fixed narrative ratios (do not alter):**
- **Support:** billed $1.50/resolution; incrementality 71% (1,989 / 2,802); fair price $1.06; 61 reopens → $91.50 adjustment; models claude-fable-5 / gpt-5. Renegotiation impact: $0.44 × 2,802 ≈ $1,233/mo.
- **Workspace:** $0.42/provision vs. human baseline $11.90 and 2.1 days → 4 minutes; 100% quality bar. EXPAND to contractor onboarding ≈ $2,140/mo additional savings.
- **Doc gen:** 94% approval (601/640); $3.10 marginal cost on claude-fable-5 vs. $1.21 on the qwen-3 pilot slice at identical approval; REROUTE saves $1.89 × 570 ≈ $1,077/mo.
- **Meetings:** verified = opportunity created within 14 days (314/472); only the human-assisted slice beats the counterfactual (attributable 118); agent-only slice converts 8% vs. 11% do-nothing baseline; activity split agent 62% / human 38%; RETIRE recovers the $2,900/mo vendor fee.

**By-model split bars (CFO view):** support row claude-fable-5 $1.19 · gpt-5 $1.31 per verified resolution; doc gen row claude-fable-5 $3.10 · qwen-3 $1.21.

**Verdict impacts:** 1,233 + 2,140 + 1,077 + 2,900 = **$7,350 exactly**.

Every row satisfies claimed ≥ verified ≥ attributable. Column sums: claimed 4,812 · verified 4,203 · attributable 3,163 · spend $9,909. The `data.ts` assertion block must check all row inequalities, all column sums, and the $7,350 total — and fail the build otherwise.

## ADDENDUM — Founder directives (July 2026, post-first-build)

Live direction from the founder that extends this spec; where they conflict, these win:

1. **ICP:** startups under $100M ARR first; enterprises follow. Avoid "enterprise" as an audience signal in payer-facing copy.
2. **Per-source outcomes are the product, not logos.** Every source names the outcome events Causa reads from it (Zendesk → ticket resolved; Stripe → payment settled / refund processed; Salesforce → opportunity created; ServiceNow → workspace provisioned; Google Drive → document approved; Jira → issue closed). Connected outcome tiles count events, never runs. The landing hero carries a ruled source→event index.
3. **The tie-back message, stated verbatim where the flow is taught:** whatever the outcome, if it lands in a system of record, Causa verifies it — and ties it to whatever did the work. The Team roster names the acting agent per workflow.
4. **Outcome discovery is a product element.** Causa also surfaces outcomes the customer wasn't measuring ("Outcomes you weren't measuring" panel on demo Screen 2; discovery closer in landing §4). Teams arrive knowing what they think they want; the ledger shows them what they actually want. Discovery figures derive from the Part 7 ledger where a derivation exists and are asserted in `data.ts`.
5. **The Screen 2 meter respects the verification floor:** workflows count as verifiable only when an activity source AND the workflow's system of record are both connected.

## ADDENDUM 2 — Outcome-first repositioning (July 2026, founder review of PR #8)

Where these conflict with anything above, these win:

1. **Outcomes first, agents second.** The product is proving the outcome, pricing it, and deciding what's next. Agent/model cost tracking is attribution detail — never the pitch (that's commodity observability: LangSmith, Langfuse, Datadog).
2. **Hero is value-first.** H1: *Know what your agents actually delivered.* The homework line survives once, small (eyebrow kicker). Page title and meta match.
3. **Disputes are proof of neutrality, not the focal point.** The dispute row and RENEGOTIATE stay in the statement; landing copy never leads with disputes. Three of the five verdicts need no vendor conversation — say so.
4. **Self-serve verdict artifacts.** Every artifact is something the customer executes without the vendor: EXPAND ships a clone plan (clone the agent to an adjacent workflow), REROUTE ships a model swap + instruction retune, RETIRE ships a wind-down. RENEGOTIATE remains the one vendor-facing artifact.
5. **Causa learns.** Discovery extends to recommendations: which outcomes to measure next and where to point agents. Every statement sharpens the next.
6. **No agent-vs-human-outcome claims.** Baselines are pre-agent processes ("under the old process"), holdouts, or natural experiments — never "vs. human" or "reps alone."
7. **Relatable cast, plain language.** Meridian's workflows: Support tickets · New-hire accounts · Meeting notes → Jira tickets (replaces Document generation; same Part 7 math) · Sales meetings booked. Examples reflect real 2026 agent deployments (support agents, hybrid SDRs, meeting-notes→tasks, coding agents).
8. **"How it works" in three plain steps** (connect where outcomes land → Causa matches outcome to doer → monthly statement ending in decisions); tiers compress beneath it.
9. **Less wordy everywhere.** Impressive and vision-conveying beats exhaustive; body copy cut roughly 40% from the first build.
10. **Wordmark** carries a printed ledger-header treatment (serif, tight tracking, fine double rule) in nav, footer, favicon, OG.

## ADDENDUM 3 — Second wave, the join as moat, upmarket-first (July 2026)

1. **Second-wave positioning.** Agent adoption is a power law (Ramp AI Index: median ~$2.2K/mo vs. top 1% at hundreds of times that per employee). The landing states the timing thesis under the stakes: the record should exist before the second wave arrives.
2. **Public why-now facts live in `lib/data.ts` (`market`)** with sources — Fin's $0.99/resolution, the ~$3.6B Salesforce acquisition, Ramp medians. External facts stay as disciplined as ledger numbers.
3. **The join is the sauce.** How-it-works step 2 owns it explicitly (join keys hide in tool calls, hybrid work splits credit, joinability reported before payment). CAUSA.md §6.2 carries the full argument: why everyone adjacent stops where the join begins, and the three best-not-first measures (coverage rate, replay credit, compounding graded evidence).
4. **Upmarket-first, downmarket-ready.** ICP re-sequenced to the top decile of spenders including enterprises on six-figure agent contracts; the manager door stays as the second-wave path. The sell-side strip says "enterprise buyers" again.

## ADDENDUM 4 — Landing page, not product page (July 2026)

The landing runs a story arc, not a feature tour. The demo carries the product; the landing carries the problem, the claim, and the value.

Arc: **Hero** (value H1 + funnel) → **§2 The problem, told at ground level** (the four Meridian people from CAUSA.md §2 — everyone suspects, nobody knows) → **§3 The claim** (self-reported invoices; the maker can't be the referee; Causa is the record — plus the second-wave market note) → **§4 The four pillars** (01 One place: every agent, one ledger · 02 The read: the Agent P&L · 03 The refinery: next best action per agent — retune, reroute, clone, cut — with stamped specimens · 04 The intelligence: a record you can ask, learning recommendations, market signals from the Benchmark) → **§5 Run it on your spend** (interactive calculator at the specimen's verdict rate, honestly labeled) → **§6 How it works** (3 steps + what-lands-where index + tiers) → **§7 Proof discipline** (grades compressed to a strip; fleet table retired from the landing — it lives in the demo).

The people's resolutions live inside the pillars (CFO → the read; support manager and sales director → the refinery). Doctrine §4.5 (the intelligence) covers the ask-the-record and market-signal features.

## PART 8 — DEFINITION OF DONE

1. `npm run build` clean; data assertions pass; deploys to Vercel; light mode only.
2. Verified at 390px width: funnel plays its mobile timeline, tier accordion works, tables scroll with pinned columns, CTA sheet is full-screen and keyboard-usable.
3. Hero communicates enemy + claim in ≤5s. Reduced motion shows resolved end-states everywhere.
4. Zero banned visuals, zero banned words (grep the codebase against the banned list), zero fabricated social proof, zero dark-mode variants.
5. Lead capture posts to the Formspree env endpoint; confirmation restates the 7-day promise and the "two files and a join key" checklist; README documents the env var.
6. Every number on every screen traces to Part 7. The dispute math, the 71%, the 94%, the $3.10→$1.21, the 8% vs 11%, and the $7,350 all appear where specified.
7. OG image renders correctly in a link preview; page titles and meta description set.
8. LCP < 2.5s; text contrast AA on paper; all interactive elements keyboard-reachable with visible focus.
9. The test, unchanged: a CFO seeing only Screen 3 asks "can you run this on our Q2 spend?" — and a manager seeing the Team view asks "why don't I have this for my agents?"
10. If anything was cut, it was cut in Degradation Law order — and the untouchables are flawless.
