"""Generate the Veritas AI dummy dataset: 8 agents, 90 days of run history.

Writes dummy_agents.json next to this file. Deterministic (seeded), but
anchored to the current date so charts always look fresh.

Key story patterns baked in:
- Summarizer (Agent 4) reads ~80k-token docs on an Opus-tier model
  -> dominates fleet spend, fires the 'trim_context' recommendation (~$89/mo).
- Outbound (Agent 5) quality falls off a cliff 3 weeks ago, right after a
  prompt change recorded in its version history -> 'prompt_regression'.
- Support (Agent 7) completes only ~34% of tasks and shows loop bursts
  -> 'add_guardrail' (most urgent) + 'rate_limit'.
- Drafter (Agent 2) is the fleet's best prompt -> 'clone_best_performer'
  recommendation pointing Coder (Agent 6) at it.
- Coder (Agent 6) latency ~3x peers (bloated system prompt).
- Analyst (Agent 8) only has ~15 days of history -> shows as NEW.
"""

import json
import random
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from core.cost_calculator import cost_per_run  # noqa: E402

DAYS = 90
RNG = random.Random(42)

PROMPTS = {
    "ag_scout": """You are Scout, a research agent for Veritas AI.

## Task
Given a company name or topic, return a concise research brief.

## Input
- `query`: the company/topic
- `focus`: optional angle (funding, hiring, product)

## Output (strict)
3-5 bullet points, each with a source URL. No preamble.""",

    "ag_drafter": """You are Drafter, Veritas AI's email drafting agent.

## Task
Draft one email from the structured brief below. Nothing else.

## Input (structured — never raw threads)
- `recipient`: name, role, company
- `goal`: one sentence
- `context`: max 3 bullet points
- `tone`: formal | friendly | direct

## Rules
1. Subject line under 8 words.
2. Body under 120 words.
3. One clear call to action.
4. No buzzwords ("synergy", "circle back", "touch base").

## Output (strict)
Subject: <line>
Body: <text>""",

    "ag_classifier": """You are Classifier. Categorize the inbound record.

Categories: billing | technical | sales | churn_risk | spam
Output exactly one category token. No explanation.""",

    "ag_summarizer": """You are Summarizer for Veritas AI.

Read the attached document in full and produce a summary.

The document is provided below in its entirety. Read every section
carefully, including appendices, footnotes, and revision history,
to make sure nothing is missed.

[FULL DOCUMENT PASTED HERE — typically 60k-100k tokens]

Summarize the document in 5-10 bullet points.""",

    "ag_outbound": """You are Outbound, the cold outreach writer.

Write a personalized cold email. Keep it punchy!! Short!! Make every
line POP. Use pattern interrupts. Open with a hook they can't ignore.
Be bold, be different, channel energy. Don't be afraid to use humor,
emojis sparingly, or a spicy take. ALWAYS create urgency.

(prev: structured brief format — replaced 3 weeks ago to "increase reply rates")""",

    "ag_coder": """You are Coder, the code generation agent for Veritas AI's internal tooling.

Before writing any code you must consider the following engineering guidelines,
style guides, and historical context, all of which are included below in full:
- The complete Veritas AI engineering handbook (chapters 1-14)
- The full style guide for Python, TypeScript, and SQL
- The architectural decision records for the last 18 months
- A list of every internal library with full API documentation

[~22k tokens of pasted handbook/context follows]

Think very carefully and at great length about all of the above before
responding. Re-read the guidelines twice. Then write the code.""",

    "ag_support": """You are Support, drafting replies to customer tickets.

Draft a reply. If you are not sure the reply fully resolves the ticket,
review your reply against the ticket and revise it. Repeat until the
reply fully resolves the ticket.""",

    "ag_analyst": """You are Analyst, Veritas AI's data analysis agent.

## Task
Answer one analytical question against the provided dataset extract.

## Input (structured)
- `question`: one sentence
- `data`: CSV extract, max 200 rows
- `format`: table | narrative | both

## Rules
1. State the answer first, method second.
2. Show the numbers — no vague claims.
3. Flag data-quality caveats explicitly.""",
}

