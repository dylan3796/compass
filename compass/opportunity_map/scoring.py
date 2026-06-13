"""Rank agent candidates from an Opportunity Map assessment.

Input: a candidates JSON (see veritas_example.json for the shape, assessment.md
for how the fields are gathered). Output: candidates ranked by a weighted score
across ROI potential, technical feasibility, data readiness, and risk — with a
written rationale per dimension, because a number without a reason is a vibe.

Run:  python scoring.py [candidates.json]     (defaults to veritas_example.json)
"""

import json
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from core.cost_calculator import cost_per_run  # noqa: E402

WEIGHTS = {"roi": 0.40, "feasibility": 0.25, "data_readiness": 0.20, "risk": 0.15}

# Categorical inputs -> 0-100 subscores. Deliberately coarse: interview data
# doesn't support finer precision, and pretending otherwise erodes trust.
FEASIBILITY = {"low": 95, "medium": 65, "high": 35}        # integration_complexity
DATA_READINESS = {"clean": 95, "partial": 60, "scattered": 30}
RISK_SAFETY = {"high": 90, "medium": 60, "low": 25}        # error_tolerance (higher = safer)

# ROI blend: half "how many times does it pay for itself" (log-scaled ratio),
# half "does the absolute net value matter" (linear, saturating at $5k/mo).
ROI_RATIO_LOG_CAP = 2.5     # log10(ratio) at which the ratio component maxes out
ROI_NET_SATURATION = 5000.0


def projected_value_usd_mo(c: dict) -> float:
    return c["volume_per_month"] * (c["minutes_per_item"] / 60.0) * c["hourly_cost_usd"]


def projected_cost_usd_mo(c: dict) -> float:
    t = c["tokens_per_run"]
    return c["runs_per_month"] * cost_per_run(
        c["model_recommendation"], t["input"], t["output"])


def _roi_score(value: float, cost: float) -> float:
    if cost <= 0:
        return 0.0
    ratio = value / cost
    ratio_part = min(1.0, max(0.0, math.log10(max(ratio, 1.0)) / ROI_RATIO_LOG_CAP))
    net_part = min(1.0, max(0.0, (value - cost) / ROI_NET_SATURATION))
    return 50.0 * ratio_part + 50.0 * net_part


# Substrate note: a qualitative flag, NOT a weighted dimension (weights and
# scores are unchanged). Frequent, formulaic, clean-input, low-generative work
# is where deterministic code may beat an agent on cost — economics only, the
# owner decides the implementation, and Compass tracks the before/after either way.
CODIFY_MIN_VOLUME = 200


def _codify_flag(c: dict) -> tuple[bool, str]:
    t = c["tokens_per_run"]
    formulaic = c["error_tolerance"] in ("high", "medium")
    high_vol = c.get("volume_per_month", 0) >= CODIFY_MIN_VOLUME
    checkable = c["data_availability"] == "clean"
    low_gen = t["output"] <= 0.3 * t["input"]
    flag = formulaic and high_vol and checkable and low_gen
    return flag, (
        "formulaic, high-volume, clean-input, low-generative — deterministic logic "
        "may be cheaper than an agent; economics only, the owner decides the "
        "implementation and Compass tracks it either way" if flag
        else "fits an agent — too variable, low-volume, or generative to codify")


def score_candidate(c: dict) -> dict:
    value = projected_value_usd_mo(c)
    cost = projected_cost_usd_mo(c)
    scores = {
        "roi": _roi_score(value, cost),
        "feasibility": FEASIBILITY[c["integration_complexity"]],
        "data_readiness": DATA_READINESS[c["data_availability"]],
        "risk": RISK_SAFETY[c["error_tolerance"]],
    }
    total = sum(WEIGHTS[k] * v for k, v in scores.items())
    rationale = {
        "roi": (f"~${value:,.0f}/mo recovered ({c['value_basis']}) against "
                f"~${cost:,.0f}/mo run cost ({c['cost_basis']}) — "
                f"{value / cost:,.0f}x payback per dollar" if cost > 0 else "no run cost computed"),
        "feasibility": f"integration complexity: {c['integration_complexity']} — {c['trigger']}",
        "data_readiness": f"input data is {c['data_availability']} ({c['inputs']})",
        "risk": (f"error tolerance is {c['error_tolerance']}"
                 + ("" if c["error_tolerance"] != "low"
                    else " — wrong outputs are expensive; human review is mandatory")),
    }
    codify_candidate, substrate_note = _codify_flag(c)
    rationale["substrate"] = substrate_note
    return dict(
        c,
        projected_value_usd_mo=round(value, 2),
        projected_cost_usd_mo=round(cost, 2),
        scores={k: round(v, 1) for k, v in scores.items()},
        rationale=rationale,
        codify_candidate=codify_candidate,
        score=round(total, 1),
    )


def rank_candidates(candidates: list[dict]) -> list[dict]:
    return sorted((score_candidate(c) for c in candidates),
                  key=lambda c: c["score"], reverse=True)


def load_assessment(path: Path | str = HERE / "veritas_example.json") -> dict:
    return json.loads(Path(path).read_text())


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "veritas_example.json"
    data = load_assessment(path)
    ranked = rank_candidates(data["candidates"])
    print(f"Agent Opportunity Map — {data['company']} ({data['assessed_at']})\n")
    for i, c in enumerate(ranked, 1):
        s = c["scores"]
        print(f"#{i} {c['name']} — {c['score']}/100   "
              f"(roi {s['roi']} · feas {s['feasibility']} · data {s['data_readiness']} · risk {s['risk']})")
        print(f"   team: {c['team']} · model: {c['model_recommendation']}")
        print(f"   projected: ${c['projected_cost_usd_mo']:,.0f}/mo cost → "
              f"${c['projected_value_usd_mo']:,.0f}/mo value")
        print(f"   roi: {c['rationale']['roi']}")
        print(f"   data: {c['rationale']['data_readiness']}")
        print(f"   risk: {c['rationale']['risk']}")
        tag = "agent | CODE candidate" if c["codify_candidate"] else "agent"
        print(f"   substrate: {tag} — {c['rationale']['substrate']}\n")
    print("Every projection above becomes a baseline: when the work ships — as an "
          "agent or as code — Compass tracks it against this projection.")


if __name__ == "__main__":
    main()
