"""Plain-English explainer: turns run history into sentences an ops team can read aloud.

For each agent it produces a one-line verdict ("Support never finished 117 of the
174 ticket replies it started this month") plus findings, each backed by observed
outcomes — actual runs with timestamps, dollar amounts, and notes — so a person
monitoring the fleet can explain what's going right or wrong without learning
any Compass jargon.

Everything is computed from the AgentRun/AgentVersion tables; nothing here is
demo-specific.
"""

import sqlite3
import statistics
from datetime import datetime, timedelta

WINDOW_DAYS = 30
FAIL_RATE_BAD = 0.40          # >40% of tasks never finish -> failing
REGRESSION_DROP = 0.15        # >15% quality drop after a prompt change
HEAVY_INPUT_RATIO = 12        # input:output ratio that means "paying to read"
BURST_RUNS_PER_HOUR = 8       # runs in one hour that look like a stuck loop
SLOW_VS_FLEET = 2.5           # avg latency multiple vs fleet median
LENGTH_QUALITY_GAP = 0.10     # quality gap between short- and long-input runs

# Fallback task nouns for agents registered without one.
TYPE_TASK_NOUN = {
    "research": "research brief", "email_drafting": "email draft",
    "classification": "routing tag", "doc_summarization": "document summary",
    "cold_outreach": "cold email", "code_generation": "code change",
    "support_replies": "ticket reply", "data_analysis": "analysis answer",
}


def _when(iso: str) -> str:
    dt = datetime.fromisoformat(iso)
    return dt.strftime("%b %-d, %-I:%M %p")


def _day(iso: str) -> str:
    return datetime.fromisoformat(iso).strftime("%b %-d")


def _plural(n: int, noun: str) -> str:
    if n == 1:
        return f"1 {noun}"
    if noun.endswith("y") and noun[-2] not in "aeiou":
        return f"{n:,} {noun[:-1]}ies"
    es = "es" if noun.endswith(("s", "sh", "ch", "x")) else "s"
    return f"{n:,} {noun}{es}"


def _money(x: float) -> str:
    if x >= 100:
        return f"${x:,.0f}"
    if x >= 1:
        return f"${x:,.2f}"
    if x >= 0.01:
        return f"{x * 100:.0f}¢"
    return f"{x * 100:.1f}¢"


def _finding(direction, headline, observed):
    return dict(direction=direction, headline=headline, observed=observed)


def _runs(conn, agent_id, since):
    return [dict(r) for r in conn.execute(
        "SELECT * FROM AgentRun WHERE agent_id = ? AND run_at >= ? ORDER BY run_at",
        (agent_id, since)).fetchall()]


def _fleet_medians(conn, since):
    rows = conn.execute(
        """SELECT agent_id, AVG(input_tokens) AS avg_in, AVG(latency_ms) AS avg_lat
           FROM AgentRun WHERE run_at >= ? GROUP BY agent_id""", (since,)).fetchall()
    ins = [r["avg_in"] for r in rows if r["avg_in"]]
    lats = [r["avg_lat"] for r in rows if r["avg_lat"]]
    return (statistics.median(ins) if ins else 0,
            statistics.median(lats) if lats else 0)


def _unfinished_work(agent, task, runs, days):
    n = len(runs)
    failed = [r for r in runs if not r["task_completed"]]
    if not n or len(failed) / n < FAIL_RATE_BAD:
        return None
    wasted = sum(r["total_cost_usd"] for r in failed)
    headline = (f"{agent['name']} started {_plural(n, task)} in the last {days} days "
                f"and never finished {len(failed):,} of them — {_money(wasted)} went "
                f"to work that was never delivered.")
    observed = []
    for r in sorted(failed, key=lambda r: (r["notes"] is None, -r["total_cost_usd"]))[:3]:
        why = f' — "{r["notes"]}"' if r["notes"] else ""
        observed.append(f"{_when(r['run_at'])} — spent {_money(r['total_cost_usd'])} "
                        f"and delivered no {task}{why}")
    return _finding("bad", headline, observed)


