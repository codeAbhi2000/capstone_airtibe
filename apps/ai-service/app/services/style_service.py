"""
Writing Style Analysis Service

Accepts a list of sent emails, calls Anthropic to produce a style profile,
and upserts the result into the user_styles table.

styleProfile is stored as Json (dict) — no serialisation step needed.
"""
import json
import re

from prisma.models import UserStyle

from app.config.settings import get_settings
from app.lib.anthropic_client import anthropic_client
from app.lib.logger import get_logger
from app.prompts.style_prompt import get_style_prompt
from app.utils.user_style_repo import upsert_user_style

logger = get_logger(__name__)
settings = get_settings()


def _extract_json(text: str) -> dict:
    """Strip markdown fences and extract the first JSON object."""
    cleaned = re.sub(r"```(?:json)?|```", "", text).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in model response: {text!r}")
    return json.loads(match.group())


async def analyse_and_persist_style(
    user_id: str,
    emails: list[dict],
    prompt_version: str | None = None,
) -> dict:
    """
    1. Build versioned prompt from the sent emails
    2. Call Anthropic to extract a style profile (returned as dict)
    3. Upsert UserStyle row
    4. Return the persisted row
    """
    version = prompt_version or settings.prompt_version

    system_prompt, user_prompt = get_style_prompt(
        emails=emails,
        version=version,
    )

    logger.info(
        "style_analysis_start",
        user_id=user_id,
        email_count=len(emails),
        prompt_version=version,
    )

    response = await anthropic_client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw_text = response.content[0].text
    logger.debug("style_analysis_raw_response", raw=raw_text[:500])

    # Parse and validate — stored directly as Json dict
    style_dict = _extract_json(raw_text)

    logger.info(
        "style_analysis_complete",
        user_id=user_id,
        tone=style_dict.get("tone"),
        formality=style_dict.get("formality"),
    )

    logger.debug("style_analysis_parsed", style_dict=style_dict, type=type(style_dict).__name__)

    return {
        "user_id": user_id,        
        "style_profile": style_dict,
        "email_count": len(emails),
        "prompt_version": version,
    }
