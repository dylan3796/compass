import theme

theme.inject()

import streamlit as st

from opportunity_map.scoring import load_assessment, rank_candidates
from theme import COLORS

st.markdown("## Opportunity Map")
st.markdown(
    '<span class="muted">The answer to "we know we need agents — we don\'t know which '
    'ones." A structured assessment of the company\'s workflows, ranked by what an agent '
    'would actually return. Every projection below becomes a baseline Compass measures '
    'against once the agent ships.</span>', unsafe_allow_html=True)
st.markdown("")

data = load_assessment()
ranked = rank_candidates(data["candidates"])

st.markdown(
    f'<span class="mono muted" style="font-size:13px;">{data["company"]} · assessed '
    f'{data["assessed_at"]} · {len(data["interviewed"])} team leads interviewed · '
    f'{len(ranked)} candidates scored</span>', unsafe_allow_html=True)
st.markdown("")

DIM_LABEL = {"roi": "ROI", "feasibility": "FEASIBILITY", "data_readiness": "DATA", "risk": "RISK"}


def score_color(v):
    return (COLORS["healthy"] if v >= 75 else
            COLORS["needs_attention"] if v >= 50 else COLORS["critical"])


for i, c in enumerate(ranked, 1):
    sc = c["scores"]
    chips = " ".join(
        f'<span class="mono" style="font-size:11px; color:{score_color(v)}; '
        f'border:1px solid {score_color(v)}; border-radius:4px; padding:2px 8px; '
        f'margin-right:6px;">{DIM_LABEL[k]} {v:.0f}</span>'
        for k, v in sc.items())
    st.markdown(
        f'<div class="compass-card">'
        f'<div style="display:flex; justify-content:space-between; align-items:baseline;">'
        f'<span style="font-size:17px; font-weight:600;">#{i} · {c["name"]} '
        f'<span class="muted" style="font-size:13px; font-weight:400;">— {c["team"]}</span></span>'
        f'<span class="mono" style="font-size:22px; color:{score_color(c["score"])};">'
        f'{c["score"]:.0f}<span class="muted" style="font-size:13px;">/100</span></span></div>'
        f'<div style="margin:10px 0;">{chips}</div>'
        f'<div class="rec-line">{c["workflow"]}</div>'
        f'<div class="mono" style="font-size:13px; margin-top:10px;">'
        f'projected <span style="color:{COLORS["critical"]}">${c["projected_cost_usd_mo"]:,.0f}/mo cost</span>'
        f' → <span style="color:{COLORS["healthy"]}">${c["projected_value_usd_mo"]:,.0f}/mo value</span></div>'
        f'</div>', unsafe_allow_html=True)

    with st.expander(f"One-page spec — {c['name']}"):
        st.markdown(f"**Job description.** {c['workflow']}")
        st.markdown(
            f"**Inputs → outputs.** {c['inputs']} → {c['outputs']}\n\n"
            f"**Trigger.** {c['trigger']} · ~{c['volume_per_month']} items/month")
        st.markdown(
            f"**Model.** `{c['model_recommendation']}` · "
            f"~{c['tokens_per_run']['input']:,} in / {c['tokens_per_run']['output']:,} out "
            f"tokens per run, ~{c['runs_per_month']} runs/month")
        st.markdown("**Guardrails required.**")
        for g in c["guardrails"]:
            st.markdown(f"- {g}")
        st.markdown(
            f"**Projections.**\n\n"
            f"| | Projected | Basis |\n|---|---|---|\n"
            f"| Cost / month | ${c['projected_cost_usd_mo']:,.2f} | {c['cost_basis']} |\n"
            f"| Value / month | ${c['projected_value_usd_mo']:,.2f} | {c['value_basis']} |\n"
            f"| Success metric | {c['success_metric']} | |")
        st.markdown(f"**Build vs. buy.** {c['build_vs_buy']}")
        st.markdown("**Why this score.**")
        for k, label in DIM_LABEL.items():
            st.markdown(f"- *{label.lower()} {sc[k]:.0f}* — {c['rationale'][k]}")
        st.markdown(
            f'<div class="compass-card" style="border-color:{COLORS["accent"]};">'
            f'<span class="mono" style="color:{COLORS["accent"]};">'
            f'▸ When this agent ships, Compass tracks it against this projection.</span><br>'
            f'<span class="muted" style="font-size:13px;">The numbers above become the '
            f'agent\'s baseline — the weekly Agent P&L reports delivered-vs-promised from '
            f'the first run. That loop is the product.</span></div>',
            unsafe_allow_html=True)

st.markdown("---")
st.markdown(
    '<span class="muted mono" style="font-size:12px;">Methodology: workflow interviews '
    'scored on ROI potential (40%), technical feasibility (25%), data readiness (20%), '
    'and risk (15%) — see opportunity_map/assessment.md. Projected value is time '
    'recovered × loaded cost, assumptions written down; no strategy-deck multipliers.</span>',
    unsafe_allow_html=True)
