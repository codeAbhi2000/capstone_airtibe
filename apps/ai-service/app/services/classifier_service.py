"""
Reply Classifier Service

Calls the Anthropic API synchronously (from the caller's perspective) and
returns a structured classification result. No DB or queue access.

Timeout strategy:
  - Anthropic SDK timeout: settings.anthropic_timeout_seconds (8 s default)
  - The /classify route wraps this with asyncio.wait_for (10 s) as a belt-and-suspenders guard
"""
import json
import re
from typing import Literal

from pydantic import BaseModel, field_validator

from app.config.settings import get_settings
from app.lib.anthropic_client import anthropic_client
from app.lib.logger import get_logger
from app.prompts.classifier_prompt import get_classifier_prompt

logger = get_logger(__name__)
settings = get_settings()

Priority = Literal["high", "medium", "low"]


class ClassificationResult(BaseModel):
    needsReply: bool
    priority: Priority
    reason: str

    @field_validator("priority", mode="before")
    @classmethod
    def normalise_priority(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ("high", "medium", "low"):
            raise ValueError(f"Invalid priority '{v}'")
        return v


def _extract_json(text: str) -> dict:
    """
    Robustly extract a JSON object from the model response.
    Handles cases where the model wraps it in ```json fences.
    """
    # Strip markdown fences if present
    cleaned = re.sub(r"```(?:json)?|```", "", text).strip()

    # Find first { ... } block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in model response: {text!r}")

    return json.loads(match.group())


async def classify_email(
    subject: str,
    from_email: str,
    body: str,
    prompt_version: str | None = None,
) -> ClassificationResult:
    """
    Classify an inbound email. Returns ClassificationResult.
    Raises on Anthropic error or malformed response.
    """
    version = prompt_version or settings.prompt_version
    system_prompt, user_prompt = get_classifier_prompt(
        subject=subject,
        from_email=from_email,
        body=body,
        version=version,
    )

    logger.info(
        "classifier_request",
        from_email=from_email,
        subject=subject[:80],
        prompt_version=version,
    )

    response = await anthropic_client.messages.create(
        model=settings.anthropic_model,
        max_tokens=256,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw_text = response.content[0].text
    logger.debug("classifier_raw_response", raw=raw_text)

    parsed = _extract_json(raw_text)
    result = ClassificationResult(**parsed)

    logger.info(
        "classifier_result",
        needs_reply=result.needsReply,
        priority=result.priority,
        reason=result.reason,
        from_email=from_email,
    )

    return result
