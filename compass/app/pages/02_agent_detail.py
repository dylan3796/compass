import theme

theme.inject()

from datetime import datetime

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

import common
from theme import (COLORS, TYPE_ICON, badge, fmt_money, fmt_tokens, new_badge,
                   plotly_layout, rec_label, sev_badge, verdict_line)

agents = common.agents_df()
ids = list(agents["id"])
default = st.session_state.get("agent_id", "ag_summarizer")
if default not in ids:
    default = ids[0]

sel = st.selectbox("Agent", ids, index=ids.index(default),
                   format_func=lambda i: agents.set_index("id").loc[i, "name"])
st.session_state["agent_id"] = sel
agent = agents.set_index("id").loc[sel]
scores = common.scores().get(sel, {})
new = common.new_flags().get(sel, False)

# ---- header ----------------------------------------------------------------
last = "never"
if agent["last_run"]:
    mins = (datetime.now() - datetime.fromisoformat(agent["last_run"])).total_seconds() / 60
    last = f"{mins:.0f} min ago" if mins < 90 else (
        f"{mins/60:.0f}h ago" if mins < 48 * 60 else f"{mins/1440:.0f}d ago")
nb = " " + new_badge() if new else ""
explained = common.explanation(sel)
st.markdown(
    f'<div class="card-head">'
    f'<h2 style="margin:0;">{TYPE_ICON.get(agent["type"], "•")} {agent["name"]}</h2>'
    f'<div>{badge(agent["status"])}{nb}</div></div>'
    f'<span class="muted mono wrap-anywhere" style="font-size:13px;">'
    f'{agent["model"]} · {agent["program"]} · last run {last}</span>'
    f'<div class="prose" style="font-size:14px; margin-top:8px;">{explained["purpose"]}</div>',
    unsafe_allow_html=True)
st.markdown("")

# ---- what's happening, in plain English --------------------------------------
st.markdown("#### What's happening")
for f in explained["findings"]:
    observed = ""
    if f["observed"]:
        items = "".join(f'<li style="margin-top:4px;">{o}</li>' for o in f["observed"])
        observed = (f'<div class="muted mono" style="font-size:11px; letter-spacing:0.08em; '
                    f'margin-top:12px;">OBSERVED</div>'
                    f'<ul class="evidence" style="margin:6px 0 0 0; '
                    f'padding-left:18px;">{items}</ul>')
    st.markdown(f'<div class="compass-card">{verdict_line(f["direction"], f["headline"], size=14)}'
                f'{observed}</div>', unsafe_allow_html=True)

# ---- metrics row (with window picker) ---------------------------------------
window = st.radio("Window", [7, 30, 60, 90], index=1, horizontal=True,
                  format_func=lambda d: f"{d} days")
runs = common.runs_df(sel, days=window)
all_runs = common.runs_df(sel, days=90)

task = explained["task_noun"]
n_runs, n_done = len(runs), int(runs["task_completed"].sum()) if len(runs) else 0
m1, m2, m3, m4, m5 = st.columns(5)
m1.metric("Total runs", f"{n_runs:,}",
          help=f"One run = one {task} attempted.")
m2.metric("Avg cost / run", fmt_money(runs["total_cost_usd"].mean()) if n_runs else "—",
          help=f"What one {task} costs, on average.")
m3.metric("Avg latency", f"{runs['latency_ms'].mean()/1000:.1f}s" if n_runs else "—",
          help=f"How long one {task} takes.")
m4.metric("Tasks finished", f"{100*runs['task_completed'].mean():.0f}%" if n_runs else "—",
          help=f"Finished {n_done:,} of {n_runs:,} {task}s in this window. "
               "The rest were started, paid for, and never delivered.")
m5.metric("Quality score", f"{runs['output_quality_score'].mean():.2f}" if n_runs else "—",
          help=f"How good each delivered {task} was, rated 0–1 by review checks. "
               "Below ~0.7 usually means a human had to redo it.")

st.markdown("---")
left, right = st.columns([3, 2])

# ---- cost chart -------------------------------------------------------------
with left:
    st.markdown("#### Cost · 90 days")
    mode = st.radio("Mode", ["Daily", "Cumulative"], horizontal=True, label_visibility="collapsed")
    if not all_runs.empty:
        daily = (all_runs.set_index("run_at")["total_cost_usd"]
                 .resample("D").sum().reset_index())
        fig = go.Figure()
        if mode == "Daily":
            mean, std = daily["total_cost_usd"].mean(), daily["total_cost_usd"].std()
            anomalies = daily[daily["total_cost_usd"] > mean + 2.5 * (std or 0)]
            fig.add_bar(x=daily["run_at"], y=daily["total_cost_usd"],
                        marker_color=COLORS["accent"], name="daily cost")
            if not anomalies.empty:
                fig.add_scatter(x=anomalies["run_at"], y=anomalies["total_cost_usd"],
                                mode="markers", name="anomaly",
                                marker=dict(color=COLORS["critical"], size=10, symbol="diamond"))
        else:
            fig.add_scatter(x=daily["run_at"], y=daily["total_cost_usd"].cumsum(),
                            mode="lines", line=dict(color=COLORS["accent"], width=2),
                            fill="tozeroy", fillcolor="rgba(129,140,248,0.10)")
        st.plotly_chart(plotly_layout(fig, 300), use_container_width=True)

    st.markdown("#### Output quality · 90 days")
    if not all_runs.empty and all_runs["output_quality_score"].notna().any():
        q = (all_runs.set_index("run_at")["output_quality_score"]
             .resample("D").mean().dropna().reset_index())
        fig = go.Figure()
        fig.add_scatter(x=q["run_at"], y=q["output_quality_score"], mode="lines",
                        line=dict(color=COLORS["healthy"], width=2), name="quality")
        for _, v in common.versions_df(sel).iterrows():
            ts = pd.Timestamp(v["created_at"])
            if ts >= q["run_at"].min():
                fig.add_vline(x=ts, line_dash="dash", line_color=COLORS["needs_attention"])
                fig.add_annotation(x=ts, y=1.0, text=v["label"], showarrow=False,
                                   font=dict(size=10, color=COLORS["needs_attention"]),
                                   yanchor="bottom")
        fig.update_yaxes(range=[0, 1.05])
        st.plotly_chart(plotly_layout(fig, 300), use_container_width=True)

