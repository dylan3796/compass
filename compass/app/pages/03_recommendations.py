import theme

theme.inject()

import streamlit as st

import common
from theme import fmt_money, rec_label, sev_badge, verdict_line

st.markdown("## ▸ Recommendations")
st.markdown('<span class="page-sub">Triage inbox — highest ROI first</span>',
            unsafe_allow_html=True)
st.markdown("")

recs = common.recs_df(status=None)
pending = recs[recs["status"] == "pending"]
explained = common.explanations()

c1, c2, c3, c4 = st.columns(4)
sev = c1.selectbox("Severity", ["All", "high", "medium", "low"])
agent = c2.selectbox("Agent", ["All"] + sorted(pending["agent_name"].unique().tolist()))
rtype = c3.selectbox("Fix", ["All"] + sorted(pending["type"].unique().tolist()),
                     format_func=lambda t: t if t == "All" else rec_label(t))
sort = c4.selectbox("Sort by", ["Estimated savings", "Severity"])

view = pending.copy()
if sev != "All":
    view = view[view["severity"] == sev]
if agent != "All":
    view = view[view["agent_name"] == agent]
if rtype != "All":
    view = view[view["type"] == rtype]

if sort == "Estimated savings":
    view = view.sort_values("estimated_savings_usd", ascending=False, na_position="last")
else:
    order = {"high": 0, "medium": 1, "low": 2}
    view = view.iloc[view["severity"].map(order).argsort()]

total = view["estimated_savings_usd"].fillna(0).sum()
st.markdown(
    f'<div class="compass-card"><span class="mono">'
    f'{len(view)} pending · potential savings <b class="accent">{fmt_money(total)}/mo</b>'
    f'</span></div>', unsafe_allow_html=True)

for _, r in view.iterrows():
    box = st.container()
    with box:
        col1, col2, col3 = st.columns([6, 2, 2])
        e = explained.get(r["agent_id"])
        why = (f'<div style="margin-top:8px;">'
               f'{verdict_line(e["direction"], "<i>What we observed:</i> " + e["verdict"], size=13)}'
               f'</div>') if e and e["direction"] in ("bad", "warn") else ""
        col1.markdown(
            f'<div style="padding-top:4px; padding-right:16px;">{sev_badge(r["severity"])} '
            f'<span class="mono" style="font-weight:600;">{r["agent_name"]}</span> '
            f'<span class="muted2" style="font-size:12px;">{rec_label(r["type"])}</span>'
            f'<div class="rec-line" style="margin-top:8px;">{r["description"]}</div>{why}</div>',
            unsafe_allow_html=True)
        col2.markdown(
            f'<div class="mono accent" style="padding-top:12px; font-size:15px; text-align:right;">'
            f'{fmt_money(r["estimated_savings_usd"]) + "/mo" if r["estimated_savings_usd"] else "—"}</div>',
            unsafe_allow_html=True)
        with col3:
            if st.button("Apply", key=f"a_{r['id']}", type="primary", use_container_width=True):
                common.set_rec_status(r["id"], "applied")
                st.toast(f"Applied {r['type']} for {r['agent_name']}")
                st.rerun()
            if st.button("Dismiss", key=f"d_{r['id']}", use_container_width=True):
                common.set_rec_status(r["id"], "dismissed")
                st.rerun()
        with st.expander("How this was detected"):
            st.write(r["detail"])
            if st.button("View agent →", key=f"v_{r['id']}"):
                common.goto_agent(r["agent_id"])
    st.markdown('<hr style="margin:4px 0;">', unsafe_allow_html=True)

resolved = recs[recs["status"] != "pending"]
if not resolved.empty:
    with st.expander(f"Resolved ({len(resolved)})"):
        for _, r in resolved.iterrows():
            st.markdown(
                f'<span class="muted2" style="font-size:13px; line-height:1.5;">'
                f'<span class="mono">[{r["status"].upper()}]</span> '
                f'{r["agent_name"]} · {rec_label(r["type"])} — {r["description"]}</span>',
                unsafe_allow_html=True)
