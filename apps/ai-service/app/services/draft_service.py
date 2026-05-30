"""
Draft Generator Service

Generates an AI reply draft for an inbound email and persists it to the DB.
Called exclusively by the RabbitMQ consumer — never directly from HTTP.

If a UserStyle profile exists for the user it is injected into the prompt
so the generated draft matches the user's natural writing style.

styleProfile is a dict (Json column) — serialised to string only for prompt injection.
"""
import json

from prisma.models import EmailDraft, UserStyle

from app.config.settings import get_settings
from app.lib.anthropic_client import anthropic_client
from app.lib.logger import get_logger
from app.prompts.draft_prompt import get_draft_prompt
from app.utils.message_envelope import DraftMessageEnvelope
from app.utils.email_draft_repo import create_draft
from app.utils.user_style_repo import get_user_style
from app.lib.parse_json_response import parse_json_response

logger = get_logger(__name__)
settings = get_settings()


async def generate_and_persist_draft(
    envelope: DraftMessageEnvelope,
    prompt_version: str | None = None,
) -> EmailDraft:
    """
    1. Fetch user style profile (optional)
    2. Build versioned prompt (with style if available)
    3. Call Anthropic API
    4. Persist EmailDraft row (status: pending)
    5. Return the persisted row
    """
    version = prompt_version or settings.prompt_version

    style_row = await get_user_style(envelope.userId)
    style_profile_str: str | None = (
        json.dumps(style_row.styleProfile) if style_row else None
    )

    logger.info(
        "draft_generation_start",
        message_id=envelope.messageId,
        user_id=envelope.userId,
        priority=envelope.priority,
        prompt_version=version,
        has_style_profile=style_profile_str is not None,
    )

    system_prompt, user_prompt = get_draft_prompt(
        subject=envelope.subject,
        from_email=envelope.fromEmail,
        body=envelope.body,
        priority=envelope.priority,
        style_profile=style_profile_str,
        version=version,
    )

    response = await anthropic_client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    ai_draft = response.content[0].text.strip()
    cleaned_response = parse_json_response(ai_draft)  # reuse ai_draft, not response.content again
    draft = cleaned_response.get("draft", ai_draft)
    chips = cleaned_response.get("chips", [])

    print("AI draft generated", { "draft": draft, "chips": chips })

    logger.info(
        "draft_generation_complete",
        message_id=envelope.messageId,
        draft_length=len(draft),
        user_id=envelope.userId,
        has_chips=bool(chips),
    )

    return await create_draft(
        user_id=envelope.userId,
        message_id=envelope.messageId,
        thread_id=envelope.threadId,
        subject=envelope.subject,
        from_email=envelope.fromEmail,
        ai_draft=draft,
        prompt_version=version,
        priority=envelope.priority,
        chips=chips,
    )