AGENTS = [
    # id, name, type, model, program, runs/day, in μ/σ, out μ/σ, latency μ/σ, quality μ/σ, completion
    dict(id="ag_scout", name="Scout", type="research", model="claude-haiku-4-5",
         program="Market Intel", rpd=3, inp=(900, 200), out=(420, 100),
         lat=(1400, 300), q=(0.89, 0.04), comp=0.97, start_day=0),
    dict(id="ag_drafter", name="Drafter", type="email_drafting", model="claude-sonnet-4-6",
         program="Sales Pipeline", rpd=2, inp=(1500, 300), out=(700, 150),
         lat=(2600, 500), q=(0.94, 0.025), comp=0.97, start_day=0),
    dict(id="ag_classifier", name="Classifier", type="classification", model="gpt-4o-mini",
         program="Inbound Ops", rpd=5, inp=(450, 80), out=(60, 15),
         lat=(800, 150), q=(0.91, 0.03), comp=0.985, start_day=0),
    dict(id="ag_summarizer", name="Summarizer", type="doc_summarization", model="claude-opus-4-8",
         program="Knowledge Base", rpd=7, inp=(86000, 9000), out=(950, 200),
         lat=(9500, 1500), q=(0.86, 0.05), comp=0.93, start_day=0),
    dict(id="ag_outbound", name="Outbound", type="cold_outreach", model="claude-sonnet-4-6",
         program="Sales Pipeline", rpd=2, inp=(2600, 400), out=(900, 200),
         lat=(3000, 600), q=(0.87, 0.035), comp=0.95, start_day=0),
    dict(id="ag_coder", name="Coder", type="code_generation", model="claude-sonnet-4-6",
         program="Internal Tooling", rpd=3, inp=(24000, 5000), out=(3500, 800),
         lat=(11000, 2500), q=(0.71, 0.06), comp=0.90, start_day=0),
    dict(id="ag_support", name="Support", type="support_replies", model="gpt-4o",
         program="Customer Success", rpd=6, inp=(6000, 1500), out=(1300, 400),
         lat=(5200, 1800), q=(0.62, 0.06), comp=0.37, start_day=0),
    dict(id="ag_analyst", name="Analyst", type="data_analysis", model="claude-opus-4-8",
         program="Revenue Ops", rpd=2, inp=(4500, 800), out=(1500, 300),
         lat=(6000, 1000), q=(0.92, 0.02), comp=0.97, start_day=75),
]

# Value assurance: per-run value estimates and (where an agent was specced
# against a projection) the promised numbers Compass measures against.
# Story beats: Drafter beats its projection, Support badly misses it
# (completion 37% vs the ~85% the spec assumed), Summarizer blows through
# its projected cost on an over-provisioned model. Scout/Coder have no
# honest unit-value model -> NULL, shown as "—" everywhere.
VALUE_MODEL = {
    "ag_drafter": dict(
        unit_value_usd=20.0, value_basis="drafted email ≈ 30 min of SDR time @ $40/hr",
        projected_cost_usd_mo=1.00, projected_value_usd_mo=800.0,
        projection_source="Opportunity Map — Email Drafter spec (Nov 2025)"),
    "ag_support": dict(
        unit_value_usd=24.0, value_basis="deflected ticket @ ~$24 loaded handling cost",
        projected_cost_usd_mo=6.00, projected_value_usd_mo=4000.0,
        projection_source="Opportunity Map — Support Triage spec (Jan 2026)"),
    "ag_summarizer": dict(
        unit_value_usd=2.20, value_basis="summary ≈ 3 min of reader skim time @ $45/hr",
        projected_cost_usd_mo=30.00, projected_value_usd_mo=500.0,
        projection_source="Knowledge Base program plan (Q4 2025)"),
    "ag_classifier": dict(
        unit_value_usd=3.00, value_basis="4 min of manual triage @ $45/hr"),
    "ag_outbound": dict(
        unit_value_usd=8.00, value_basis="cold email ≈ 12 min of SDR time @ $40/hr"),
    "ag_analyst": dict(
        unit_value_usd=15.50, value_basis="analysis answer ≈ 20 min of analyst time @ $46/hr"),
}

