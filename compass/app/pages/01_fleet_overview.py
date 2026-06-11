import theme

theme.inject()

import pandas as pd
import streamlit as st

import common
from theme import TYPE_ICON, badge, fmt_money, new_badge, verdict_line, vital

st.markdown("## 🧭 Fleet Overview")
st.markdown('<span class="page-sub">Veritas AI — 8 agents · live demo data</span>',
            unsafe_allow_html=True)

scores = common.scores()
agents = common.agents_df()
runs = common.runs_df(days=60)
recs = common.recs_df("pending")
new = common.new_flags()
explained = common.explanations()

# ---- fleet health header -------------------------------------------------
counts = {"healthy": 0, "needs_attention": 0, "critical": 0}
for _, a in agents.iterrows():
    counts[a["status"]] = counts.get(a["status"], 0) + 1
n_new = sum(1 for a in agents["id"] if new.get(a))

cutoff30 = pd.Timestamp.now() - pd.Timedelta(days=30)
cutoff7 = pd.Timestamp.now() - pd.Timedelta(days=7)
spend30 = runs.loc[runs["run_at"] >= cutoff30, "total_cost_usd"].sum()
spend7 = runs.loc[runs["run_at"] >= cutoff7, "total_cost_usd"].sum()
projected = spend7 / 7 * 30
savings = recs["estimated_savings_usd"].fillna(0).sum()

c1, c2, c3, c4 = st.columns(4)
c1.markdown(
    f'<div class="compass-card"><div class="metric-label">Fleet health</div>'
    f'<div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">'
    f'<span class="badge badge-healthy">{counts["healthy"]} HEALTHY</span>'
    f'<span class="badge badge-needs_attention">{counts["needs_attention"]} NEEDS ATTENTION</span>'
    f'<span class="badge badge-critical">{counts["critical"]} CRITICAL</span>'
    f'<span class="badge badge-new">{n_new} NEW</span></div></div>',
    unsafe_allow_html=True)
c2.markdown(
    f'<div class="compass-card"><div class="metric-label">Spend · last 30 days</div>'
    f'<div class="metric-value">{fmt_money(spend30)}</div></div>', unsafe_allow_html=True)
c3.markdown(
    f'<div class="compass-card"><div class="metric-label">Projected / month</div>'
    f'<div class="metric-value">{fmt_money(projected)}</div>'
    f'<div class="metric-sub">based on trailing 7 days</div></div>', unsafe_allow_html=True)
c4.markdown(
    f'<div class="compass-card"><div class="metric-label">Potential savings</div>'
    f'<div class="metric-value accent">{fmt_money(savings)}/mo</div>'
    f'<div class="metric-sub">if pending recommendations applied</div></div>',
    unsafe_allow_html=True)

st.markdown("---")

# ---- plain-English readout --------------------------------------------------
# What an ops person would say out loud if asked "how are the agents doing?"
problems = [(aid, e) for aid, e in explained.items() if e["direction"] in ("bad", "warn")]
problems.sort(key=lambda p: (p[1]["direction"] != "bad",))
wins = [(aid, e) for aid, e in explained.items() if e["direction"] == "good"]
if problems:
    name_of = agents.set_index("id")["name"]
    lines = ""
    for aid, e in problems[:4]:
        text = f'<b>{name_of[aid]}</b> — {e["verdict"]}'
        lines += f'<div style="margin-top:8px;">{verdict_line(e["direction"], text)}</div>'
    st.markdown(
        f'<div class="compass-card"><div class="metric-label">In plain English</div>'
        f'{lines}'
        f'<div class="prose muted2" style="margin-top:12px;">'
        f'{len(wins)} of {len(explained)} agents are doing what they\'re supposed to. '
        f'Open an agent for the observed runs behind each statement.</div></div>',
        unsafe_allow_html=True)

# ---- controls --------------------------------------------------------------
fc1, fc2, _ = st.columns([1, 1, 2])
sort_by = fc1.selectbox("Sort by", ["Status", "Cost", "Quality", "Last run"])
filt = fc2.selectbox("Filter", ["All", "Needs attention", "Critical", "Healthy"])

