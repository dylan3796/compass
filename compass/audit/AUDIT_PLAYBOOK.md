# The Agent Fleet Audit — Playbook

A paid engagement ($2,500–$10,000 by fleet size) that produces one artifact: a report telling a
company every agent it runs (including the shadow agents nobody tracks), what each costs, what's
broken, what to consolidate, and what to build next.

**The rule that keeps this from eating the company:** every engagement must extract something into
this playbook or the product — a new detector threshold, a new intake question, a new report
section. If an audit teaches nothing new, the productized version is ready.

---

## Pricing tiers

| Tier | Fleet size | Price | Scope |
|---|---|---|---|
| Starter | 1–5 agents (or "we think we have agents?") | $2,500 | Inventory + scorecards + Fix List |
| Standard | 6–15 agents | $5,000 | + Build List (Opportunity Map) + 90-day roadmap |
| Fleet | 16+ agents or multi-team | $10,000 | + per-team workshops, consolidation plan |

Every tier ends with the same close: "Compass tracks these numbers continuously. The audit is the
snapshot; the platform is the loop."

---

## Phase 0 — Scoping call (45 min)

Use `intake_form.md`. Goals: confirm tier, identify the data owner (the person who can actually
export logs), set the two-week clock, and get the one sentence that matters:
**"What did you expect agents to do for you, and what do they actually do?"**
That gap is the report's spine.

## Phase 1 — Data collection (client does this, we chase)

Checklist — request everything, expect half:

- [ ] **LLM provider usage exports** — Anthropic Console / OpenAI usage CSVs, last 90 days,
      broken out by API key. API keys ≈ agents more often than anyone admits.
- [ ] **Claude Code / Agent SDK teams**: run `compass-cli scan` locally (or install the
      `/collector` hooks) and send the generated report — zero-friction inventory for
      Claude-native fleets.
- [ ] **Application logs** for anything calling an LLM in production (request/response sizes,
      timestamps, success/failure signals).
- [ ] **Prompt inventory** — every system prompt, wherever it lives (repo, Notion, someone's
      drafts). Version history if it exists.
- [ ] **The bill** — actual invoices. Reconciling invoice totals against what the team *thinks*
      it spends is reliably the first "oh no" of the engagement.
- [ ] **Org context** — which team owns each workflow, headcount cost of the work agents are
      supposed to replace.

Shadow-agent sweep: search the codebase for SDK imports and API base URLs
(`anthropic`, `openai`, `api.anthropic.com`, `litellm`, `langchain`), search expense reports for
LLM vendors, and ask each team lead "what have you wired up yourself?" Every audit so far finds
at least one agent nobody on the platform team knew about — that finding alone usually pays for
the audit in credibility.

## Phase 2 — Load and instrument

1. Normalize whatever arrived into the `AgentRun` schema (`compass/data/schema.sql`):
   per run — tokens in/out, model, cost, latency, completed?, quality where measurable.
   `collector/ingest.py` handles Claude Code JSONL; everything else is a one-off mapping script
   (save it — it becomes a connector).
2. Where per-run data doesn't exist, reconstruct monthly aggregates from usage exports. Mark
   these agents "estimated" in the report — never present reconstructed numbers as measured.

## Phase 3 — Analysis (the Compass engines, run by hand where needed)

**Scoring rubric** — the four dimensions from `core/agent_scorer.py`, in order of objectivity:

| Dimension | Weight | Source | Honesty rule |
|---|---|---|---|
| Task completion | 35% | logs / completion signals | objective — lead with it |
| Output quality | 30% | human rating of 20–30 sampled outputs per agent | directional — say "rated sample", never "measured" |
| Cost efficiency | 20% | cost per 1k output tokens vs. fleet peers | objective |
| Prompt efficiency | 15% | input:output ratio, context bloat | objective |

Health: ≥75 healthy · 45–75 needs attention · <45 (or completion <50%) critical.

**Run all seven detectors** (from `core/recommender.py`) against the loaded data:

1. `right_size_model` — over-provisioned model for the task class. The most quantifiable finding
   in the report; lead the Fix List with it when it fires.
2. `trim_context` — input tokens far above peers, input:output ≥ 12:1.
3. `add_guardrail` — completion < 60%; cost out the failed runs.
4. `prompt_regression` — quality drop > 20% across 2-week windows; correlate with prompt history.
5. `rate_limit` — run bursts with no matching trigger volume (loops).
6. `clone_best_performer` — bottom-40% quality with an in-house better prompt to copy.
7. `restructure_input` — quality degrades with input length.

Every Fix List item gets an estimated monthly dollar impact and a "how detected" line. If two
fixes overlap on the same spend (e.g. right-size + trim on one agent), say so — combined savings
are capped at current spend. Never double-count in the executive summary.

## Phase 4 — The Build List

Run the Opportunity Map assessment (`../opportunity_map/assessment.md`) with each team lead
(30 min each). Score candidates with `../opportunity_map/scoring.py`. Top 3–5 go in the report
with a one-page spec each (`../opportunity_map/spec_template.md`).

Every spec ends with the handoff sentence: *"When this agent ships, Compass tracks it against
this projection."* The Build List is what converts an audit into a platform subscription.

## Phase 5 — Report and delivery

Assemble `report_template/report.html` (placeholders documented in the file). Sections:

1. Executive summary — fleet health in one page, three numbers up top:
   monthly spend, recoverable spend, unrealized value (the Build List total).
2. Agent inventory — every agent, owner, model, monthly cost, status. Shadow agents flagged.
3. Per-agent scorecards.
4. The Fix List — ranked by estimated dollar impact.
5. The Build List — ranked by projected ROI, with specs.
6. 90-day roadmap — weeks 1–2 quick wins (right-sizing, guardrails), month 1 fixes,
   months 2–3 builds + instrumentation.

Deliver live (60 min), CFO-grade summary first, engineers' appendix after. Print to PDF from the
template — it's styled for both.

**Close:** the projections in the Build List are baselines. Offer the platform to track
promised-vs-delivered on everything in the report. That loop is the product.

## Post-engagement (same week, non-negotiable)

- [ ] What did this audit teach that the playbook didn't already know? Add it above.
- [ ] Any manual analysis done twice now? File an issue to productize it.
- [ ] Anonymized metrics → the benchmarks dataset (median completion by agent type, etc.).
