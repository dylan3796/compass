# Agent Opportunity Map — Assessment Framework

The answer to "we know we need agents, we don't know which ones." A structured workflow
inventory, not magic: 30 minutes per team lead, then `scoring.py` ranks the candidates.

Output: the 3–5 highest-ROI agent candidates, each with a one-page spec (`spec_template.md`),
projected monthly cost, projected monthly value, and a build-vs-buy note. Every projection
becomes a baseline Compass measures against once the agent ships — that handoff is the point.

---

## Per-team interview (30 min per team lead)

For each team, inventory the repetitive knowledge work. A candidate workflow is anything that is
**frequent, formulaic in shape, and currently done by a person who'd rather not.**

For every workflow named, capture (these map 1:1 to `scoring.py` input fields):

| Field | Question to ask | scoring.py field |
|---|---|---|
| Workflow | "Walk me through it — input to output." | `workflow` |
| Volume | "How many times per month?" | `volume_per_month` |
| Time cost | "Minutes per item, honestly?" | `minutes_per_item` |
| Who does it | "Whose hours? Rough loaded hourly cost?" | `hourly_cost_usd` |
| Error tolerance | "If the output is wrong 1 time in 20, what happens?" → high / medium / low tolerance | `error_tolerance` |
| Data availability | "Is the input digital, structured, and accessible — or scattered across inboxes?" → clean / partial / scattered | `data_availability` |
| Integration | "Where would the output need to land (CRM, Slack, repo)? Existing API?" → low / medium / high complexity | `integration_complexity` |
| Ground truth | "Could you tell, cheaply, whether the agent did it right?" | feeds the spec's success metric |

Prompts that surface workflows people forget to name:

- "What do you do every Monday that a smart intern could do with a checklist?"
- "What gets copy-pasted between tools?"
- "What report does someone assemble that nobody would assemble if it weren't expected?"
- "Where does work queue up waiting for one specific person?"

## Disqualifiers (note them, don't score them)

- **No ground truth and low error tolerance** — outputs can't be checked and mistakes are
  expensive. (E.g. final legal language.) Revisit when a human-review loop exists.
- **Volume under ~20/month** — automation overhead beats the savings; a saved prompt is enough.
- **The real problem is a process problem** — an agent would just do the wrong thing faster.

## Scoring (see `scoring.py` for exact weights and math)

| Dimension | Weight | What it captures |
|---|---|---|
| ROI potential | 40% | projected value (time recovered × loaded cost) vs. projected run cost |
| Technical feasibility | 25% | integration complexity + how well the task shape fits current models |
| Data readiness | 20% | clean / partial / scattered inputs |
| Risk | 15% | error tolerance + blast radius of a wrong output |

Run it: `python scoring.py veritas_example.json` (or any candidates JSON in the same shape).

## Output discipline

- Projected value is **time recovered × loaded hourly cost**, with assumptions written down in
  `value_basis`. No strategy-deck multipliers.
- Projected cost comes from a token-budget estimate per run (`cost_basis`), priced against
  `core/cost_calculator.py`.
- Every spec ends with: *"When this agent ships, Compass tracks it against this projection."*
