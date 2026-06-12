# Outcome Onboarding — Spec

How a customer goes from "we run agents" to "every agent reports against plan"
in under 30 minutes, and exactly what they specify vs. what Compass supplies.

## Principles

1. **Ask economics, never mechanics.** The customer answers questions only
   about their business (rates, expectations, identities). Measurement —
   queries, baselines, attribution windows, quality checks — is Compass's job.
2. **Outcomes live in systems of record.** Delivered value is read from the
   customer's CRM / helpdesk / billing via MCP, never from agent self-reports.
3. **Confidence tiers, displayed on every P&L line:**
   - `verified` — units counted in the system of record
   - `modeled` — verified units × customer-confirmed assumptions (assumptions shown)
   - `—` — no honest value model yet; no number is invented
4. **Every accepted default is a recorded assumption.** Shown on the P&L,
   editable later, versioned.
5. **Three views on every line: level, delta, post-change.** Level vs. plan
   (accountability), week-over-week delta (direction), and delta since the
   last change — prompt edit, model switch, guardrail (verification). A line
   that only shows level hides both the trend and whether the last
   intervention worked.

## The flow

| Step | Who | Time | What happens |
|---|---|---|---|
| 1. Connect | Customer | ~5 min | One MCP config line per agent harness (Claude Code, Codex, SDK). Compass observes runs: cost, tools called, completion. |
| 2. Discover | Compass | automatic | Telemetry names the outcome system: tool calls (`mcp__salesforce__*`), artifacts, volume. Compass classifies the agent against the template library and proposes an outcome binding. |
| 3. Bind | Customer | ~5 min/agent | Approve the proposed binding. Grant read-only MCP connection to the system of record. Confirm the agent's identity in that system (so only agent-made changes count). |
| 4. Set economics | Customer | ~5 min/agent | Confirm or edit two numbers: the unit assumption (benchmark default provided) and the plan — what the agent was hired to deliver per month. |
| 5. Reconcile | Compass | weekly, forever | Baseline, then weekly P&L vs. plan. Guardrails, regression and loop detection run automatically; no customer specification. |

## Worked example

A company runs two agents:

### Agent A — call summarizer with action items

- **Discovery:** reads call transcripts, emits summaries + action items →
  classified `meeting_intelligence`.
- **Verified units:** calls summarized (count from telemetry / output artifacts).
- **Modeled dollars:** minutes saved per summarized call (default 15,
  customer-editable) × loaded rate.
- **Quality signals (Compass-owned):** heavy post-edit rate on summaries →
  quality flag; summary volume vs. call volume → coverage.
- **Upgrade path:** if action items land as CRM/task-system records, task
  completion rate is verifiable in the system of record — the line item
  graduates from `modeled` toward `verified`.

### Agent B — Salesforce contact updater

- **Discovery:** calls `mcp__salesforce__update_contact` ~40×/day →
  classified `crm_hygiene`.
- **Verified units:** contacts modified by the agent's integration user,
  read from Salesforce (read-only MCP). Reverted-within-7-days updates are
  excluded — Compass's default quality check.
- **Modeled dollars:** minutes of manual entry avoided per record (default 4,
  customer-editable) × loaded rate.
- This is the fully verifiable case: units, identity, and reversals all live
  in the system of record.

### Outcome definition (schema sketch)

```yaml
agent: sfdc-contact-updater
observe: mcp                      # how runs are captured
outcome:
  system: salesforce              # MCP connector, read-only
  template: crm_hygiene/records_maintained
  identity: "compass-agent@acme.com"      # customer-confirmed
  unit: contact_updated
  quality_check: not_reverted_within_7d   # Compass default, editable
  unit_value:
    basis: labor_substitution
    minutes_per_unit: 4           # benchmark default, customer-editable
    loaded_rate_usd_hr: 65        # customer-supplied
  projection:                     # "the plan it was hired on"
    units_per_month: 1200
    usd_per_month: 5200
  confidence: verified_units      # units verified; dollars modeled
```

## Division of labor (~80 / 20)

