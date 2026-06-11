"""Shared look & feel: command-center dark theme, badges, metric helpers."""

import sys
from pathlib import Path

COMPASS_ROOT = Path(__file__).resolve().parents[1]
if str(COMPASS_ROOT) not in sys.path:
    sys.path.insert(0, str(COMPASS_ROOT))

import streamlit as st  # noqa: E402

COLORS = {
    "bg": "#0A0A0A",
    "surface": "#141414",
    "surface2": "#1E1E1E",
    "healthy": "#10B981",
    "needs_attention": "#F59E0B",
    "critical": "#EF4444",
    "accent": "#818CF8",
    "muted": "#8A8A8A",
}

STATUS_LABEL = {
    "healthy": "HEALTHY",
    "needs_attention": "NEEDS ATTENTION",
    "critical": "CRITICAL",
}

TYPE_ICON = {
    "research": "◎", "email_drafting": "✉", "classification": "▤",
    "doc_summarization": "≣", "cold_outreach": "➤", "code_generation": "</>",
    "support_replies": "♯", "data_analysis": "∑",
}

CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
h1, h2, h3, code, .metric-value, .mono { font-family: 'IBM Plex Mono', monospace !important; }
.stApp { background-color: #0A0A0A; }
section[data-testid="stSidebar"] { background-color: #111111; border-right: 1px solid #222; }

.compass-card {
  background: #141414; border: 1px solid #232323; border-radius: 8px;
  padding: 16px 18px; margin-bottom: 12px;
}
.compass-card:hover { border-color: #3a3a3a; }

.badge {
  font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; font-weight: 600;
  letter-spacing: 0.08em; padding: 3px 9px; border-radius: 4px; white-space: nowrap;
}
.badge-healthy { color: #10B981; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.35); }
.badge-needs_attention { color: #F59E0B; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.35); }
.badge-critical { color: #EF4444; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.35);
                  animation: pulse-red 2s ease-in-out infinite; }
.badge-new { color: #818CF8; background: rgba(129,140,248,0.12); border: 1px solid rgba(129,140,248,0.35); }
.badge-sev-high { color: #EF4444; background: rgba(239,68,68,0.10); border: 1px solid rgba(239,68,68,0.3); }
.badge-sev-medium { color: #F59E0B; background: rgba(245,158,11,0.10); border: 1px solid rgba(245,158,11,0.3); }
.badge-sev-low { color: #8A8A8A; background: rgba(138,138,138,0.10); border: 1px solid rgba(138,138,138,0.3); }

@keyframes pulse-red { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
@keyframes pulse-vital { 0%,100% { opacity: 0.85; } 50% { opacity: 1; } }

.vital-bar { height: 6px; border-radius: 3px; background: #232323; overflow: hidden; margin-top: 6px; }
.vital-fill { height: 100%; border-radius: 3px; animation: pulse-vital 2.4s ease-in-out infinite; }

.metric-label { font-size: 11px; letter-spacing: 0.1em; color: #8A8A8A; text-transform: uppercase;
                font-family: 'IBM Plex Mono', monospace; }
.metric-value { font-size: 26px; font-weight: 600; color: #FAFAFA; }
.metric-sub { font-size: 12.5px; color: #8A8A8A; }
.accent { color: #818CF8; }
.muted { color: #8A8A8A; }
.muted2 { color: #B0B0B0; }
.up { color: #EF4444; } .down { color: #10B981; }

/* Reading-length plain-English text. Regular UI font, AA+ contrast. */
.prose { font-family: 'Inter', sans-serif; font-size: 13.5px; color: #C9C9C9; line-height: 1.5; }
.purpose { font-family: 'Inter', sans-serif; font-size: 13px; color: #B0B0B0;
           line-height: 1.45; margin-top: 6px; }
.page-sub { font-family: 'Inter', sans-serif; font-size: 13.5px; color: #B0B0B0; line-height: 1.5; }
.evidence { font-family: 'Inter', sans-serif; font-size: 13px; color: #B0B0B0; line-height: 1.5; }

.rec-line { font-size: 13.5px; color: #C9C9C9; line-height: 1.5; }
hr { border-color: #232323; }
div[data-testid="stMetric"] { background: #141414; border: 1px solid #232323;
  border-radius: 8px; padding: 12px 16px; }
</style>
"""


def inject():
    st.set_page_config(page_title="Compass — Agent ROI", page_icon="🧭",
                       layout="wide", initial_sidebar_state="expanded")
    st.markdown(CSS, unsafe_allow_html=True)


def badge(status: str) -> str:
    return f'<span class="badge badge-{status}">{STATUS_LABEL.get(status, status.upper())}</span>'


def new_badge() -> str:
    return '<span class="badge badge-new">NEW</span>'


def sev_badge(sev: str) -> str:
    return f'<span class="badge badge-sev-{sev}">{sev.upper()}</span>'


VERDICT_ICON = {"bad": "✗", "warn": "⚠", "good": "✓", "none": "·"}
VERDICT_COLOR = {"bad": COLORS["critical"], "warn": COLORS["needs_attention"],
                 "good": COLORS["healthy"], "none": COLORS["muted"]}

REC_TYPE_LABEL = {
    "trim_context": "Stop paying to re-read documents",
    "prompt_regression": "Review a bad prompt change",
    "clone_best_performer": "Copy what the best agent does",
    "add_guardrail": "Stop paying for unfinished work",
    "rate_limit": "Cap runaway retries",
    "restructure_input": "Standardize the input format",
}


def rec_label(rtype: str) -> str:
    return REC_TYPE_LABEL.get(rtype, rtype.replace("_", " "))


def verdict_line(direction: str, text: str, size=13.5) -> str:
    return (f'<div style="font-size:{size}px; color:#C9C9C9; line-height:1.45;">'
            f'<span style="color:{VERDICT_COLOR.get(direction, COLORS["muted"])};">'
            f'{VERDICT_ICON.get(direction, "·")}</span> {text}</div>')


def vital(health: float, status: str) -> str:
    color = COLORS.get(status, COLORS["muted"])
    pct = max(4, min(100, health or 0))
    return (f'<div class="vital-bar"><div class="vital-fill" '
            f'style="width:{pct}%; background:{color};"></div></div>')


def fmt_money(x) -> str:
    if x is None:
        return "—"
    return f"${x:,.2f}"


def fmt_tokens(x) -> str:
    if x is None:
        return "—"
    if x >= 1000:
        return f"{x/1000:.1f}k"
    return f"{x:.0f}"


def plotly_layout(fig, height=320):
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="#141414", plot_bgcolor="#141414",
        font=dict(family="IBM Plex Mono, monospace", size=11, color="#C9C9C9"),
        margin=dict(l=40, r=20, t=36, b=36), height=height,
        xaxis=dict(gridcolor="#232323"), yaxis=dict(gridcolor="#232323"),
        legend=dict(bgcolor="rgba(0,0,0,0)"),
    )
    return fig
