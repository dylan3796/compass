# Compass — the management layer for the AI workforce

> Agents are employees. Compass does the performance reviews (scoring), the
> comp budget (token spend), the payroll report (the Agent P&L), promotions
> (cloning winners), hiring plans (the Opportunity Map), and the part nobody
> else does: checks delivered value against the projection each agent was
> hired on.

What lives here:

| Piece | Path | Audience |
|---|---|---|
| **Landing page** | `landing/index.html` | Investors + technical founders. Static, deploy-ready, no backend. Scripted Veritas AI walkthrough + FormSubmit-backed access form. |
| **Internal product** | `app/` (Streamlit) | Internal only — engine testing, live demos, investor calls. All dummy data. |
| **Fleet Audit kit** | `audit/` | The paid engagement ($2.5k–$10k): playbook, intake form, print-to-PDF report template. |
| **Opportunity Map** | `opportunity_map/` | "Which agents should we build?" — assessment framework, scorer, spec template, Veritas worked example. |
| **Collector** | `../collector/` | Claude Code Stop-hook collector + ingest — instrument a Claude-native fleet in 5 minutes. |

## Run the internal product

```bash
pip install -r compass/requirements.txt
streamlit run compass/app/app.py
```

First launch builds `data/compass.db` from `data/dummy_agents.json`, derives
agent health statuses (`core/agent_scorer.py`), and generates recommendations
(`core/recommender.py`). Delete `data/compass.db` to reset demo state
(applied recs, forked agents, guardrail edits).

## Regenerate the dummy dataset

```bash
python compass/data/generate_dummy_data.py   # re-anchors dates to today
rm -f compass/data/compass.db                # force re-seed on next launch
```

## The Veritas AI scenario

A 50-person SaaS company, 8 agents, 90 days of run history (~2,600 runs).
The dataset is engineered so every demo beat lands:

- **Summarizer** reads ~86k-token documents on an Opus-tier model →
  `right_size_model` tops the inbox (~$80/mo, Opus→Haiku) with
  `trim_context` re-priced after it (+$18/mo) so the two never
  double-count. It also runs ~3x its projected cost.
- **Support** completes ~34–37% of tasks with loop bursts →
  `add_guardrail` + `restructure_input` — and it delivers ~51% of the
  $4k/mo value projection it was specced with. The promised-vs-delivered
  panel on its detail page is the category.
- **Drafter** is the fleet's best prompt → `clone_best_performer` points
  Coder at it — and it beats its value projection (~139% of plan).
- **Outbound** quality falls off a cliff 3 weeks ago, right after the
  "v2 — punchy rewrite" prompt change → `prompt_regression`.
- **Analyst** has only ~15 days of history → NEW badge.
- **Scout/Coder** have no honest value model → the P&L shows "—", on
  purpose.

## Layout

```
compass/
  landing/index.html         landing page (static, self-contained)
  audit/                     Fleet Audit playbook, intake form, report template
  opportunity_map/           assessment.md, scoring.py, spec_template.md,
                             veritas_example.json
  data/
    schema.sql               SQLite schema (Agent incl. projections/unit value,
                             AgentRun, Recommendation, Guardrail, AgentVersion)
    generate_dummy_data.py   deterministic Veritas AI dataset generator
    dummy_agents.json        generated dataset (committed)
  core/
    cost_calculator.py       per-model pricing + tier metadata + right-size math
    agent_scorer.py          health scoring (4 dimensions → status)
    recommender.py           7 rules-based recommendation types
    pnl_generator.py         weekly Agent P&L (rows + email text + print HTML)
    db.py                    SQLite seeding, migration + access
  app/
    app.py                   Streamlit entry point
    theme.py / common.py     shared look & feel + data access
    pages/01..07             fleet overview, agent detail (projection vs.
                             actual), recommendations, guardrails, clone
                             studio, opportunity map, agent P&L
  email_templates/
    weekly_health_report.txt weekly P&L email concept (live version comes
                             from core/pnl_generator.render_text)
```

## North star demo flow

1. Fleet overview → **Agent P&L** (07): every agent a line item.
2. Summarizer runs Opus for a task Haiku handles → apply `right_size_model`,
   ~$80/mo back in one click.
3. Support completes 34% → apply the completion-checker guardrail.
4. The part nobody else does: Support was *projected* to save $4k/mo, it's
   delivering ~$2.1k — the Projection vs. Actual panel (02) shows why, the
   guardrail is the fix.
5. **Opportunity Map** (06): the three agents Veritas should build next,
   ranked, with specs — each projection becomes a tracked baseline.
6. Close: "this isn't a mockup" — the collector (`../collector/`) ingests a
   real Claude Code fleet in five minutes.
