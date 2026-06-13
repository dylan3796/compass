# Agent Spec — {{AGENT_NAME}}

> One page. If it doesn't fit on one page, the agent is doing too much — split it.

**Team / owner:** {{TEAM}} · {{OWNER}}
**Workflow replaced:** {{WORKFLOW_SENTENCE}}
**Opportunity Map score:** {{SCORE}}/100 (ROI {{ROI_SCORE}} · feasibility {{FEAS_SCORE}} · data {{DATA_SCORE}} · risk {{RISK_SCORE}})

## Job description

{{2–3 sentences: what this agent does, stated the way you'd brief a new hire. One job, clear
done-state, no "and also".}}

## Inputs → outputs

- **Input:** {{exact input shape — fields, source system, who/what triggers a run}}
- **Output:** {{exact output shape — format, length limits, where it lands}}
- **Trigger:** {{event | schedule | human request}} · expected volume {{N}}/month

## Model recommendation

`{{MODEL_ID}}` — {{one line: why this tier fits the task class; what would justify a tier up or
down}}. Token budget per run: ~{{IN_TOKENS}} in / ~{{OUT_TOKENS}} out.

## Guardrails required

- {{e.g. output validator: schema/regex the output must match}}
- {{e.g. completion checker: max N revisions, stall detection}}
- {{e.g. rate limit: max runs/hour, matched to trigger volume}}
- Escalation: {{when the agent must hand off to a human, and to whom}}

## Projections (the part Compass tracks)

| | Projected | Basis |
|---|---|---|
| Cost / month | {{$X}} | {{cost_basis: volume × token budget × model pricing}} |
| Value / month | {{$Y}} | {{value_basis: time recovered × loaded hourly cost — assumptions explicit}} |
| Success metric | {{the ONE number}} | {{how it's measured, and how often}} |

## Build vs. buy

{{2–3 sentences: is there an off-the-shelf product that does this? If buying, what it costs and
what's lost. If building, why owning the prompt/data loop is worth it.}}

**Substrate:** {{agent | code candidate}} — {{one line: if the work is formulaic, high-volume,
and cheaply checkable, deterministic logic may cost a fraction of an agent. Economics only —
the implementation (a script, a library, a SaaS) is the owner's call, and Compass tracks the
outcome the same way whichever substrate ships.}}

---

**When this agent ships, Compass tracks it against this projection.**
Projected cost and value above become the agent's baseline; the weekly Agent P&L reports
delivered-vs-promised from the first run.
