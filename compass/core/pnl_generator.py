"""The Agent P&L: every agent as a line item, weekly.

Delivered value is completed runs x the agent's unit_value_usd — an explicit,
written-down assumption (Agent.value_basis), never an invented number. Agents
without a value model show "—"; their line still carries cost and trend.

Three renderers: rows for the Streamlit page, a self-contained HTML report
(print to PDF from the browser), and a plain-text email body.
"""

import sqlite3
from datetime import datetime, timedelta

TREND_TOLERANCE = 0.10  # net-value change below this is "flat"


def _window_stats(conn, agent_id, start, end):
    row = conn.execute(
        "SELECT COUNT(*) AS runs, SUM(task_completed) AS completed, "
        "SUM(total_cost_usd) AS cost FROM AgentRun "
        "WHERE agent_id = ? AND run_at >= ? AND run_at < ?",
        (agent_id, start.isoformat(), end.isoformat())).fetchone()
    return row["runs"] or 0, row["completed"] or 0, row["cost"] or 0.0


def _net(cost, value):
    return (value if value is not None else 0.0) - cost


def weekly_pnl(conn: sqlite3.Connection, week_end: datetime | None = None) -> dict:
    """P&L for the 7 days ending at week_end (default: now), with trend vs. the prior 7."""
    end = week_end or datetime.now()
    start = end - timedelta(days=7)
    prior_start = start - timedelta(days=7)

    rows = []
    for a in conn.execute("SELECT * FROM Agent ORDER BY name").fetchall():
        runs, completed, cost = _window_stats(conn, a["id"], start, end)
        p_runs, p_completed, p_cost = _window_stats(conn, a["id"], prior_start, start)

        unit = a["unit_value_usd"]
        value = completed * unit if unit is not None else None
        p_value = p_completed * unit if unit is not None else None

        net, p_net = _net(cost, value), _net(p_cost, p_value)
        base = max(abs(p_net), 0.01)
        if p_runs == 0 and runs == 0:
            trend = "flat"
        elif (net - p_net) / base > TREND_TOLERANCE:
            trend = "up"
        elif (p_net - net) / base > TREND_TOLERANCE:
            trend = "down"
        else:
            trend = "flat"

        roi = (value / cost) if (value is not None and cost > 0) else None
        plan_pct = None
        if a["projected_value_usd_mo"] and value is not None:
            plan_pct = (value * 30 / 7) / a["projected_value_usd_mo"] * 100

        rows.append(dict(
            agent_id=a["id"], name=a["name"], program=a["program"], model=a["model"],
            runs=runs, completed=completed, cost=round(cost, 2),
            value=None if value is None else round(value, 2),
            net=round(net, 2), roi=None if roi is None else round(roi, 1),
            trend=trend, plan_pct=None if plan_pct is None else round(plan_pct),
            value_basis=a["value_basis"], projection_source=a["projection_source"],
        ))

    rows.sort(key=lambda r: (r["value"] is None, -(r["value"] or 0)))
    valued = [r for r in rows if r["value"] is not None]
    totals = dict(
        runs=sum(r["runs"] for r in rows),
        cost=round(sum(r["cost"] for r in rows), 2),
        value=round(sum(r["value"] for r in valued), 2),
        net=round(sum(r["net"] for r in rows), 2),
        agents=len(rows), valued_agents=len(valued),
    )
    return dict(week_start=start, week_end=end, rows=rows, totals=totals)


# ---------------------------------------------------------------- renderers

ARROW = {"up": "▲", "down": "▼", "flat": "·"}


def _fmt(v, money=False):
    if v is None:
        return "—"
    return f"${v:,.2f}" if money else str(v)


def render_text(pnl: dict) -> str:
    """Plain-text weekly email body."""
    ws, we, t = pnl["week_start"], pnl["week_end"], pnl["totals"]
    lines = [
        f"COMPASS — WEEKLY AGENT P&L · {ws:%b %d} – {we:%b %d, %Y}",
        "=" * 62,
        f"fleet: {t['agents']} agents · {t['runs']} runs · "
        f"cost ${t['cost']:,.2f} · value delivered ${t['value']:,.2f}",
        "",
        f"{'AGENT':<12}{'RUNS':>6}{'COST':>10}{'VALUE':>10}{'VS PLAN':>10}  TREND",
        "-" * 62,
    ]
    for r in pnl["rows"]:
        plan = f"{r['plan_pct']}%" if r["plan_pct"] is not None else "—"
        lines.append(
            f"{r['name']:<12}{r['runs']:>6}{_fmt(r['cost'], True):>10}"
            f"{_fmt(r['value'], True):>10}{plan:>10}  {ARROW[r['trend']]}")
    lines += ["-" * 62, ""]
    misses = [r for r in pnl["rows"] if r["plan_pct"] is not None and r["plan_pct"] < 75]
    beats = [r for r in pnl["rows"] if r["plan_pct"] is not None and r["plan_pct"] > 110]
    for r in misses:
        lines.append(f"⚠ {r['name']} is delivering {r['plan_pct']}% of its projection "
                     f"({r['projection_source']}). Open Compass for the diagnosis.")
    for r in beats:
        lines.append(f"✓ {r['name']} is beating its projection ({r['plan_pct']}% of plan).")
    lines += [
        "",
        "Value = completed runs x each agent's documented unit value. Agents",
        "without an honest value model show — (cost and trend still tracked).",
        "Full P&L, diagnoses, and fixes: streamlit run compass/app/app.py",
    ]
    return "\n".join(lines)


