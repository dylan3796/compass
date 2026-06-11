# Compass — Agent ROI Observability

> Google Analytics for your AI agent fleet. Watches your agents, measures
> output vs. cost, surfaces underperformers, and gives you a one-click path
> to fix them.

**Status: pitch asset, not the product.** Everything in this directory is
demo material on engineered dummy data — useful for investor calls and for
prototyping engine ideas, but product effort goes into the CLI at the repo
root until the CLI has organic users. Engine ideas graduate by being ported
into `src/` against real `~/.claude/` data (the recommender made this jump
in `src/recommend/`); they don't ship from here.

Two deliverables live here:

| Piece | Path | Audience |
|---|---|---|
| **Landing page** | `landing/index.html` | Investors + technical founders. Static, deploy-ready, no backend. Includes the scripted Veritas AI walkthrough. |
| **Internal product** | `app/` (Streamlit) | Internal only — engine testing, live demos, investor calls. All dummy data. |

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
  `trim_context` fires with ~$89/mo estimated savings; token-breakdown
  chart shows input dwarfing output.
- **Outbound** quality falls off a cliff 3 weeks ago, right after the
  "v2 — punchy rewrite" prompt change in its version history →
  `prompt_regression`.
- **Support** completes ~34% of tasks with loop bursts →
  `add_guardrail` (completion checker) + `restructure_input`.
- **Drafter** is the fleet's best prompt → `clone_best_performer`
  points Coder at it; Clone Studio shows the side-by-side diff.
- **Analyst** has only ~15 days of history → NEW badge.

## Layout

```
compass/
  landing/index.html         landing page (static, self-contained)
  data/
    schema.sql               SQLite schema (Agent, AgentRun, Recommendation,
                             Guardrail, AgentVersion)
    generate_dummy_data.py   deterministic Veritas AI dataset generator
    dummy_agents.json        generated dataset (committed)
  core/
    cost_calculator.py       per-model cost normalization
    agent_scorer.py          health scoring (4 dimensions → status)
    recommender.py           6 rules-based recommendation types
    db.py                    SQLite seeding + access
  app/
    app.py                   Streamlit entry point
    theme.py / common.py     shared look & feel + data access
    pages/01..05             fleet overview, agent detail, recommendations,
                             guardrails, clone studio
  email_templates/
    weekly_health_report.txt "your weekly agent health report" concept
```

## North star demo flow

Fleet Overview → click Support (34% completion) → apply the completion-checker
guardrail → open Summarizer → token breakdown → apply trim-context ($89/mo) →
Clone Studio → copy Drafter's structure to Coder → fork Coder v2.
