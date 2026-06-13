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
    else:
        _migrate(conn)
    return conn


# Columns added after the v1 schema; existing compass.db files get them via
# ALTER TABLE (values stay NULL until the demo data is regenerated).
AGENT_V2_COLUMNS = {
    "projected_cost_usd_mo": "REAL",
    "projected_value_usd_mo": "REAL",
    "projection_source": "TEXT",
    "unit_value_usd": "REAL",
    "value_basis": "TEXT",
    # Substrate-agnostic ROT: an agent can graduate to deterministic code.
    # NULL reads as 'agent' everywhere (see substrate_of).
    "substrate": "TEXT",
    "code_graduated_at": "TIMESTAMP",
    "codify_spec_id": "TEXT",
}

# Mirror of the CodifySpec DDL in schema.sql so migrated (pre-existing) DBs
# gain the table too. Keep the two in sync.
CODIFY_SPEC_DDL = """
CREATE TABLE IF NOT EXISTS CodifySpec (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES Agent(id),
  recommendation_id TEXT,
  title TEXT,
  body_md TEXT,
  est_agent_cost_usd_mo REAL,
  est_code_cost_usd_mo REAL,
  est_savings_usd_mo REAL,
  created_at TIMESTAMP,
  created_by TEXT
);
"""


def substrate_of(row) -> str:
    """Read an Agent row's substrate, treating NULL/missing as 'agent'."""
    try:
        return row["substrate"] or "agent"
    except (KeyError, IndexError, TypeError):
        return "agent"


def _migrate(conn: sqlite3.Connection):
    existing = {r["name"] for r in conn.execute("PRAGMA table_info(Agent)").fetchall()}
    for col, sqltype in AGENT_V2_COLUMNS.items():
        if col not in existing:
            conn.execute(f"ALTER TABLE Agent ADD COLUMN {col} {sqltype}")
    conn.executescript(CODIFY_SPEC_DDL)
    conn.commit()


def reset_db():
    if DB_PATH.exists():
        DB_PATH.unlink()


# Older dummy_agents.json files may predate the value-assurance fields
AGENT_DEFAULTS = {
    "projected_cost_usd_mo": None,
    "projected_value_usd_mo": None,
    "projection_source": None,
    "unit_value_usd": None,
    "value_basis": None,
    "substrate": "agent",
    "code_graduated_at": None,
    "codify_spec_id": None,
}


def _seed(conn: sqlite3.Connection):
    if not JSON_PATH.exists():
        import subprocess, sys
        subprocess.run([sys.executable, str(DATA_DIR / "generate_dummy_data.py")], check=True)
    conn.executescript(SCHEMA_PATH.read_text())
    data = json.loads(JSON_PATH.read_text())

    conn.executemany(
        "INSERT INTO Agent (id, name, type, model, program, status, created_at, last_run, "
        "projected_cost_usd_mo, projected_value_usd_mo, projection_source, "
        "unit_value_usd, value_basis, substrate, code_graduated_at, codify_spec_id) "
        "VALUES (:id, :name, :type, :model, :program, :status, :created_at, :last_run, "
        ":projected_cost_usd_mo, :projected_value_usd_mo, :projection_source, "
        ":unit_value_usd, :value_basis, :substrate, :code_graduated_at, :codify_spec_id)",
        [{**AGENT_DEFAULTS, **a} for a in data["agents"]])
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