def _regression_after_change(conn, agent, task, runs, now):
    ver = conn.execute(
        "SELECT label, created_at FROM AgentVersion WHERE agent_id = ? "
        "AND parent_version_id IS NOT NULL ORDER BY created_at DESC LIMIT 1",
        (agent["id"],)).fetchone()
    if not ver or ver["created_at"] < (now - timedelta(days=45)).isoformat():
        return None
    before = [r["output_quality_score"] for r in runs
              if r["run_at"] < ver["created_at"] and r["output_quality_score"] is not None]
    after = [r["output_quality_score"] for r in runs
             if r["run_at"] >= ver["created_at"] and r["output_quality_score"] is not None]
    if len(before) < 5 or len(after) < 5:
        return None
    b, a = statistics.fmean(before), statistics.fmean(after)
    if a >= b * (1 - REGRESSION_DROP):
        return None
    low = 0.7
    headline = (f"{agent['name']}'s {task}s got noticeably worse right after the "
                f"\"{ver['label']}\" prompt change on {_day(ver['created_at'])}: review "
                f"scores fell from {b:.2f} to {a:.2f} out of 1, and they haven't recovered.")
    n_low_b = sum(1 for q in before if q < low)
    n_low_a = sum(1 for q in after if q < low)
    observed = [
        f"Before the change, {n_low_b} of {_plural(len(before), task)} scored "
        f"below {low:.1f}; since the change it's {n_low_a} of {len(after):,}",
    ]
    for r in sorted((r for r in runs if r["run_at"] >= ver["created_at"]
                     and r["output_quality_score"] is not None),
                    key=lambda r: r["output_quality_score"])[:2]:
        observed.append(f"{_when(r['run_at'])} — {task} scored "
                        f"{r['output_quality_score']:.2f}, among the month's worst")
    return _finding("bad", headline, observed)


def _stuck_loops(agent, runs):
    # Densest rolling 60-minute window (runs are already time-ordered).
    times = [datetime.fromisoformat(r["run_at"]) for r in runs]
    best_n, best_lo, lo = 0, 0, 0
    for hi in range(len(times)):
        while times[hi] - times[lo] > timedelta(hours=1):
            lo += 1
        if hi - lo + 1 > best_n:
            best_n, best_lo = hi - lo + 1, lo
    if best_n < BURST_RUNS_PER_HOUR:
        return None
    burst_runs = runs[best_lo:best_lo + best_n]
    day_count = {}
    for r in runs:
        day_count[r["run_at"][:10]] = day_count.get(r["run_at"][:10], 0) + 1
    typical = statistics.median(day_count.values()) if day_count else 0
    start = times[best_lo]
    headline = (f"{agent['name']} fired {best_n} runs inside a single hour on "
                f"{start.strftime('%b %-d')} — its normal pace is about "
                f"{typical:.0f} a day. Bursts like that usually mean it's stuck "
                f"retrying the same task.")
    cost = sum(r["total_cost_usd"] for r in burst_runs)
    observed = [f"{start.strftime('%b %-d')}, starting {start.strftime('%-I:%M %p')} — "
                f"{best_n} runs in one hour, {_money(cost)} spent"]
    noted = next((r for r in burst_runs if r["notes"]), None)
    if noted:
        observed.append(f"{_when(noted['run_at'])} — \"{noted['notes']}\"")
    return _finding("bad", headline, observed)


def _paying_to_read(agent, task, runs, fleet_median_in, fleet_cost, days):
    avg_in = statistics.fmean(r["input_tokens"] for r in runs)
    avg_out = statistics.fmean(r["output_tokens"] for r in runs)
    if avg_in < 2 * fleet_median_in or avg_in / max(1, avg_out) < HEAVY_INPUT_RATIO:
        return None
    cost = sum(r["total_cost_usd"] for r in runs)
    avg_cost = cost / len(runs)
    share = 100 * cost / fleet_cost if fleet_cost else 0
    headline = (f"Each {task} costs about {_money(avg_cost)}, and nearly all of that "
                f"pays for reading the input (~{avg_in / 1000:.0f}k tokens in for "
                f"~{avg_out / 1000:.1f}k out) — {agent['name']} alone is "
                f"{share:.0f}% of fleet spend over the last {days} days.")
    worst = max(runs, key=lambda r: r["total_cost_usd"])
    why = f' — "{worst["notes"]}"' if worst["notes"] else ""
    observed = [f"{_when(worst['run_at'])} — one run cost {_money(worst['total_cost_usd'])} "
                f"reading a {worst['input_tokens']:,}-token document{why}",
                f"{_plural(len(runs), task)} cost {_money(cost)} in {days} days"]
    return _finding("warn", headline, observed)


