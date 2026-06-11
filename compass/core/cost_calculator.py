"""Per-model cost normalization.

Prices are USD per 1M tokens. Claude prices match the current public
price sheet; OpenAI prices use the public list prices so cross-model
comparisons in the dashboard are apples-to-apples.
"""

MODEL_PRICING = {
    "claude-opus-4-8":   {"input": 5.00,  "output": 25.00},
    "claude-sonnet-4-6": {"input": 3.00,  "output": 15.00},
    "claude-haiku-4-5":  {"input": 1.00,  "output": 5.00},
    "gpt-4o":            {"input": 2.50,  "output": 10.00},
    "gpt-4o-mini":       {"input": 0.15,  "output": 0.60},
}

DEFAULT_PRICING = {"input": 3.00, "output": 15.00}

# Model family/tier metadata for right-sizing. Tier is capability rank within
# a family (higher = more capable, more expensive). Update alongside pricing.
MODEL_META = {
    "claude-opus-4-8":   {"family": "claude", "tier": 3, "label": "Opus 4.8"},
    "claude-sonnet-4-6": {"family": "claude", "tier": 2, "label": "Sonnet 4.6"},
    "claude-haiku-4-5":  {"family": "claude", "tier": 1, "label": "Haiku 4.5"},
    "gpt-4o":            {"family": "openai", "tier": 2, "label": "GPT-4o"},
    "gpt-4o-mini":       {"family": "openai", "tier": 1, "label": "GPT-4o mini"},
}

# Minimum adequate tier per task class, with the directional quality delta
# (in %) observed between the floor tier and the top tier on that task class.
# These deltas are benchmark-derived heuristics, NOT per-customer evals —
# every surface that uses them must say "directional" and recommend verifying
# on a sample before switching.
TASK_CLASS_FLOOR = {
    "research":          {"tier": 1, "delta_pct": 2},
    "classification":    {"tier": 1, "delta_pct": 1},
    "doc_summarization": {"tier": 1, "delta_pct": 3},
    "email_drafting":    {"tier": 2, "delta_pct": 5},
    "cold_outreach":     {"tier": 2, "delta_pct": 5},
    "support_replies":   {"tier": 2, "delta_pct": 4},
    "data_analysis":     {"tier": 2, "delta_pct": 4},
    "code_generation":   {"tier": 3, "delta_pct": 8},
}


def model_label(model: str) -> str:
    return MODEL_META.get(model, {}).get("label", model)


def cheaper_adequate_model(model: str, task_type: str) -> str | None:
    """Cheapest same-family model whose tier still clears the task-class floor.

    Returns None when the model is unknown, the task class has no floor, or
    the agent is already at (or below) the adequate tier.
    """
    meta = MODEL_META.get(model)
    floor = TASK_CLASS_FLOOR.get(task_type)
    if not meta or not floor or meta["tier"] <= floor["tier"]:
        return None
    candidates = [(m, mm) for m, mm in MODEL_META.items()
                  if mm["family"] == meta["family"]
                  and floor["tier"] <= mm["tier"] < meta["tier"]]
    if not candidates:
        return None
    return min(candidates, key=lambda kv: kv[1]["tier"])[0]


def estimate_right_size_savings(model: str, target: str, avg_input: float,
                                avg_output: float, runs_per_month: float) -> float:
    """Monthly savings from running the same token profile on a cheaper model."""
    delta = (cost_per_run(model, avg_input, avg_output)
             - cost_per_run(target, avg_input, avg_output))
    return max(0.0, delta * runs_per_month)


def pricing_for(model: str) -> dict:
    return MODEL_PRICING.get(model, DEFAULT_PRICING)


def cost_per_run(model: str, input_tokens: int, output_tokens: int) -> float:
    p = pricing_for(model)
    return (input_tokens * p["input"] + output_tokens * p["output"]) / 1_000_000


def cost_per_1k_output(model: str, input_tokens: int, output_tokens: int) -> float:
    """Normalized unit: dollars spent per 1k tokens of useful output.

    This is the cross-model comparison metric — an agent that burns 80k
    input tokens to produce 1k output tokens looks expensive here even
    on a cheap model.
    """
    if output_tokens <= 0:
        return 0.0
    return cost_per_run(model, input_tokens, output_tokens) / (output_tokens / 1000)


def estimate_trimmed_savings(model: str, avg_input: float, avg_output: float,
                             target_input: float, runs_per_month: float) -> float:
    """Monthly savings if avg input tokens were reduced to target_input."""
    if avg_input <= target_input:
        return 0.0
    p = pricing_for(model)
    per_run = (avg_input - target_input) * p["input"] / 1_000_000
    return per_run * runs_per_month
