"""
EmailDraft repository — all Prisma interactions live here.
Keeps service layer free of ORM details.

Uses proper DraftStatus / Priority enums from the generated client.
"""
import json

from prisma.models import EmailDraft

from app.lib.logger import get_logger
from app.lib.prisma_client import prisma_client

logger = get_logger(__name__)


async def create_draft(
    *,
    user_id: str,
    message_id: str,
    thread_id: str,
    subject: str | None,
    from_email: str | None,
    ai_draft: str,
    prompt_version: str,
    priority: str,
    chips: list[str] | None = None,
) -> EmailDraft:
    """
    Insert a new EmailDraft row with status='pending'.
    Raises prisma.errors.UniqueViolationError if messageId already exists.
    """
    draft = await prisma_client.emaildraft.create(
        data={
            "userId": user_id,
            "messageId": message_id,
            "threadId": thread_id,
            "subject": subject,
            "fromEmail": from_email,
            "aiDraft": ai_draft,
            "promptVersion": prompt_version,
            "priority": priority,
            "status": "pending",
            "suggestedEdits": json.dumps(chips or []),
        }
    )

    await prisma_client.user.update({
        "where": {"id": user_id},
        "data": {"draftsUsedMonth": {"increment": 1}},
    })

    logger.info(
        "draft_persisted",
        draft_id=draft.id,
        message_id=message_id,
        priority=priority,
        prompt_version=prompt_version,
    )

    return draft


async def get_draft_by_message_id(message_id: str) -> EmailDraft | None:
    return await prisma_client.emaildraft.find_first(
        where={"messageId": message_id}
    )


async def update_draft_status(draft_id: str, status: str) -> EmailDraft:
    return await prisma_client.emaildraft.update(
        where={"id": draft_id},
        data={"status": status},
    )