STATUS_ORDER = {"critical": 0, "needs_attention": 1, "healthy": 2}
top_rec = (recs.sort_values("severity").groupby("agent_id").first()
           if not recs.empty else pd.DataFrame())

rows = []
for _, a in agents.iterrows():
    s = scores.get(a["id"], {})
    agent_runs = runs[(runs["agent_id"] == a["id"]) & (runs["run_at"] >= cutoff30)]
    prev_runs = runs[(runs["agent_id"] == a["id"]) & (runs["run_at"] < cutoff30)]
    cost = agent_runs["total_cost_usd"].sum()
    prev = prev_runs["total_cost_usd"].sum()
    rows.append(dict(a=a, s=s, cost=cost, prev=prev,
                     rec=top_rec.loc[a["id"]] if a["id"] in getattr(top_rec, "index", []) else None))

if filt != "All":
    key = filt.lower().replace(" ", "_")
    rows = [r for r in rows if r["a"]["status"] == key]
if sort_by == "Status":
    rows.sort(key=lambda r: (STATUS_ORDER.get(r["a"]["status"], 3), -(r["cost"])))
elif sort_by == "Cost":
    rows.sort(key=lambda r: -r["cost"])
elif sort_by == "Quality":
    rows.sort(key=lambda r: (r["s"].get("quality_avg") or 1))
else:
    rows.sort(key=lambda r: r["a"]["last_run"] or "", reverse=True)

# ---- agent cards -----------------------------------------------------------
cols = st.columns(2)
for i, r in enumerate(rows):
    a, s = r["a"], r["s"]
    with cols[i % 2]:
        trend = ""
        if r["prev"] > 0:
            delta = (r["cost"] - r["prev"]) / r["prev"]
            arrow, klass = ("▲", "up") if delta > 0.05 else (("▼", "down") if delta < -0.05 else ("→", "muted"))
            trend = f'<span class="{klass} mono" style="font-size:12px;"> {arrow} {abs(delta)*100:.0f}%</span>'
        nb = " " + new_badge() if new.get(a["id"]) else ""
        q_txt = f"{s['quality_avg']:.2f}" if s.get("quality_avg") else "—"
        comp_txt = f"{100 * s['completion_rate']:.0f}%" if s.get("completion_rate") is not None else "—"
        health_txt = s.get("health") if s.get("health") is not None else "—"
        e = explained.get(a["id"], {})
        purpose = (f'<div class="purpose">'
                   f'{e.get("purpose", "")}</div>') if e.get("purpose") else ""
        verdict = (f'<div style="margin-top:12px;">'
                   f'{verdict_line(e["direction"], e["verdict"])}</div>') if e.get("verdict") else ""
        rec_line = (f'<div class="rec-line" style="margin-top:8px;">'
                    f'<span class="accent">▸</span> <span class="muted">Suggested fix:</span> '
                    f'{r["rec"]["description"]}</div>'
                    if r["rec"] is not None else "")
        st.markdown(
            f'<div class="compass-card">'
            f'<div class="card-head">'
            f'<div><span class="mono" style="font-size:17px; font-weight:600;">'
            f'{TYPE_ICON.get(a["type"], "•")} {a["name"]}</span>'
            f'<span class="muted wrap-anywhere" style="font-size:12px;"> · {a["model"]}</span></div>'
            f'<div>{badge(a["status"])}{nb}</div></div>'
            f'{purpose}'
            f'{vital(s.get("health") or 0, a["status"])}'
            f'<div class="metric-row mono" style="margin-top:10px;">'
            f'<span style="font-size:13px;">cost/30d <b>{fmt_money(r["cost"])}</b>{trend}</span>'
            f'<span style="font-size:13px;">health <b>{health_txt}</b></span>'
            f'<span style="font-size:13px;">quality <b>{q_txt}</b></span>'
            f'<span style="font-size:13px;">finished <b>{comp_txt}</b></span>'
            f'</div>{verdict}{rec_line}</div>', unsafe_allow_html=True)
        if st.button("View →", key=f"view_{a['id']}", use_container_width=True):
            common.goto_agent(a["id"])
