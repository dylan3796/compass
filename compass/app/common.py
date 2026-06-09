"""Shared data access + actions for all Streamlit pages."""

import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

COMPASS_ROOT = Path(__file__).resolve().parents[1]
if str(COMPASS_ROOT) not in sys.path:
    sys.path.insert(0, str(COMPASS_ROOT))

import pandas as pd  # noqa: E402
import streamlit as st  # noqa: E402

from core import db  # noqa: E402
from core.agent_scorer import is_new_agent, score_agents  # noqa: E402
from core.recommender import refresh_recommendations  # noqa: E402


@st.cache_resource
def conn():
    return db.get_conn()


def agents_df() -> pd.DataFrame:
    return pd.read_sql_query("SELECT * FROM Agent ORDER BY name", conn())


def runs_df(agent_id=None, days=None) -> pd.DataFrame:
    q = "SELECT * FROM AgentRun"
    clauses, params = [], []
    if agent_id:
        clauses.append("agent_id = ?")
        params.append(agent_id)
    if days:
        clauses.append("run_at >= datetime('now', ?)")
        params.append(f"-{days} days")
    if clauses:
        q += " WHERE " + " AND ".join(clauses)
    df = pd.read_sql_query(q + " ORDER BY run_at", conn(), params=params)
    if not df.empty:
        df["run_at"] = pd.to_datetime(df["run_at"])
    return df


def recs_df(status="pending") -> pd.DataFrame:
    q = ("SELECT r.*, a.name AS agent_name FROM Recommendation r "
         "JOIN Agent a ON a.id = r.agent_id")
    if status:
        q += f" WHERE r.status = '{status}'"
    return pd.read_sql_query(q, conn())


def scores():
    return score_agents(conn())


def new_flags():
    return {a: is_new_agent(conn(), a) for a in
            [r["id"] for r in conn().execute("SELECT id FROM Agent").fetchall()]}


def set_rec_status(rec_id: str, status: str):
    c = conn()
    rec = c.execute("SELECT * FROM Recommendation WHERE id = ?", (rec_id,)).fetchone()
    c.execute("UPDATE Recommendation SET status = ? WHERE id = ?", (status, rec_id))
    if status == "applied" and rec:
        _apply_side_effects(c, rec)
    c.commit()


def _apply_side_effects(c, rec):
    """Applying a guardrail-type recommendation actually creates the guardrail."""
    now = datetime.now().isoformat()
    if rec["type"] == "add_guardrail":
        c.execute(
            "INSERT INTO Guardrail (id, agent_id, name, type, config, active, created_at) "
            "VALUES (?, ?, ?, ?, ?, 1, ?)",
            ("gr_" + uuid.uuid4().hex[:8], rec["agent_id"], "Completion checker",
             "completion_checker",
             json.dumps({"max_revisions": 3, "stall_tokens": 2000}), now))
    elif rec["type"] == "rate_limit":
        c.execute(
            "INSERT INTO Guardrail (id, agent_id, name, type, config, active, created_at) "
            "VALUES (?, ?, ?, ?, ?, 1, ?)",
            ("gr_" + uuid.uuid4().hex[:8], rec["agent_id"], "Hourly rate cap",
             "rate_limit", json.dumps({"max_runs_per_hour": 10}), now))


def add_guardrail(agent_id: str, name: str, gtype: str, config: dict):
    conn().execute(
        "INSERT INTO Guardrail (id, agent_id, name, type, config, active, created_at) "
        "VALUES (?, ?, ?, ?, ?, 1, ?)",
        ("gr_" + uuid.uuid4().hex[:8], agent_id, name, gtype, json.dumps(config),
         datetime.now().isoformat()))
    conn().commit()


def toggle_guardrail(gr_id: str, active: bool):
    conn().execute("UPDATE Guardrail SET active = ? WHERE id = ?", (int(active), gr_id))
    conn().commit()


def versions_df(agent_id=None) -> pd.DataFrame:
    q = "SELECT * FROM AgentVersion"
    params = []
    if agent_id:
        q += " WHERE agent_id = ?"
        params.append(agent_id)
    return pd.read_sql_query(q + " ORDER BY created_at", conn(), params=params)


def add_version(agent_id: str, label: str, prompt: str, parent_id=None,
                created_by="dylan@veritas.ai") -> str:
    vid = "ver_" + uuid.uuid4().hex[:10]
    conn().execute(
        "INSERT INTO AgentVersion (id, agent_id, parent_version_id, label, "
        "prompt_snapshot, config_snapshot, created_at, created_by) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (vid, agent_id, parent_id, label, prompt, json.dumps({}),
         datetime.now().isoformat(), created_by))
    conn().commit()
    return vid


def fork_agent(source_id: str, new_name: str, prompt: str, parent_version_id=None) -> str:
    c = conn()
    src = c.execute("SELECT * FROM Agent WHERE id = ?", (source_id,)).fetchone()
    aid = "ag_" + uuid.uuid4().hex[:8]
    now = datetime.now().isoformat()
    c.execute(
        "INSERT INTO Agent (id, name, type, model, program, status, created_at, last_run) "
        "VALUES (?, ?, ?, ?, ?, 'healthy', ?, NULL)",
        (aid, new_name, src["type"], src["model"], src["program"], now))
    c.execute(
        "INSERT INTO AgentVersion (id, agent_id, parent_version_id, label, "
        "prompt_snapshot, config_snapshot, created_at, created_by) "
        "VALUES (?, ?, ?, 'v1 (forked)', ?, ?, ?, 'dylan@veritas.ai')",
        ("ver_" + uuid.uuid4().hex[:10], aid, parent_version_id, prompt,
         json.dumps({"model": src["model"]}), now))
    c.commit()
    return aid


def rerun_engines():
    refresh_recommendations(conn())


def goto_agent(agent_id: str):
    st.session_state["agent_id"] = agent_id
    st.switch_page("pages/02_agent_detail.py")
