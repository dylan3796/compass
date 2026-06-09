import theme

theme.inject()

import json

import pandas as pd
import streamlit as st

import common
from theme import COLORS, badge

st.markdown("## ⛨ Guardrails")
st.markdown('<span class="muted mono">Every agent should have guardrails. Most don\'t.</span>',
            unsafe_allow_html=True)
st.markdown("")

GUARDRAIL_TYPES = {
    "max_tokens": ("Max tokens", {"max_input_tokens": 8000, "max_output_tokens": 2000}),
    "output_validator": ("Output validator", {"pattern": "^.+$"}),
    "rate_limit": ("Rate limiter", {"max_runs_per_hour": 20}),
    "topic_filter": ("Topic filter", {"blocked_topics": ["medical", "legal"]}),
    "completion_checker": ("Completion checker", {"max_revisions": 3, "stall_tokens": 2000}),
}

agents = common.agents_df()
grs = pd.read_sql_query("SELECT * FROM Guardrail", common.conn())

unguarded = [a["name"] for _, a in agents.iterrows()
             if grs[(grs["agent_id"] == a["id"]) & (grs["active"] == 1)].empty]
if unguarded:
    st.markdown(
        f'<div class="compass-card" style="border-color:{COLORS["critical"]};">'
        f'<span class="mono" style="color:{COLORS["critical"]};">⚠ {len(unguarded)} agents have '
        f'no active guardrails:</span> <span class="mono">{", ".join(unguarded)}</span></div>',
        unsafe_allow_html=True)

for _, a in agents.iterrows():
    ag_grs = grs[grs["agent_id"] == a["id"]]
    n_active = int((ag_grs["active"] == 1).sum())
    state = (f'<span class="badge badge-healthy">{n_active} ACTIVE</span>' if n_active
             else '<span class="badge badge-critical">UNGUARDED</span>')
    st.markdown(
        f'<div class="compass-card" style="margin-bottom:4px;">'
        f'<div style="display:flex; justify-content:space-between; align-items:center;">'
        f'<span class="mono" style="font-size:15px; font-weight:600;">{a["name"]}</span>'
        f'<div>{state} {badge(a["status"])}</div></div></div>',
        unsafe_allow_html=True)

    with st.expander(f"Manage guardrails — {a['name']}"):
        if ag_grs.empty:
            st.markdown('<span class="muted">No guardrails configured.</span>',
                        unsafe_allow_html=True)
        for _, g in ag_grs.iterrows():
            c1, c2, c3 = st.columns([3, 4, 1])
            c1.markdown(
                f'<span class="mono" style="font-weight:600;">{g["name"]}</span><br>'
                f'<span class="mono muted" style="font-size:11px;">{g["type"]}</span>',
                unsafe_allow_html=True)
            trig = (f'last triggered {g["last_triggered"][:10]} — {g["last_triggered_note"]}'
                    if isinstance(g["last_triggered"], str) else "never triggered")
            c2.markdown(
                f'<span class="mono" style="font-size:12px;">{g["config"]}</span><br>'
                f'<span class="muted" style="font-size:12px;">{trig}</span>',
                unsafe_allow_html=True)
            active = c3.toggle("on", value=bool(g["active"]), key=f"t_{g['id']}")
            if active != bool(g["active"]):
                common.toggle_guardrail(g["id"], active)
                st.rerun()

        st.markdown("**Add guardrail**")
        gtype = st.selectbox("Type", list(GUARDRAIL_TYPES),
                             format_func=lambda t: GUARDRAIL_TYPES[t][0],
                             key=f"sel_{a['id']}")
        cfg = st.text_area("Config (JSON)", json.dumps(GUARDRAIL_TYPES[gtype][1]),
                           key=f"cfg_{a['id']}", height=68)
        if st.button("Add", key=f"add_{a['id']}", type="primary"):
            try:
                common.add_guardrail(a["id"], GUARDRAIL_TYPES[gtype][0], gtype,
                                     json.loads(cfg))
                st.toast(f"Added {GUARDRAIL_TYPES[gtype][0]} to {a['name']}")
                st.rerun()
            except json.JSONDecodeError:
                st.error("Config must be valid JSON")