**Compass supplies:** agent discovery + classification, the outcome template
library, measurement queries, quality checks, unit-value benchmark defaults,
baselines, attribution windows, all P&L math, confidence labeling, guardrail /
regression / loop detection.

**Customer supplies:** two MCP credentials, one identity confirmation per
agent, two business numbers per agent (unit assumption + plan), and approval
of the proposed binding. ~10 minutes per agent.

## Ingestion tiers (what "connect your agent" actually captures)

MCP alone is not a telemetry channel — an MCP server only sees calls made to
it (no system prompt, no other tools' traffic, no token counts). Step 1
therefore has three real mechanisms, with capability degrading by tier:

| Tier | Mechanism | Captures | Enables |
|---|---|---|---|
| Hooks (Claude Code plugin, built) | Stop-hook collector | Runs, cost, transcripts, CLAUDE.md / instructions, slash commands, subagents, tool calls | Everything, incl. instruction-file versioning |
| Gateway / proxy (adapter, planned) | LLM request proxy (LiteLLM-style) | Every request: full system prompt as sent, tokens, model | Cost + prompt content for any framework; per-run prompt hashing → automatic change detection |
| Pure MCP | Agent-invoked reporting only | Only what the agent chooses to call | Weakest; use MCP for outcome systems (step 2), not agent telemetry (step 1) |

Recommendations degrade gracefully: cost/right-size works at every tier;
prompt regression and clone-best-performer require hooks or gateway.

## Step 2 v1: named connectors × outcome templates

Do not build "query any MCP server." V1 scope:

- **Two systems** (Salesforce, Zendesk), **~3 templates each** (records
  maintained, tickets deflected, tasks created). Each template = a
  parameterized query against that system's known MCP tools + identity
  filter + quality check.
- **Discovery prefills** template parameters from the agent's observed
  writes; customer confirms identity + two numbers.
- **Baseline backfill:** systems of record carry timestamps
  (`LastModifiedDate`), so the pre-agent baseline is computed retroactively
  at connect time — variance numbers on day one, no waiting period.
- **Off-template fallback:** an LLM explores the connected system's MCP
  tools and *drafts* the outcome definition; the customer approves it.
  Every approved draft is generalized into the template library — the
  library compounds with each customer.

## Fleet-level insights (cross-agent)

Identity-per-agent makes the fleet legible as a graph: agent ↔ objects touched
in each system of record. Per-agent optimizers (routers, prompt tuners) cannot
see cross-agent interaction by construction; this view is unique to the
outcome layer. Findings, each with a distinct fix:

- **Duplication** — two agents produce the same outcome on the same objects.
  Priced directly: both agents' run costs joined on (system, object id, time
  window). _"Summarizer and Notetaker both processed 312 calls — $61/mo
  producing one outcome twice."_ → recommendation: `consolidate_overlap`.
- **Conflict** — agents undoing each other's work (revert detected, reverter
  is another agent identity). Worse than waste: it inflates both agents' run
  counts and corrupts their delivered-value lines. → recommendation:
  `resolve_conflict`; also protects ledger integrity.
- **Consolidation** — two agents do similar work at different quality/cost.
  Fleet-level sibling of `clone_best_performer`: retire the weaker agent.
- **Gaps** — objects/queues no agent touches. Feeds the Opportunity Map.

## Open questions

- **Attribution beyond identity:** outcomes in shared systems move for many
  reasons. v1 answer: count only agent-identity changes (Agent B) or direct
  artifacts (Agent A); label aggregate-metric outcomes (e.g. ticket
  deflection) as correlated against baseline, with holdout cohorts as the
  paid upgrade.
- **Multiple agents writing to one system:** identity-per-agent is the
  requirement; the wizard should detect shared credentials and ask to split.
- **Identity auto-detection:** the integration user is usually visible in the
  agent's own MCP auth — propose it, ask only for confirmation.
- **Benchmark flywheel:** every confirmed unit assumption and every measured
  completion rate feeds anonymized benchmarks ("agents like this at companies
  your size"), which improve the defaults the next customer sees.
