"""
Logs OpenAI API usage (tokens + cost) to the ai_usage_log table.
Call log_ai_usage() after every successful client.chat.completions.create() call.
Never raises — logging failure must never break the calling feature.
"""
from app.database import SessionLocal
from app.models import AIUsageLog

# Prices per token (USD) — gpt-4o-mini as of 2025
_RATES = {
    "gpt-4o-mini": {"input": 0.150 / 1_000_000, "output": 0.600 / 1_000_000},
    "gpt-4o":      {"input": 2.500 / 1_000_000, "output": 10.00 / 1_000_000},
}


def log_ai_usage(usage, feature: str, model: str = "gpt-4o-mini", user_id: int = None):
    """
    Persist one row to ai_usage_log.

    Args:
        usage:    response.usage object from OpenAI (has .prompt_tokens / .completion_tokens)
        feature:  string key identifying the product feature
        model:    model name used
        user_id:  optional FK to users table
    """
    try:
        rates = _RATES.get(model, _RATES["gpt-4o-mini"])
        cost = (usage.prompt_tokens * rates["input"]) + (usage.completion_tokens * rates["output"])

        db = SessionLocal()
        try:
            db.add(AIUsageLog(
                feature=feature,
                model=model,
                tokens_in=usage.prompt_tokens,
                tokens_out=usage.completion_tokens,
                cost_usd=round(cost, 8),
                user_id=user_id,
            ))
            db.commit()
        finally:
            db.close()
    except Exception:
        pass  # Never let logging break the main feature