def _worse_on_long_inputs(agent, task, runs):
    scored = [r for r in runs if r["output_quality_score"] is not None]
    if len(scored) < 20:
        return None
    cut = statistics.median(r["input_tokens"] for r in scored)
    short = [r["output_quality_score"] for r in scored if r["input_tokens"] <= cut]
    long_ = [r["output_quality_score"] for r in scored if r["input_tokens"] > cut]
    if not short or not long_:
        return None
    qs, ql = statistics.fmean(short), statistics.fmean(long_)
    if qs - ql < LENGTH_QUALITY_GAP:
        return None
    headline = (f"The longer the input, the worse the {task}: runs on inputs above "
                f"~{cut / 1000:.0f}k tokens score {ql:.2f} on average, versus {qs:.2f} "
                f"for shorter ones. Long inputs are where this agent breaks down.")
    worst = min((r for r in scored if r["input_tokens"] > cut),
                key=lambda r: r["output_quality_score"])
    observed = [f"{_when(worst['run_at'])} — a {worst['input_tokens']:,}-token input "
                f"produced a {task} scoring {worst['output_quality_score']:.2f}"]
    return _finding("warn", headline, observed)


def _slow_vs_fleet(agent, task, runs, fleet_median_lat):
    avg_lat = statistics.fmean(r["latency_ms"] for r in runs)
    if not fleet_median_lat or avg_lat < SLOW_VS_FLEET * fleet_median_lat:
        return None
    avg_in = statistics.fmean(r["input_tokens"] for r in runs)
    headline = (f"Each {task} takes ~{avg_lat / 1000:.0f} seconds — about "
                f"{avg_lat / fleet_median_lat:.0f}x the fleet's typical pace — because "
                f"{agent['name']} reads ~{avg_in / 1000:.0f}k tokens before answering.")
    slowest = max(runs, key=lambda r: r["latency_ms"])
    observed = [f"{_when(slowest['run_at'])} — one run took "
                f"{slowest['latency_ms'] / 1000:.0f} seconds"]
    return _finding("warn", headline, observed)


def _doing_fine(agent, task, runs, days, best_quality):
    n = len(runs)
    done = sum(1 for r in runs if r["task_completed"])
    cost = sum(r["total_cost_usd"] for r in runs)
    scored = [r["output_quality_score"] for r in runs if r["output_quality_score"] is not None]
    q = statistics.fmean(scored) if scored else None
    q_txt = ""
    if q is not None:
        best = " — the best in the fleet" if best_quality else ""
        q_txt = f"; review scores average {q:.2f} out of 1{best}"
    headline = (f"Delivered {done:,} of {_plural(n, task)} ({100 * done / n:.0f}%) over "
                f"the last {days} days at about {_money(cost / n)} each{q_txt}.")
    return _finding("good", headline, [])


def explain_agent(conn: sqlite3.Connection, agent_id: str, days: int = WINDOW_DAYS) -> dict:
    """Returns {purpose, task_noun, verdict, direction, findings} for one agent."""
    agent = dict(conn.execute("SELECT * FROM Agent WHERE id = ?", (agent_id,)).fetchone())
    task = agent.get("task_noun") or TYPE_TASK_NOUN.get(agent["type"], "task")
    purpose = agent.get("purpose") or f"Runs {agent['type'].replace('_', ' ')} tasks."
    now = datetime.now()
    since = (now - timedelta(days=days)).isoformat()
    runs = _runs(conn, agent_id, since)

    if not runs:
        verdict = f"No runs in the last {days} days — nothing to report yet."
        return dict(purpose=purpose, task_noun=task, verdict=verdict,
                    direction="none", findings=[])

    fleet_median_in, fleet_median_lat = _fleet_medians(conn, since)
    fleet_cost = conn.execute(
        "SELECT SUM(total_cost_usd) AS c FROM AgentRun WHERE run_at >= ?",
        (since,)).fetchone()["c"] or 0
    best_q = conn.execute(
        """SELECT agent_id FROM AgentRun WHERE run_at >= ?
           GROUP BY agent_id ORDER BY AVG(output_quality_score) DESC LIMIT 1""",
        (since,)).fetchone()
    best_quality = bool(best_q and best_q["agent_id"] == agent_id)

    findings = [f for f in (
        _unfinished_work(agent, task, runs, days),
        _regression_after_change(conn, agent, task, runs, now),
        _stuck_loops(agent, runs),
        _paying_to_read(agent, task, runs, fleet_median_in, fleet_cost, days),
        _worse_on_long_inputs(agent, task, runs),
        _slow_vs_fleet(agent, task, runs, fleet_median_lat),
    ) if f]
    if not findings:
        findings = [_doing_fine(agent, task, runs, days, best_quality)]

    return dict(purpose=purpose, task_noun=task,
                verdict=findings[0]["headline"], direction=findings[0]["direction"],
                findings=findings)


def explain_fleet(conn: sqlite3.Connection, days: int = WINDOW_DAYS) -> dict:
    """{agent_id: explanation} for every agent, worst news first within each."""
    ids = [r["id"] for r in conn.execute("SELECT id FROM Agent").fetchall()]
    return {aid: explain_agent(conn, aid, days) for aid in ids}
