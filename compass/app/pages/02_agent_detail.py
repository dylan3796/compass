import theme

theme.inject()

from datetime import datetime

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

import common
from theme import COLORS, TYPE_ICON, badge, fmt_money, fmt_tokens, new_badge, plotly_layout, sev_badge

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
st.markdown(
    f'<div style="display:flex; justify-content:space-between; align-items:center;">'
    f'<h2 style="margin:0;">{TYPE_ICON.get(agent["type"], "•")} {agent["name"]}</h2>'
    f'<div>{badge(agent["status"])}{nb}</div></div>'
    f'<span class="muted mono" style="font-size:13px;">{agent["type"].replace("_", " ")} · '
    f'{agent["model"]} · {agent["program"]} · last run {last}</span>',
    unsafe_allow_html=True)
st.markdown("")

# ---- metrics row (with window picker) ---------------------------------------
window = st.radio("Window", [7, 30, 60, 90], index=1, horizontal=True,
                  format_func=lambda d: f"{d} days")
runs = common.runs_df(sel, days=window)
all_runs = common.runs_df(sel, days=90)

m1, m2, m3, m4, m5 = st.columns(5)
m1.metric("Total runs", f"{len(runs):,}")
m2.metric("Avg cost / run", fmt_money(runs["total_cost_usd"].mean()) if len(runs) else "—")
m3.metric("Avg latency", f"{runs['latency_ms'].mean()/1000:.1f}s" if len(runs) else "—")
m4.metric("Completion rate", f"{100*runs['task_completed'].mean():.0f}%" if len(runs) else "—")
m5.metric("Quality score", f"{runs['output_quality_score'].mean():.2f}" if len(runs) else "—")

# ---- projection vs. actual (value assurance) --------------------------------
# Shown only for agents that were specced against a projection. This panel IS
# the category: the promise the agent was hired on vs. what it delivers.
def _field(key):
    v = agent.get(key)
    return None if v is None or pd.isna(v) else v


if _field("projected_value_usd_mo") or _field("projected_cost_usd_mo"):
    st.markdown("---")
    st.markdown("#### Projection vs. actual")
    st.markdown(
        f'<span class="muted mono" style="font-size:12px;">Projection source: '
        f'{_field("projection_source") or "—"} · actuals from the last 30 days, '
        f'monthly run-rate</span>', unsafe_allow_html=True)

    last30 = common.runs_df(sel, days=30)
    actual_cost_mo = last30["total_cost_usd"].sum()
    unit = _field("unit_value_usd")
    delivered_mo = (last30["task_completed"].sum() * unit) if unit else None

    pv1, pv2 = st.columns(2)
    with pv1:
        proj_v = _field("projected_value_usd_mo")
        if proj_v and delivered_mo is not None:
            pct = 100 * delivered_mo / proj_v
            color = COLORS["healthy"] if pct >= 100 else (
                COLORS["needs_attention"] if pct >= 75 else COLORS["critical"])
            fig = go.Figure()
            fig.add_bar(y=["promised", "delivered"], x=[proj_v, delivered_mo],
                        orientation="h", marker_color=[COLORS["muted"], color],
                        text=[f"${proj_v:,.0f}", f"${delivered_mo:,.0f}"],
                        textposition="auto")
            fig.update_layout(title=dict(text="value / mo", font=dict(size=12)),
                              showlegend=False)
            st.plotly_chart(plotly_layout(fig, 200), use_container_width=True)
            verdict = ("beating its projection" if pct > 110 else
                       "on plan" if pct >= 75 else "badly missing its projection")
            st.markdown(
                f'<span class="mono" style="color:{color}; font-size:13px;">'
                f'{agent["name"]} is delivering {pct:.0f}% of promised value — {verdict}.'
                f'</span>', unsafe_allow_html=True)
        else:
            st.markdown('<span class="muted">No value projection on file.</span>',
                        unsafe_allow_html=True)
    with pv2:
        proj_c = _field("projected_cost_usd_mo")
        if proj_c:
            over = actual_cost_mo / proj_c if proj_c else 0
            ccolor = COLORS["healthy"] if over <= 1.2 else (
                COLORS["needs_attention"] if over <= 2 else COLORS["critical"])
            fig = go.Figure()
            fig.add_bar(y=["projected", "actual"], x=[proj_c, actual_cost_mo],
                        orientation="h", marker_color=[COLORS["muted"], ccolor],
                        text=[f"${proj_c:,.0f}", f"${actual_cost_mo:,.0f}"],
                        textposition="auto")
            fig.update_layout(title=dict(text="cost / mo", font=dict(size=12)),
                              showlegend=False)
            st.plotly_chart(plotly_layout(fig, 200), use_container_width=True)
            if over > 2:
                st.markdown(
                    f'<span class="mono" style="color:{ccolor}; font-size:13px;">'
                    f'Cost is {over:.1f}x projection — see the right-size / trim '
                    f'recommendations.</span>', unsafe_allow_html=True)
    if unit:
        st.markdown(
            f'<span class="muted mono" style="font-size:12px;">Delivered value = '
            f'completed runs × ${unit:,.2f} ({_field("value_basis")})</span>',
            unsafe_allow_html=True)

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
                f'<span class="mono" style="color:{COLORS["needs_attention"]}; font-size:12px;">'
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
            f'<span class="mono muted" style="font-size:11px;">{r["type"]}</span>'
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
            f'<div class="compass-card mono" style="font-size:13px;">'
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