# ---- token breakdown + recommendations --------------------------------------
with right:
    st.markdown("#### Token breakdown")
    if len(runs):
        ti, to = runs["input_tokens"].sum(), runs["output_tokens"].sum()
        fig = go.Figure(go.Pie(
            labels=["Input tokens", "Output tokens"], values=[ti, to], hole=0.6,
            marker=dict(colors=[COLORS["needs_attention"], COLORS["healthy"]]),
            textinfo="percent"))
        fig.add_annotation(text=f"{fmt_tokens(ti + to)}", showarrow=False,
                           font=dict(size=16, family="IBM Plex Mono"))
        st.plotly_chart(plotly_layout(fig, 260), use_container_width=True)
        if ti > 10 * to:
            st.markdown(
                f'<span class="prose" style="color:{COLORS["needs_attention"]};">'
                f'⚠ Input tokens are {ti/to:.0f}x output — this agent is paying for '
                f'context it may not need.</span>', unsafe_allow_html=True)

    st.markdown("#### Recommendations")
    recs = common.recs_df("pending")
    recs = recs[recs["agent_id"] == sel]
    if recs.empty:
        st.markdown('<span class="muted">None pending.</span>', unsafe_allow_html=True)
    for _, r in recs.iterrows():
        st.markdown(
            f'<div class="compass-card">{sev_badge(r["severity"])} '
            f'<span class="muted2" style="font-size:12px;">{rec_label(r["type"])}</span>'
            f'<div class="rec-line" style="margin-top:8px;">{r["description"]}</div>'
            f'<div class="mono accent" style="font-size:13px; margin-top:6px;">'
            f'{"est. savings " + fmt_money(r["estimated_savings_usd"]) + "/mo" if r["estimated_savings_usd"] else ""}'
            f'</div></div>', unsafe_allow_html=True)
        b1, b2 = st.columns(2)
        if b1.button("Apply", key=f"ap_{r['id']}", type="primary", use_container_width=True):
            common.set_rec_status(r["id"], "applied")
            st.toast(f"Applied: {r['type']} → {agent['name']}")
            st.rerun()
        if b2.button("Dismiss", key=f"di_{r['id']}", use_container_width=True):
            common.set_rec_status(r["id"], "dismissed")
            st.rerun()
        with st.expander("How this was detected"):
            st.write(r["detail"])

st.markdown("---")

# ---- run history ------------------------------------------------------------
st.markdown("#### Run history · last 20")
hist = all_runs.sort_values("run_at", ascending=False).head(20)
if not hist.empty:
    show = hist[["run_at", "input_tokens", "output_tokens", "total_cost_usd",
                 "latency_ms", "task_completed", "output_quality_score", "notes"]].copy()
    show.columns = ["time", "in tokens", "out tokens", "cost $", "latency ms",
                    "completed", "quality", "notes"]
    st.dataframe(show, use_container_width=True, hide_index=True)
    with st.expander("Inspect a run"):
        rid = st.selectbox("Run", hist["id"],
                           format_func=lambda i: str(hist.set_index("id").loc[i, "run_at"]))
        run = hist.set_index("id").loc[rid]
        st.markdown(
            f'<div class="compass-card mono wrap-anywhere" style="font-size:13px;">'
            f'<b>input</b> · {run["input_tokens"]:,} tokens<br>'
            f'<span class="muted">[input payload preview — {fmt_tokens(run["input_tokens"])} tokens'
            f'{", truncated: full document context attached" if run["input_tokens"] > 20000 else ""}]</span><br><br>'
            f'<b>output</b> · {run["output_tokens"]:,} tokens · quality {run["output_quality_score"]}<br>'
            f'<span class="muted">[output preview — {fmt_tokens(run["output_tokens"])} tokens]</span><br><br>'
            f'{"<b>note</b> · " + run["notes"] if isinstance(run["notes"], str) else ""}</div>',
            unsafe_allow_html=True)

# ---- version history ----------------------------------------------------------
st.markdown("#### Version history")
for _, v in common.versions_df(sel).sort_values("created_at", ascending=False).iterrows():
    st.markdown(
        f'<div class="compass-card"><span class="mono accent">{v["label"]}</span> '
        f'<span class="muted mono" style="font-size:12px;">· {v["created_at"][:16].replace("T", " ")} '
        f'· {v["created_by"]}</span></div>', unsafe_allow_html=True)
    with st.expander(f"Prompt snapshot — {v['label']}"):
        st.code(v["prompt_snapshot"] or "(empty)", language="markdown")
