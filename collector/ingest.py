#!/usr/bin/env python3
"""Ingest collector records into Compass.

Reads ~/.compass/runs.jsonl (or a path you pass), normalizes each record
into the AgentRun schema, and loads it into the Compass SQLite database.
Agents are created on first sight. Idempotent: records carry a stable id
derived from (session, agent, ts), so re-running never duplicates rows.

Usage:
  python collector/ingest.py                          # ~/.compass/runs.jsonl -> compass/data/compass.db
  python collector/ingest.py path/to/runs.jsonl       # explicit source
  python collector/ingest.py runs.jsonl --db out.db   # explicit target (created if missing)
"""

import argparse
import hashlib
import json
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "compass"))

from core.cost_calculator import MODEL_PRICING, cost_per_run  # noqa: E402

DEFAULT_RUNS = Path.home() / ".compass" / "runs.jsonl"
SCHEMA = REPO_ROOT / "compass" / "data" / "schema.sql"


def normalize_model(model: str) -> str:
    """Map a raw model id onto a pricing-table key (longest prefix wins)."""
    if model in MODEL_PRICING:
        return model
    matches = [k for k in MODEL_PRICING if model.startswith(k) or k.startswith(model)]
    if matches:
        return max(matches, key=len)
    # date-suffixed ids like claude-haiku-4-5-20251001
    for k in MODEL_PRICING:
        if model.rsplit("-", 1)[0] == k:
            return k
    return model  # unknown — cost_per_run falls back to DEFAULT_PRICING


def agent_id_for(name: str) -> str:
    return "ag_cc_" + hashlib.sha1(name.encode()).hexdigest()[:8]


def run_id_for(rec: dict) -> str:
    key = f"{rec.get('session_id')}|{rec.get('agent')}|{rec.get('ts')}"
    return "run_cc_" + hashlib.sha1(key.encode()).hexdigest()[:12]


def open_db(db_path: Path | None) -> sqlite3.Connection:
    if db_path is None:
        from core.db import get_conn  # default Compass db, with migrations applied
        return get_conn()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA.read_text())
    return conn


def ingest(runs_path: Path, conn: sqlite3.Connection) -> tuple[int, int]:
    inserted = skipped = 0
    for line in open(runs_path):
        line = line.strip()
        if not line:
            continue
        rec = json.loads(line)
        rid = run_id_for(rec)
        if conn.execute("SELECT 1 FROM AgentRun WHERE id = ?", (rid,)).fetchone():
            skipped += 1
            continue

        name = rec.get("agent") or "unknown"
        aid = agent_id_for(name)
        model = normalize_model(rec.get("model") or "unknown")
        ts = rec.get("ts") or datetime.now().isoformat()

        if not conn.execute("SELECT 1 FROM Agent WHERE id = ?", (aid,)).fetchone():
            conn.execute(
                "INSERT INTO Agent (id, name, type, model, program, status, created_at, last_run) "
                "VALUES (?, ?, 'claude_code', ?, 'Claude Code', 'healthy', ?, ?)",
                (aid, name, model, ts, ts))
        else:
            conn.execute("UPDATE Agent SET last_run = MAX(last_run, ?), model = ? "
                         "WHERE id = ?", (ts, model, aid))

        # Prototype simplification: cache writes/reads are priced as plain
        # input tokens, which overstates cached-heavy sessions. Good enough
        # to see the fleet; not an invoice.
        input_total = ((rec.get("input_tokens") or 0)
                       + (rec.get("cache_creation_input_tokens") or 0)
                       + (rec.get("cache_read_input_tokens") or 0))
        output = rec.get("output_tokens") or 0
        conn.execute(
            "INSERT INTO AgentRun (id, agent_id, run_at, input_tokens, output_tokens, "
            "total_cost_usd, latency_ms, task_completed, output_quality_score, notes) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)",
            (rid, aid, ts, input_total, output,
             round(cost_per_run(model, input_total, output), 6),
             rec.get("latency_ms") or 0,
             1 if rec.get("status") == "ok" else 0,
             f"session {rec.get('session_id', '')[:8]} · {rec.get('n_messages', 0)} messages"))
        inserted += 1
    conn.commit()
    return inserted, skipped


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("runs", nargs="?", default=DEFAULT_RUNS, type=Path)
    ap.add_argument("--db", type=Path, default=None,
                    help="target SQLite file (default: the Compass app db)")
    args = ap.parse_args()
    if not args.runs.is_file():
        sys.exit(f"No collector log at {args.runs} — is the Stop hook installed?")
    conn = open_db(args.db)
    inserted, skipped = ingest(args.runs, conn)
    agents = conn.execute("SELECT COUNT(*) AS n FROM Agent WHERE id LIKE 'ag_cc_%'").fetchone()["n"]
    print(f"Ingested {inserted} runs ({skipped} already present) across {agents} "
          f"Claude Code agents. Open the dashboard: streamlit run compass/app/app.py")


if __name__ == "__main__":
    main()
