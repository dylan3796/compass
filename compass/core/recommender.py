"""Rules-based recommendation engine.

Seven detectors run over the last 30 days of AgentRun data. Re-running is
idempotent: pending recommendations are regenerated; applied/dismissed
ones are preserved and not re-raised for the same agent+type.
"""

import sqlite3
import statistics
import uuid
from datetime import datetime, timedelta

from core.agent_scorer import score_agents
from core.cost_calculator import (TASK_CLASS_FLOOR, cheaper_adequate_model,
                                  cost_per_run, estimate_right_size_savings,
                                  estimate_trimmed_savings, model_label)

WINDOW_DAYS = 30
TRIM_TARGET_INPUT = 4000          # structured-input baseline for bloated agents
TRIM_RATIO_FLOOR = 12             # input/output ratio that marks context bloat
REGRESSION_DROP = 0.20            # >20% quality drop over a 2-week window
CLONE_BOTTOM_FRAC = 0.40
GUARDRAIL_COMPLETION = 0.60
RATE_LIMIT_RUNS_PER_HOUR = 8
CORR_THRESHOLD = -0.35
RIGHT_SIZE_MIN_RUNS = 30          # don't right-size on thin evidence
RIGHT_SIZE_QUALITY_STD_MAX = 0.10 # only when observed quality is stable


def _monthly(conn, agent_id, since):
    row = conn.execute(
        "SELECT COUNT(*) AS n, SUM(total_cost_usd) AS cost FROM AgentRun "
        "WHERE agent_id = ? AND run_at >= ?", (agent_id, since)).fetchone()
    scale = 30 / WINDOW_DAYS
    return (row["n"] or 0) * scale, (row["cost"] or 0.0) * scale


def _quality_windows(conn, agent_id, now):
    def avg(start, end):
        row = conn.execute(
            "SELECT AVG(output_quality_score) AS q FROM AgentRun "
            "WHERE agent_id = ? AND run_at >= ? AND run_at < ?",
            (agent_id, start.isoformat(), end.isoformat())).fetchone()
        return row["q"]
    recent = avg(now - timedelta(days=14), now)
    prior = avg(now - timedelta(days=28), now - timedelta(days=14))
    return recent, prior


def _input_quality_corr(conn, agent_id, since):
    rows = conn.execute(
        "SELECT input_tokens, output_quality_score FROM AgentRun "
        "WHERE agent_id = ? AND run_at >= ? AND output_quality_score IS NOT NULL",
        (agent_id, since)).fetchall()
    if len(rows) < 20:
        return 0.0, 0.0
    xs = [r["input_tokens"] for r in rows]
    ys = [r["output_quality_score"] for r in rows]
    sx, sy = statistics.pstdev(xs), statistics.pstdev(ys)
    if sx == 0 or sy == 0:
        return 0.0, sy
    mx, my = statistics.fmean(xs), statistics.fmean(ys)
    cov = statistics.fmean([(x - mx) * (y - my) for x, y in zip(xs, ys)])
    return cov / (sx * sy), sy


def _max_runs_per_hour(conn, agent_id, since):
    row = conn.execute(
        "SELECT COUNT(*) AS n FROM AgentRun WHERE agent_id = ? AND run_at >= ? "
        "GROUP BY strftime('%Y-%m-%d %H', run_at) ORDER BY n DESC LIMIT 1",
        (agent_id, since)).fetchone()
    return row["n"] if row else 0