REGRESSION_DAY = DAYS - 21          # Outbound prompt change, 3 weeks ago
SUPPORT_LOOP_DAYS = {30, 55, 78}    # days with a runaway loop burst
SUMMARIZER_SPIKE_DAYS = {38, 71}    # 150k-token monster docs (cost anomalies)


def gauss(rng, mu_sigma, lo=1):
    mu, sigma = mu_sigma
    return max(lo, rng.gauss(mu, sigma))


def generate_runs(now: datetime):
    runs = []
    for a in AGENTS:
        rng = random.Random(a["id"])
        for day in range(a["start_day"], DAYS):
            date = now - timedelta(days=DAYS - 1 - day)
            n = max(0, round(rng.gauss(a["rpd"], a["rpd"] * 0.35)))
            burst = a["id"] == "ag_support" and day in SUPPORT_LOOP_DAYS
            times = sorted(rng.uniform(8.0, 19.0) for _ in range(n))
            if burst:
                # stuck-in-a-loop burst: 12 extra runs packed into one hour
                t0 = rng.uniform(9.0, 16.0)
                times += sorted(t0 + rng.uniform(0, 1.0) for _ in range(12))

            for t in times:
                inp = gauss(rng, a["inp"])
                out = gauss(rng, a["out"])
                lat = gauss(rng, a["lat"], lo=200)
                quality = gauss(rng, a["q"], lo=0.05)
                completed = rng.random() < a["comp"]
                note = None

                if a["id"] == "ag_outbound" and day >= REGRESSION_DAY:
                    quality = max(0.1, rng.gauss(0.53, 0.06))
                    completed = rng.random() < 0.88
                if a["id"] == "ag_summarizer" and day in SUMMARIZER_SPIKE_DAYS:
                    inp = rng.gauss(152000, 8000)
                    note = "Oversized document (anomaly)"
                if a["id"] == "ag_support":
                    # quality degrades with longer tickets -> restructure_input signal
                    z = (inp - a["inp"][0]) / a["inp"][1]
                    quality = max(0.1, min(1.0, rng.gauss(0.62 - 0.09 * z, 0.05)))
                    if burst:
                        completed = False
                        note = "Loop detected: no progress after 3 revisions"

                quality = round(min(1.0, quality), 3)
                inp, out, lat = int(inp), int(out), int(lat)
                run_at = date.replace(hour=int(t) % 24, minute=int((t % 1) * 60),
                                      second=rng.randint(0, 59), microsecond=0)
                runs.append(dict(
                    id="run_" + uuid.uuid4().hex[:12],
                    agent_id=a["id"],
                    run_at=run_at.isoformat(),
                    input_tokens=inp,
                    output_tokens=out,
                    total_cost_usd=round(cost_per_run(a["model"], inp, out), 6),
                    latency_ms=lat,
                    task_completed=bool(completed),
                    output_quality_score=quality,
                    notes=note,
                ))
    runs.sort(key=lambda r: r["run_at"])
    return runs


