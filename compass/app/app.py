"""Compass — internal Streamlit app entry point.

Run with:  streamlit run compass/app/app.py
"""

import theme

theme.inject()

import streamlit as st  # noqa: E402

st.switch_page("pages/01_fleet_overview.py")
