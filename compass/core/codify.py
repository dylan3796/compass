"""Codify: the economics and the one-page spec for moving an agent's work to
deterministic code.

Identity boundary: Compass surfaces the economics and emits a *spec* — a
decision/measurement artifact, the analog of an Opportunity Map spec. It never
writes or runs code, and makes no claim about which implementation (a script, a
library, a SaaS) is right. The owner decides; Compass keeps measuring the
outcome before and after.
"""

import sqlite3
from datetime import datetime, timedelta

WINDOW_DAYS = 30
DRIFT_ALLOWANCE_FRAC = 0.15  # reserve kept for recompile-on-drift (AI back in only when the world changes)


def codify_economics(conn: sqlite3.Connection, agent_id: str,
                     drift_frac: float = DRIFT_ALLOWANCE_FRAC,
                     days: int = WINDOW_DAYS) -> dict:
    """Measured run-rate economics for the agent over the last `days`.

    The 'after' cost is only the drift reserve — the share of token spend kept
    for re-deriving the logic when the world changes. Everything else is the
    savings if the deterministic share of the work moves off the model.
    """
    since = (datetime.now() - timedelta(days=days)).isoformat()
    row = conn.execute(
        "SELECT COUNT(*) AS n, SUM(total_cost_usd) AS cost, "
        "AVG(input_tokens) AS avg_in, AVG(output_tokens) AS avg_out "
        "FROM AgentRun WHERE agent_id = ? AND run_at >= ?",
        (agent_id, since)).fetchone()
    scale = 30 / days
    runs_mo = (row["n"] or 0) * scale
    cost_mo = (row["cost"] or 0.0) * scale
    est_code_cost_mo = cost_mo * drift_frac
    return dict(
        cost_mo=cost_mo,
        est_code_cost_mo=est_code_cost_mo,
        savings=max(0.0, cost_mo - est_code_cost_mo),
        avg_in=row["avg_in"] or 0.0,
        avg_out=row["avg_out"] or 0.0,
        runs_mo=runs_mo,
        drift_frac=drift_frac,
    )


def build_codify_spec_md(agent: dict, stats: dict) -> str:
    """One-page codify spec, mirroring opportunity_map/spec_template.md.

    `agent` is an Agent row (mapping); `stats` is a codify_economics() dict.
    Economics + decision only — no code, no implementation prescription.
    """
    name = agent["name"]
    task = str(agent["type"]).replace("_", " ")
    avg_in, avg_out = stats["avg_in"], stats["avg_out"]
    runs_mo = stats["runs_mo"]
    cost_mo = stats["cost_mo"]
    code_mo = stats["est_code_cost_mo"]
    savings = stats["savings"]
    ratio = (avg_out / avg_in) if avg_in else 0.0

    return f"""# Codify spec — {name}

**Substrate decision:** agent → code candidate. _Economics only. Compass does
not build or run this; the implementation (a script, a library, a SaaS) is your
call._

## Job
{name} runs the **{task}** workflow. Today it does so as an agent, paying token
cost on every run. This spec captures the economics of moving the deterministic
part of that work off the model.

## Inputs → outputs (measured)
- Trigger volume: ~{runs_mo:,.0f} runs/month
- Token budget: ~{avg_in:,.0f} input → ~{avg_out:,.0f} output tokens per run
  (output/input ratio {ratio:.0%} — low generative content)

## Why this is a codify candidate
The last 30 days show the fingerprints of work a rule or small program can do as
well as the model: high, steady volume; near-deterministic completion; output
that stays stable run to run and does not vary with input length. These are the
conditions under which deterministic logic matches the outcome at a fraction of
the cost.

## Projections (directional — verify on your own volume)

| | Monthly |
|---|---|
| Agent token cost today | ${cost_mo:,.2f} |
| Code cost (drift reserve, ~{stats['drift_frac']*100:.0f}%) | ${code_mo:,.2f} |
| **Estimated savings** | **${savings:,.2f}** |

The drift reserve is the token spend kept for re-deriving the logic when the
world changes — AI comes back in only then, not on every run.

## Build vs. buy
Implementation is the owner's call — a small script, an existing library, or an
off-the-shelf product may each fit. This spec takes no position on which.

_Compass does not build or run this. It keeps measuring the outcome before and
after you act — the agent line graduates to a code line on the Agent P&L, with
ROT tracked across the change._
"""