def generate_versions(now: datetime):
    versions = []
    for a in AGENTS:
        created = now - timedelta(days=170 + RNG.randint(0, 40))
        if a["id"] == "ag_analyst":
            created = now - timedelta(days=DAYS - a["start_day"])
        v1 = dict(
            id=f"ver_{a['id']}_1", agent_id=a["id"], parent_version_id=None,
            label="v1", prompt_snapshot=PROMPTS[a["id"]],
            config_snapshot=json.dumps({"model": a["model"], "max_tokens": 8192}),
            created_at=created.isoformat(), created_by="dylan@veritas.ai",
        )
        versions.append(v1)

    # Outbound v2 — the regression-causing prompt change, 3 weeks ago
    change_at = now - timedelta(days=DAYS - 1 - REGRESSION_DAY, hours=3)
    versions.append(dict(
        id="ver_ag_outbound_2", agent_id="ag_outbound",
        parent_version_id="ver_ag_outbound_1", label="v2 — 'punchy' rewrite",
        prompt_snapshot=PROMPTS["ag_outbound"],
        config_snapshot=json.dumps({"model": "claude-sonnet-4-6", "max_tokens": 8192}),
        created_at=change_at.isoformat(), created_by="dylan@veritas.ai",
    ))
    # Original Outbound v1 had the structured-brief prompt
    for v in versions:
        if v["id"] == "ver_ag_outbound_1":
            v["prompt_snapshot"] = """You are Outbound, the cold outreach writer.

## Input (structured)
- `recipient`: name, role, company
- `hook`: one researched fact about them
- `offer`: one sentence

## Rules
1. Under 90 words.
2. Lead with the researched hook, not with us.
3. One question as the call to action.
4. Plain language — no hype, no exclamation marks."""
    return versions


def generate_guardrails(now: datetime):
    def ts(days_ago):
        return (now - timedelta(days=days_ago)).isoformat()
    return [
        dict(id="gr_1", agent_id="ag_scout", name="Hourly rate cap", type="rate_limit",
             config=json.dumps({"max_runs_per_hour": 60}), active=True,
             last_triggered=ts(41), last_triggered_note="Burst of 63 lookups during list import",
             created_at=ts(150)),
        dict(id="gr_2", agent_id="ag_drafter", name="Token ceiling", type="max_tokens",
             config=json.dumps({"max_input_tokens": 4000, "max_output_tokens": 1500}), active=True,
             last_triggered=None, last_triggered_note=None, created_at=ts(140)),
        dict(id="gr_3", agent_id="ag_classifier", name="Category validator", type="output_validator",
             config=json.dumps({"pattern": "^(billing|technical|sales|churn_risk|spam)$"}), active=True,
             last_triggered=ts(6), last_triggered_note="Output 'other' rejected; rerun passed",
             created_at=ts(155)),
    ]


def main():
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    runs = generate_runs(now)
    last_run = {}
    for r in runs:
        last_run[r["agent_id"]] = max(last_run.get(r["agent_id"], r["run_at"]), r["run_at"])

    agents = []
    for a in AGENTS:
        created = now - timedelta(days=(DAYS - a["start_day"]) + (0 if a["start_day"] else 90))
        value = VALUE_MODEL.get(a["id"], {})
        agents.append(dict(
            id=a["id"], name=a["name"], type=a["type"], model=a["model"],
            program=a["program"], status="healthy",  # recomputed by agent_scorer at load
            created_at=created.isoformat(), last_run=last_run.get(a["id"]),
            projected_cost_usd_mo=value.get("projected_cost_usd_mo"),
            projected_value_usd_mo=value.get("projected_value_usd_mo"),
            projection_source=value.get("projection_source"),
            unit_value_usd=value.get("unit_value_usd"),
            value_basis=value.get("value_basis"),
        ))

    data = dict(
        company="Veritas AI",
        generated_at=now.isoformat(),
        agents=agents,
        runs=runs,
        guardrails=generate_guardrails(now),
        versions=generate_versions(now),
    )
    out = HERE / "dummy_agents.json"
    out.write_text(json.dumps(data, indent=1))
    spend = sum(r["total_cost_usd"] for r in runs
                if r["run_at"] >= (now - timedelta(days=30)).isoformat())
    print(f"Wrote {out.name}: {len(runs)} runs, {len(agents)} agents, "
          f"30-day spend ${spend:.2f}")


if __name__ == "__main__":
    main()
