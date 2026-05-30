"""
Draft Rewrite Service

Takes an existing EmailDraft, applies the user's instruction (and style profile
if available), regenerates the draft text, updates the DB row, and returns it.

styleProfile is a dict (Json column) — serialised to string only when injected
into the prompt.
"""
import json

from prisma.models import EmailDraft

from app.config.settings import get_settings
from app.lib.anthropic_client import anthropic_client
from app.lib.logger import get_logger
from app.lib.prisma_client import prisma_client
from app.prompts.rewrite_prompt import get_rewrite_prompt
from app.utils.user_style_repo import get_user_style

logger = get_logger(__name__)
settings = get_settings()


async def rewrite_draft(
    draft: EmailDraft,
    instruction: str,
    prompt_version: str | None = None,
) -> EmailDraft:
    """
    1. Fetch the user's style profile (if persisted)
    2. Build a versioned rewrite prompt
    3. Call Anthropic
    4. Update the EmailDraft row: new aiDraft, incremented rewriteCount, promptVersion
    5. Return updated row
    """
    version = prompt_version or settings.prompt_version

    style_row = await get_user_style(draft.userId)
    # Serialise dict → compact JSON string for prompt injection
    style_profile_str: str | None = (
        json.dumps(style_row.styleProfile) if style_row else None
    )

    if style_profile_str:
        logger.info("rewrite_style_profile_found", user_id=draft.userId)
    else:
        logger.info("rewrite_no_style_profile", user_id=draft.userId)

    system_prompt, user_prompt = get_rewrite_prompt(
        current_draft=draft.aiDraft or "",
        instruction=instruction,
        style_profile=style_profile_str,
        subject=draft.subject or "",
        from_email=draft.fromEmail or "",
        version=version,
    )

    logger.info(
        "rewrite_start",
        draft_id=draft.id,
        message_id=draft.messageId,
        rewrite_count=draft.rewriteCount,
        instruction=instruction[:120],
        prompt_version=version,
    )

    response = await anthropic_client.messages.create(
        model=settings.anthropic_model,
        max_tokens=1024,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    new_draft_text = response.content[0].text.strip()

    updated = await prisma_client.emaildraft.update(
        where={"id": draft.id},
        data={
            "aiDraft": new_draft_text,
            "promptVersion": version,
            "rewriteCount": {"increment": 1},
            "status": "pending",
        },
    )

    logger.info(
        "rewrite_complete",
        draft_id=draft.id,
        rewrite_count=updated.rewriteCount,
    )

    return updated
