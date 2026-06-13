"""Read-only what-if / backtest.

Replays an agent's ACTUAL historical runs under a changed rule and reports the
counterfactual. Two honesty rules, always:

- It re-prices or zeros only *real* token counts. It never simulates quality or
  completion (that would be inventing outcomes).
- It never runs anything and never persists. Every result carries
  `label: "simulated"`. The customer decides whether to act.
"""

import sqlite3
from datetime import datetime, timedelta

from core.codify import DRIFT_ALLOWANCE_FRAC
from core.cost_calculator import cost_per_run, model_label

WINDOW_DAYS = 30
_NOTE = ("Token counts are real historical runs; only the cost rule changed. "
         "Quality and completion are not simulated. Directional — verify on a sample.")


def _load_runs(conn: sqlite3.Connection, agent_id: str, days: int):
    since = (datetime.now() - timedelta(days=days)).isoformat()
    return conn.execute(
        "SELECT input_tokens, output_tokens, total_cost_usd FROM AgentRun "
        "WHERE agent_id = ? AND run_at >= ?", (agent_id, since)).fetchall()


def _scaled(actual, counterfactual, n, days):
    scale = 30 / days
    return dict(
        runs=n, days=days, label="simulated",
        actual_cost=round(actual, 2), counterfactual_cost=round(counterfactual, 2),
        delta_cost=round(actual - counterfactual, 2),
        actual_cost_mo=round(actual * scale, 2),
        counterfactual_cost_mo=round(counterfactual * scale, 2),
        delta_cost_mo=round((actual - counterfactual) * scale, 2),
        note=_NOTE)


def backtest_model_switch(conn: sqlite3.Connection, agent_id: str,
                          target_model: str, days: int = WINDOW_DAYS) -> dict:
    """Re-price the agent's real runs under target_model's pricing."""
    runs = _load_runs(conn, agent_id, days)
    actual = sum(r["total_cost_usd"] for r in runs)
    counterfactual = sum(cost_per_run(target_model, r["input_tokens"], r["output_tokens"])
                         for r in runs)
    out = _scaled(actual, counterfactual, len(runs), days)
    out.update(mode="model_switch", target_model=target_model,
               target_label=model_label(target_model))
    return out


def backtest_codify(conn: sqlite3.Connection, agent_id: str,
                    deterministic_share: float = 1.0,
                    drift_frac: float = DRIFT_ALLOWANCE_FRAC,
                    days: int = WINDOW_DAYS) -> dict:
    """Cost if the deterministic share of the work moved off the model.

    counterfactual = actual×(1−share)  +  actual×share×drift_frac
    """
    runs = _load_runs(conn, agent_id, days)
    actual = sum(r["total_cost_usd"] for r in runs)
    counterfactual = actual * (1 - deterministic_share) + actual * deterministic_share * drift_frac
    out = _scaled(actual, counterfactual, len(runs), days)
    out.update(mode="codify", deterministic_share=deterministic_share, drift_frac=drift_frac)
    return out
