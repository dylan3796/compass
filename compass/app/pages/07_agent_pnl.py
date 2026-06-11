import theme

theme.inject()

from datetime import datetime, timedelta

import pandas as pd
import streamlit as st

import common
from core.pnl_generator import ARROW, render_html, render_text, weekly_pnl
from theme import COLORS, fmt_money

st.markdown("## Agent P&L")
st.markdown(
    '<span class="muted">Every agent is an employee. This is the payroll report — '
    'what each one cost, what it delivered, and whether it\'s keeping the promise '
    'it was hired on.</span>', unsafe_allow_html=True)
st.markdown("")

# ---- week selector -----------------------------------------------------------
weeks = []
anchor = datetime.now()
for i in range(8):
    end = anchor - timedelta(days=7 * i)
    weeks.append(end)
sel_end = st.selectbox(
    "Week", weeks,
    format_func=lambda e: f"{(e - timedelta(days=7)):%b %d} – {e:%b %d}"
                          + (" (current)" if e == weeks[0] else ""))

pnl = weekly_pnl(common.conn(), sel_end)
t = pnl["totals"]

m1, m2, m3, m4 = st.columns(4)
m1.metric("Cost", fmt_money(t["cost"]))
m2.metric("Value delivered", fmt_money(t["value"]))
m3.metric("Runs", f"{t['runs']:,}")
m4.metric("Agents", f"{t['agents']} ({t['valued_agents']} valued)")

# ---- the table -----------------------------------------------------------------
trend_color = {"up": COLORS["healthy"], "down": COLORS["critical"], "flat": COLORS["muted"]}


def plan_text(r):
    if r["plan_pct"] is None:
        return "—"
    return f"{r['plan_pct']}% of plan"


rows = pd.DataFrame([{
    "agent": r["name"],
    "program": r["program"],
    "runs": r["runs"],
    "cost": fmt_money(r["cost"]),
    "value delivered": fmt_money(r["value"]) if r["value"] is not None else "—",
    "ROI": f"{r['roi']:,.0f}x" if r["roi"] is not None else "—",
    "vs. plan": plan_text(r),
    "trend": ARROW[r["trend"]],
} for r in pnl["rows"]])
st.dataframe(rows, use_container_width=True, hide_index=True)

st.markdown(
    f'<span class="muted mono" style="font-size:12px;">Value = completed runs × the '
    f'agent\'s documented unit value (see basis below). Agents without an honest value '
    f'model show "—" — cost and trend are still tracked, the value is not invented.</span>',
    unsafe_allow_html=True)

# ---- plan callouts -------------------------------------------------------------
misses = [r for r in pnl["rows"] if r["plan_pct"] is not None and r["plan_pct"] < 75]
beats = [r for r in pnl["rows"] if r["plan_pct"] is not None and r["plan_pct"] > 110]
if misses or beats:
    st.markdown("#### Promised vs. delivered")
for r in misses:
    st.markdown(
        f'<div class="compass-card"><span class="badge badge-sev-high">MISSING PLAN</span> '
        f'<span class="rec-line" style="margin-left:8px;"><b>{r["name"]}</b> is delivering '
        f'{r["plan_pct"]}% of its projection <span class="muted">({r["projection_source"]})</span>.'
        f'</span></div>', unsafe_allow_html=True)
    if st.button(f"Open {r['name']} →", key=f"miss_{r['agent_id']}"):
        common.goto_agent(r["agent_id"])
for r in beats:
    st.markdown(
        f'<div class="compass-card"><span class="badge badge-healthy">BEATING PLAN</span> '
        f'<span class="rec-line" style="margin-left:8px;"><b>{r["name"]}</b> is delivering '
        f'{r["plan_pct"]}% of its projection <span class="muted">({r["projection_source"]})</span>.'
        f'</span></div>', unsafe_allow_html=True)

# ---- value bases (the honesty appendix) -----------------------------------------
with st.expander("How value is estimated, per agent"):
    for r in pnl["rows"]:
        basis = r["value_basis"] or "no value model — shown as — in the P&L"
        st.markdown(f'<span class="mono" style="font-size:13px;"><b>{r["name"]}</b> · '
                    f'<span class="muted">{basis}</span></span>', unsafe_allow_html=True)

# ---- exports --------------------------------------------------------------------
st.markdown("---")
c1, c2, _ = st.columns([1, 1, 2])
stamp = f"{pnl['week_end']:%Y-%m-%d}"
c1.download_button(
    "Export P&L (HTML → print to PDF)", render_html(pnl),
    file_name=f"agent_pnl_{stamp}.html", mime="text/html", use_container_width=True)
c2.download_button(
    "Email version (plain text)", render_text(pnl),
    file_name=f"agent_pnl_{stamp}.txt", mime="text/plain", use_container_width=True)
st.markdown(
    '<span class="muted mono" style="font-size:12px;">The HTML export is the artifact '
    'you forward — open it and print to PDF.</span>', unsafe_allow_html=True)