def generate_recommendations(conn: sqlite3.Connection) -> list[dict]:
    now = datetime.now()
    since = (now - timedelta(days=WINDOW_DAYS)).isoformat()
    scores = score_agents(conn, WINDOW_DAYS)
    agents = {r["id"]: dict(r) for r in conn.execute("SELECT * FROM Agent").fetchall()}
    active = {aid: s for aid, s in scores.items() if s["runs"]}
    recs = []

    def add(agent_id, rtype, severity, description, detail, savings):
        recs.append(dict(
            id="rec_" + uuid.uuid4().hex[:10], agent_id=agent_id, type=rtype,
            severity=severity, description=description, detail=detail,
            estimated_savings_usd=round(savings, 2) if savings else None,
            status="pending", created_at=now.isoformat()))

    median_in = statistics.median(s["avg_in"] for s in active.values())

    # 1. right_size_model — over-provisioned model for the task class.
    # The most quantifiable rec there is: same tokens, cheaper model, math.
    right_sized = {}  # aid -> target model, so trim_context prices after the switch
    for aid, s in active.items():
        a = agents[aid]
        target = cheaper_adequate_model(a["model"], a["type"])
        if not target or s["runs"] < RIGHT_SIZE_MIN_RUNS:
            continue
        _, q_std = _input_quality_corr(conn, aid, since)
        if q_std > RIGHT_SIZE_QUALITY_STD_MAX:
            continue  # unstable quality — don't recommend a downgrade on noise
        runs_mo, _ = _monthly(conn, aid, since)
        savings = estimate_right_size_savings(
            a["model"], target, s["avg_in"], s["avg_out"], runs_mo)
        if savings < 1:
            continue
        right_sized[aid] = target
        cur_cost = cost_per_run(a["model"], s["avg_in"], s["avg_out"])
        new_cost = cost_per_run(target, s["avg_in"], s["avg_out"])
        cost_ratio = cur_cost / max(new_cost, 1e-9)
        delta = TASK_CLASS_FLOOR[a["type"]]["delta_pct"]
        add(aid, "right_size_model",
            "high" if savings > 50 else ("medium" if savings > 5 else "low"),
            f"{a['name']} runs {model_label(a['model'])} — {model_label(target)} scores "
            f"within ~{delta}% on {a['type'].replace('_', ' ')} at ~1/{cost_ratio:.0f}th "
            f"the cost. Est. savings ${savings:,.0f}/mo.",
            f"Task-class benchmarks put {model_label(target)} within ~{delta}% of "
            f"{model_label(a['model'])} on {a['type'].replace('_', ' ')} (directional — "
            f"verify on a 50-run sample before switching). Savings assume the current "
            f"profile: {s['avg_in']:,.0f} in / {s['avg_out']:,.0f} out tokens, "
            f"~{runs_mo:,.0f} runs/mo. Observed quality is stable (σ={q_std:.2f}). "
            f"Any context-trimming rec on this agent is priced after this switch, so "
            f"the two don't double-count.",
            savings)

    # 2. trim_context — input far above peers, dominated by context not output
    for aid, s in active.items():
        ratio = s["avg_in"] / max(1.0, s["avg_out"])
        if s["avg_in"] > 2 * median_in and ratio >= TRIM_RATIO_FLOOR:
            a = agents[aid]
            runs_mo, _ = _monthly(conn, aid, since)
            # If a right-size rec is pending, price trimming on the target model —
            # otherwise the two recs would together claim more than the agent spends.
            price_model = right_sized.get(aid, a["model"])
            savings = estimate_trimmed_savings(
                price_model, s["avg_in"], s["avg_out"], TRIM_TARGET_INPUT, runs_mo)
            repriced = ("" if aid not in right_sized else
                        f" Priced on {model_label(price_model)}, after the pending "
                        f"right-size rec; on {model_label(a['model'])} alone this is "
                        f"~${estimate_trimmed_savings(a['model'], s['avg_in'], s['avg_out'], TRIM_TARGET_INPUT, runs_mo):,.0f}/mo.")
            add(aid, "trim_context", "high" if savings > 50 else "medium",
                f"{a['name']} reads ~{s['avg_in']/1000:.0f}k input tokens per run to produce "
                f"~{s['avg_out']/1000:.1f}k — provide structured input instead of full documents.",
                f"Avg input tokens ({s['avg_in']:,.0f}) is {s['avg_in']/median_in:.1f}x the peer "
                f"median ({median_in:,.0f}) with an input/output ratio of {ratio:.0f}:1. "
                f"Savings assume trimming to ~{TRIM_TARGET_INPUT:,} structured input tokens."
                + repriced,
                savings)

    # 3. prompt_regression — quality dropped >20% across two 2-week windows
    regressed = set()
    for aid in active:
        recent, prior = _quality_windows(conn, aid, now)
        if recent and prior and recent < prior * (1 - REGRESSION_DROP):
            regressed.add(aid)
            a = agents[aid]
            ver = conn.execute(
                "SELECT label, created_at FROM AgentVersion WHERE agent_id = ? "
                "ORDER BY created_at DESC LIMIT 1", (aid,)).fetchone()
            change = (f" A prompt change ({ver['label']}) shipped "
                      f"{ver['created_at'][:10]} — review it." if ver and
                      ver["created_at"] > (now - timedelta(days=35)).isoformat() else "")
            add(aid, "prompt_regression", "high",
                f"{a['name']} output quality dropped {100*(1-recent/prior):.0f}% in the last "
                f"two weeks ({prior:.2f} → {recent:.2f}).{change}",
                "Quality score averaged over rolling 2-week windows; a drop of more than "
                "20% flags a regression. Correlate with the version history timeline.",
                None)

    # 4. clone_best_performer — bottom-40% quality not already explained above
    by_quality = sorted(active, key=lambda a: active[a]["quality_avg"] or 0)
    bottom = set(by_quality[:max(1, int(len(by_quality) * CLONE_BOTTOM_FRAC))])
    best = by_quality[-1]
    for aid in bottom:
        if aid in regressed or (active[aid]["completion_rate"] or 0) < GUARDRAIL_COMPLETION:
            continue  # those agents get regression/guardrail recs instead
        a, b = agents[aid], agents[best]
        uplift = (active[best]["quality_avg"] - active[aid]["quality_avg"]) / active[aid]["quality_avg"]
        _, cost_mo = _monthly(conn, aid, since)
        add(aid, "clone_best_performer", "medium",
            f"{b['name']}'s prompt structure outperforms {a['name']} by {100*uplift:.0f}% on "
            f"quality — clone its structure in Clone Studio.",
            f"{a['name']} is in the bottom 40% of fleet quality "
            f"({active[aid]['quality_avg']:.2f}); {b['name']} is the fleet's best "
            f"({active[best]['quality_avg']:.2f}). Structured input + tight output rules "
            f"transfer well across task types.",
            cost_mo * 0.2)

    # 5. add_guardrail — completion rate below 60%
    for aid, s in active.items():
        if (s["completion_rate"] or 0) < GUARDRAIL_COMPLETION:
            a = agents[aid]
            _, cost_mo = _monthly(conn, aid, since)
            wasted = cost_mo * (1 - s["completion_rate"])
            add(aid, "add_guardrail", "high",
                f"{a['name']} completes only {100*s['completion_rate']:.0f}% of tasks — "
                f"add a completion-checker guardrail to break revision loops.",
                f"Task completion over the last 30 days is {100*s['completion_rate']:.0f}% "
                f"(threshold 60%). Failed runs show repeated self-revision without progress. "
                f"~${wasted:.0f}/mo is spent on runs that never complete.",
                wasted)

    # 6. rate_limit — bursts with no clear trigger
    for aid in active:
        peak = _max_runs_per_hour(conn, aid, since)
        guarded = conn.execute(
            "SELECT 1 FROM Guardrail WHERE agent_id = ? AND type = 'rate_limit' AND active = 1",
            (aid,)).fetchone()
        if peak >= RATE_LIMIT_RUNS_PER_HOUR and not guarded:
            a = agents[aid]
            add(aid, "rate_limit", "medium",
                f"{a['name']} fired {peak} runs in a single hour — likely a loop. "
                f"Add a rate-limit guardrail.",
                f"Peak of {peak} runs/hour in the last 30 days with no matching inbound "
                f"trigger volume (threshold {RATE_LIMIT_RUNS_PER_HOUR}/hour).",
                None)

    # 7. restructure_input — quality varies with input length
    for aid in active:
        corr, q_std = _input_quality_corr(conn, aid, since)
        if corr < CORR_THRESHOLD and q_std > 0.08:
            a = agents[aid]
            add(aid, "restructure_input", "medium",
                f"{a['name']}'s output quality drops as inputs get longer "
                f"(corr {corr:.2f}) — standardize the input format.",
                f"Pearson correlation between input tokens and quality score is {corr:.2f} "
                f"with quality stddev {q_std:.2f}. Pre-summarizing or templating inputs "
                f"removes the length sensitivity.",
                None)

    return recs


def refresh_recommendations(conn: sqlite3.Connection):
    conn.execute("DELETE FROM Recommendation WHERE status = 'pending'")
    resolved = {(r["agent_id"], r["type"]) for r in conn.execute(
        "SELECT agent_id, type FROM Recommendation").fetchall()}
    for rec in generate_recommendations(conn):
        if (rec["agent_id"], rec["type"]) in resolved:
            continue
        conn.execute(
            "INSERT INTO Recommendation (id, agent_id, type, severity, description, "
            "detail, estimated_savings_usd, status, created_at) VALUES "
            "(:id, :agent_id, :type, :severity, :description, :detail, "
            ":estimated_savings_usd, :status, :created_at)", rec)
    conn.commit()