def render_html(pnl: dict) -> str:
    """Self-contained HTML artifact, styled for printing to PDF."""
    ws, we, t = pnl["week_start"], pnl["week_end"], pnl["totals"]
    trend_color = {"up": "#047857", "down": "#B91C1C", "flat": "#6B7280"}

    def plan_cell(r):
        if r["plan_pct"] is None:
            return '<td class="num muted">—</td>'
        color = "#047857" if r["plan_pct"] >= 100 else ("#B45309" if r["plan_pct"] >= 75 else "#B91C1C")
        return f'<td class="num" style="color:{color}">{r["plan_pct"]}% of plan</td>'

    def roi_cell(r):
        roi = "—" if r["roi"] is None else "{:,.0f}x".format(r["roi"])
        return f'<td class="num">{roi}</td>'

    body_rows = "\n".join(
        f'<tr><td><b>{r["name"]}</b> <span class="muted">· {r["program"] or ""}</span></td>'
        f'<td class="num">{r["runs"]}</td>'
        f'<td class="num">{_fmt(r["cost"], True)}</td>'
        f'<td class="num">{_fmt(r["value"], True)}</td>'
        f'{roi_cell(r)}'
        f'{plan_cell(r)}'
        f'<td style="color:{trend_color[r["trend"]]}; text-align:center">{ARROW[r["trend"]]}</td></tr>'
        for r in pnl["rows"])

    notes = "".join(
        f'<li><b>{r["name"]}</b>: value = completed runs × ${r["value"] and (r["value"]/max(r["completed"],1)) or 0:,.2f} '
        f'({r["value_basis"]})</li>'
        for r in pnl["rows"] if r["value_basis"])

    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Weekly Agent P&L</title>
<style>
  body {{ font-family: -apple-system, 'Segoe UI', Inter, sans-serif; color: #16181D;
         max-width: 820px; margin: 0 auto; padding: 40px 28px; font-size: 14px; }}
  .mono, td.num, th {{ font-family: 'SF Mono', Menlo, Consolas, monospace; }}
  h1 {{ font-size: 21px; margin: 0; }}
  .sub {{ color: #6B7280; font-size: 13px; margin: 4px 0 22px; }}
  .muted {{ color: #6B7280; }}
  .bignums {{ display: flex; gap: 12px; margin-bottom: 22px; }}
  .bn {{ flex: 1; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; }}
  .bn .l {{ font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: #6B7280; }}
  .bn .v {{ font-size: 22px; font-weight: 700; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th {{ text-align: left; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase;
       color: #6B7280; padding: 7px 9px; border-bottom: 2px solid #16181D; }}
  td {{ padding: 8px 9px; border-bottom: 1px solid #E5E7EB; }}
  td.num {{ text-align: right; }}
  .foot {{ margin-top: 20px; font-size: 12px; color: #6B7280; }}
  .foot ul {{ margin: 6px 0 0 18px; padding: 0; }}
  @media print {{ @page {{ margin: 16mm; }} }}
</style></head><body>
<h1>⌖ Compass — Weekly Agent P&amp;L</h1>
<div class="sub">{ws:%b %d} – {we:%b %d, %Y} · every agent, a line item</div>
<div class="bignums">
  <div class="bn"><div class="l">Cost</div><div class="v">${t['cost']:,.2f}</div></div>
  <div class="bn"><div class="l">Value delivered</div><div class="v" style="color:#047857">${t['value']:,.2f}</div></div>
  <div class="bn"><div class="l">Runs</div><div class="v">{t['runs']:,}</div></div>
  <div class="bn"><div class="l">Agents</div><div class="v">{t['agents']} <span class="muted" style="font-size:13px">({t['valued_agents']} valued)</span></div></div>
</div>
<table>
<tr><th>Agent</th><th style="text-align:right">Runs</th><th style="text-align:right">Cost</th>
<th style="text-align:right">Value</th><th style="text-align:right">ROI</th>
<th style="text-align:right">vs. plan</th><th>Trend</th></tr>
{body_rows}
</table>
<div class="foot">
  Value = completed runs × the agent's documented unit value. Agents without an honest value
  model show "—" — cost and trend are still tracked. "vs. plan" compares run-rate value against
  the projection the agent was specced with.
  <ul>{notes}</ul>
</div>
</body></html>"""
