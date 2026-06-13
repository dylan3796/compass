"""Lightweight checks for the codify / substrate-agnostic-ROT additions.

No pytest dependency — run directly:  python tests/test_codify_backtest.py
Builds a throwaway in-memory dataset so it never touches the demo DB.
"""

import sqlite3
import sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from core.backtest import backtest_codify, backtest_model_switch
from core.codify import build_codify_spec_md, codify_economics
from core.cost_calculator import cost_per_run
from opportunity_map.scoring import _codify_flag


def _mem_db():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript((ROOT / "data" / "schema.sql").read_text())
    conn.execute(
        "INSERT INTO Agent (id, name, type, model, status, substrate) "
        "VALUES ('ag_x', 'X', 'classification', 'claude-opus-4-8', 'healthy', 'agent')")
    now = datetime.now()
    for i in range(40):
        cost = cost_per_run("claude-opus-4-8", 20000, 50)
        conn.execute(
            "INSERT INTO AgentRun (id, agent_id, run_at, input_tokens, output_tokens, "
            "total_cost_usd, latency_ms, task_completed, output_quality_score) "
            "VALUES (?, 'ag_x', ?, 20000, 50, ?, 3000, 1, 0.93)",
            (f"r{i}", (now - timedelta(days=i % 20)).isoformat(), cost))
    conn.commit()
    return conn


def test_codify_economics_and_spec():
    conn = _mem_db()
    econ = codify_economics(conn, "ag_x", drift_frac=0.15)
    assert abs(econ["savings"] - econ["cost_mo"] * 0.85) < 1e-6, "savings = cost_mo × 0.85"
    assert econ["est_code_cost_mo"] > 0 and econ["est_code_cost_mo"] < econ["cost_mo"]

    agent = conn.execute("SELECT * FROM Agent WHERE id='ag_x'").fetchone()
    spec = build_codify_spec_md(agent, econ)
    assert "```" not in spec, "spec must contain NO code blocks (it is not code)"
    assert "does not build or run" in spec, "spec must carry the identity guardrail"
    assert "## Projections" in spec and "## Build vs. buy" in spec
    print("ok  codify economics + spec")


def test_backtests_are_simulated_and_quality_untouched():
    conn = _mem_db()
    bm = backtest_model_switch(conn, "ag_x", "claude-haiku-4-5")
    assert bm["label"] == "simulated"
    assert bm["counterfactual_cost"] < bm["actual_cost"], "haiku cheaper than opus"
    assert "quality" not in bm and "completion" not in bm, "no simulated quality/completion"
    assert "not simulated" in bm["note"]

    bc = backtest_codify(conn, "ag_x", deterministic_share=1.0, drift_frac=0.15)
    assert bc["label"] == "simulated"
    assert abs(bc["counterfactual_cost"] / bc["actual_cost"] - 0.15) < 0.01, "≈15% drift reserve"
    print("ok  backtests simulated + quality untouched")


def test_codify_flag():
    base = dict(error_tolerance="high", volume_per_month=500,
                data_availability="clean", tokens_per_run={"input": 20000, "output": 50})
    flag, note = _codify_flag(base)
    assert flag and "deterministic logic" in note

    # generative (big output) -> not a codify candidate
    gen = {**base, "tokens_per_run": {"input": 4000, "output": 3000}}
    assert not _codify_flag(gen)[0]
    # low volume -> not a candidate
    assert not _codify_flag({**base, "volume_per_month": 10})[0]
    print("ok  codify flag")


if __name__ == "__main__":
    test_codify_economics_and_spec()
    test_backtests_are_simulated_and_quality_untouched()
    test_codify_flag()
    print("\nAll codify/backtest checks passed.")
