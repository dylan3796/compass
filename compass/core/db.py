"""SQLite access layer. Builds compass.db from dummy_agents.json on first use."""

import json
import sqlite3
from pathlib import Path

COMPASS_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = COMPASS_ROOT / "data"
DB_PATH = DATA_DIR / "compass.db"
SCHEMA_PATH = DATA_DIR / "schema.sql"
JSON_PATH = DATA_DIR / "dummy_agents.json"


def get_conn() -> sqlite3.Connection:
    fresh = not DB_PATH.exists()
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    if fresh:
        _seed(conn)
    return conn


def reset_db():
    if DB_PATH.exists():
        DB_PATH.unlink()


def _seed(conn: sqlite3.Connection):
    if not JSON_PATH.exists():
        import subprocess, sys
        subprocess.run([sys.executable, str(DATA_DIR / "generate_dummy_data.py")], check=True)
    conn.executescript(SCHEMA_PATH.read_text())
    data = json.loads(JSON_PATH.read_text())

    conn.executemany(
        "INSERT INTO Agent (id, name, type, model, program, purpose, task_noun, "
        "status, created_at, last_run) "
        "VALUES (:id, :name, :type, :model, :program, :purpose, :task_noun, "
        ":status, :created_at, :last_run)",
        [{"purpose": None, "task_noun": None, **a} for a in data["agents"]])
    conn.executemany(
        "INSERT INTO AgentRun (id, agent_id, run_at, input_tokens, output_tokens, "
        "total_cost_usd, latency_ms, task_completed, output_quality_score, notes) "
        "VALUES (:id, :agent_id, :run_at, :input_tokens, :output_tokens, "
        ":total_cost_usd, :latency_ms, :task_completed, :output_quality_score, :notes)",
        data["runs"])
    conn.executemany(
        "INSERT INTO Guardrail (id, agent_id, name, type, config, active, "
        "last_triggered, last_triggered_note, created_at) "
        "VALUES (:id, :agent_id, :name, :type, :config, :active, "
        ":last_triggered, :last_triggered_note, :created_at)",
        data["guardrails"])
    conn.executemany(
        "INSERT INTO AgentVersion (id, agent_id, parent_version_id, label, "
        "prompt_snapshot, config_snapshot, created_at, created_by) "
        "VALUES (:id, :agent_id, :parent_version_id, :label, "
        ":prompt_snapshot, :config_snapshot, :created_at, :created_by)",
        data["versions"])
    conn.commit()

    # Derive health statuses and recommendations from the run data itself
    from core.agent_scorer import refresh_statuses
    from core.recommender import refresh_recommendations
    refresh_statuses(conn)
    refresh_recommendations(conn)
    conn.commit()
