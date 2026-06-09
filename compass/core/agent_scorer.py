"""Scoring engine: per-agent health scores across four dimensions.

Each dimension is 0-100. Overall health is a weighted blend; status is
derived from health plus hard floors (an agent that completes a third of
its tasks is critical no matter how cheap it is).
"""

import sqlite3
from datetime import datetime, timedelta

from core.cost_calculator import cost_per_1k_output

WEIGHTS = {"completion": 0.35, "quality": 0.30, "cost": 0.20, "prompt": 0.15}
WINDOW_DAYS = 30

HEALTHY_MIN = 75
ATTENTION_MIN = 45
COMPLETION_CRITICAL = 0.50  # below this, status is critical regardless of score


def _window_stats(conn: sqlite3.Connection, days: int = WINDOW_DAYS) -> dict:
    since = (datetime.now() - timedelta(days=days)).isoformat()
    rows = conn.execute(
        """SELECT a.id, a.model,
                  COUNT(r.id)                    AS runs,
                  AVG(r.input_tokens)            AS avg_in,
                  AVG(r.output_tokens)           AS avg_out,
                  AVG(r.total_cost_usd)          AS avg_cost,
                  AVG(r.latency_ms)              AS avg_latency,
                  AVG(r.task_completed)          AS completion,
                  AVG(r.output_quality_score)    AS quality
           FROM Agent a LEFT JOIN AgentRun r
                ON r.agent_id = a.id AND r.run_at >= ?
           GROUP BY a.id""", (since,)).fetchall()
    return {row["id"]: dict(row) for row in rows}


def _percentile_score(value, population, lower_is_better=True):
    """Rank-based score: best performer ~100, worst ~0."""
    pop = sorted(v for v in population if v is not None)
    if value is None or not pop:
        return 50.0
    if len(pop) == 1:
        return 100.0
    worse = sum(1 for v in pop if (v > value if lower_is_better else v < value))
    return 100.0 * worse / (len(pop) - 1)


def score_agents(conn: sqlite3.Connection, days: int = WINDOW_DAYS) -> dict:
    """Returns {agent_id: {completion, quality, cost, prompt, health, status, ...}}."""
    stats = _window_stats(conn, days)

    unit_costs, ratios = {}, {}
    for aid, s in stats.items():
        if s["runs"]:
            unit_costs[aid] = cost_per_1k_output(s["model"], s["avg_in"], s["avg_out"])
            ratios[aid] = s["avg_in"] / max(1.0, s["avg_out"])

    scores = {}
    for aid, s in stats.items():
        if not s["runs"]:
            scores[aid] = dict(completion=None, quality=None, cost=None, prompt=None,
                               health=None, status="healthy", runs=0, **{k: s[k] for k in
                               ("avg_in", "avg_out", "avg_cost", "avg_latency")})
            continue
        sub = dict(
            completion=100.0 * (s["completion"] or 0),
            quality=100.0 * (s["quality"] or 0),
            cost=_percentile_score(unit_costs.get(aid), unit_costs.values()),
            prompt=_percentile_score(ratios.get(aid), ratios.values()),
        )
        health = sum(WEIGHTS[k] * sub[k] for k in WEIGHTS)
        if (s["completion"] or 0) < COMPLETION_CRITICAL or health < ATTENTION_MIN:
            status = "critical"
        elif health < HEALTHY_MIN:
            status = "needs_attention"
        else:
            status = "healthy"
        scores[aid] = dict(**sub, health=round(health, 1), status=status,
                           runs=s["runs"], avg_in=s["avg_in"], avg_out=s["avg_out"],
                           avg_cost=s["avg_cost"], avg_latency=s["avg_latency"],
                           completion_rate=s["completion"], quality_avg=s["quality"])
    return scores


def refresh_statuses(conn: sqlite3.Connection):
    for aid, s in score_agents(conn).items():
        conn.execute("UPDATE Agent SET status = ? WHERE id = ?", (s["status"], aid))
    conn.commit()


def is_new_agent(conn: sqlite3.Connection, agent_id: str, days: int = 21) -> bool:
    first = conn.execute("SELECT MIN(run_at) AS f FROM AgentRun WHERE agent_id = ?",
                         (agent_id,)).fetchone()["f"]
    if first is None:
        return True
    return datetime.fromisoformat(first) > datetime.now() - timedelta(days=days)
