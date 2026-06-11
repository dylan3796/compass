import theme

theme.inject()

import difflib

import streamlit as st

import common
from theme import badge, fmt_money

st.markdown("## ⑂ Clone Studio")
st.markdown('<span class="page-sub">Take the prompt from an agent that\'s doing well '
            'and apply it to one that\'s struggling.</span>',
            unsafe_allow_html=True)
st.markdown("")

agents = common.agents_df()
ids = list(agents["id"])
names = agents.set_index("id")["name"]
scores = common.scores()


def latest_version(agent_id):
    vs = common.versions_df(agent_id)
    return vs.iloc[-1] if len(vs) else None


c1, c2 = st.columns(2)
src = c1.selectbox("Source agent (clone from)", ids,
                   index=ids.index("ag_drafter") if "ag_drafter" in ids else 0,
                   format_func=lambda i: names[i])
tgt = c2.selectbox("Target agent (to improve)", ids,
                   index=ids.index("ag_coder") if "ag_coder" in ids else 0,
                   format_func=lambda i: names[i])

sv, tv = latest_version(src), latest_version(tgt)
ss, ts = scores.get(src, {}), scores.get(tgt, {})
sa = agents.set_index("id").loc[src]
ta = agents.set_index("id").loc[tgt]


def metric_block(col, a, s, version):
    q_txt = f"{s['quality_avg']:.2f}" if s.get("quality_avg") else "—"
    comp_txt = f"{100 * s['completion_rate']:.0f}%" if s.get("completion_rate") is not None else "—"
    lat_txt = f"{s['avg_latency'] / 1000:.1f}s" if s.get("avg_latency") else "—"
    col.markdown(
        f'<div class="compass-card">'
        f'<div style="display:flex; justify-content:space-between;">'
        f'<span class="mono" style="font-size:16px; font-weight:600;">{a["name"]}</span>'
        f'{badge(a["status"])}</div>'
        f'<div class="purpose">{a["purpose"] or ""}</div>'
        f'<div class="mono muted" style="font-size:12px; margin-top:4px;">{a["model"]} · '
        f'{version["label"] if version is not None else "no versions"}</div>'
        f'<div style="display:flex; gap:20px; margin-top:10px;" class="mono">'
        f'<span style="font-size:13px;">quality <b>{q_txt}</b></span>'
        f'<span style="font-size:13px;">completion <b>{comp_txt}</b></span>'
        f'<span style="font-size:13px;">cost/run <b>{fmt_money(s.get("avg_cost"))}</b></span>'
        f'<span style="font-size:13px;">latency <b>{lat_txt}</b></span>'
        f'</div></div>', unsafe_allow_html=True)


metric_block(c1, sa, ss, sv)
metric_block(c2, ta, ts, tv)

with c1:
    st.markdown("**Source prompt**")
    st.code(sv["prompt_snapshot"] if sv is not None else "", language="markdown")
with c2:
    st.markdown("**Target prompt**")
    st.code(tv["prompt_snapshot"] if tv is not None else "", language="markdown")

st.markdown("#### Diff")
if sv is not None and tv is not None:
    diff = "\n".join(difflib.unified_diff(
        (tv["prompt_snapshot"] or "").splitlines(),
        (sv["prompt_snapshot"] or "").splitlines(),
        fromfile=f"{ta['name']} ({tv['label']})",
        tofile=f"{sa['name']} ({sv['label']})", lineterm=""))
    st.code(diff or "(prompts identical)", language="diff")

st.markdown("#### Actions")
a1, a2, a3 = st.columns(3)

if a1.button("Copy prompt structure →", type="primary", use_container_width=True,
             disabled=src == tgt):
    merged = (f"{sv['prompt_snapshot']}\n\n"
              f"## Task domain (preserved from {ta['name']})\n"
              f"Apply the structure above to: {ta['type'].replace('_', ' ')}.")
    vid = common.add_version(tgt, f"v{len(common.versions_df(tgt)) + 1} — cloned from "
                             f"{sa['name']}", merged,
                             parent_id=tv["id"] if tv is not None else None)
    st.toast(f"New version created for {ta['name']} using {sa['name']}'s structure")
    st.rerun()

if a2.button("Fork as new agent", use_container_width=True, disabled=src == tgt):
    new_name = f"{ta['name']} v2"
    prompt = (f"{sv['prompt_snapshot']}\n\n## Task domain (preserved from {ta['name']})\n"
              f"Apply the structure above to: {ta['type'].replace('_', ' ')}.")
    aid = common.fork_agent(tgt, new_name, prompt,
                            parent_version_id=tv["id"] if tv is not None else None)
    st.toast(f"Forked {ta['name']} → {new_name}. Both run side by side.")
    st.rerun()

a3.button("A/B test (next 50 runs) — COMING SOON", use_container_width=True, disabled=True)

st.markdown("---")
st.markdown("#### Version lineage")
versions = common.versions_df()
by_id = {v["id"]: v for _, v in versions.iterrows()}
for aid in ids:
    chain = versions[versions["agent_id"] == aid].sort_values("created_at")
    if chain.empty:
        continue
    parts = []
    for _, v in chain.iterrows():
        parent = by_id.get(v["parent_version_id"])
        origin = ""
        if parent is not None and parent["agent_id"] != aid:
            origin = f' <span class="accent">(from {names[parent["agent_id"]]})</span>'
        parts.append(f'<span class="mono">{v["label"]}</span>{origin}')
    st.markdown(
        f'<div class="compass-card" style="margin-bottom:6px;">'
        f'<span class="mono" style="font-weight:600;">{names[aid]}</span> '
        f'<span class="muted mono" style="font-size:12px;">· '
        f'{" → ".join(parts)}</span></div>', unsafe_allow_html=True)
