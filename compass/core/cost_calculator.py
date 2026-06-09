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
