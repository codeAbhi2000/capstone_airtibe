"""
Draft routes:
- POST /draft/generate — synchronously generate a draft reply
- POST /drafts/{draft_id}/rewrite — rewrite an existing draft
"""
import asyncio
import json
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel, Field

from app.config.settings import get_settings
from app.lib.logger import get_logger
from app.lib.prisma_client import prisma_client
from app.lib.anthropic_client import anthropic_client
from app.services.draft_service import generate_and_persist_draft
from app.services.rewrite_service import rewrite_draft
from app.prompts.draft_prompt import get_draft_prompt
from app.utils.message_envelope import DraftMessageEnvelope
from app.utils.user_style_repo import get_user_style

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class DraftGenerateRequest(BaseModel):
    userId: Annotated[str, Field(description="User ID")]
    emailSubject: Annotated[str, Field(max_length=998, description="Email subject")]
    emailBody: Annotated[str, Field(min_length=1, max_length=100_000, description="Email body")]
    senderName: Annotated[str, Field(description="Sender name or email")]
    tone: Annotated[str, Field(default="friendly", description="Desired tone: friendly, formal, concise")]
    instruction: Annotated[str | None, Field(default=None, description="Optional user instruction")]

    model_config = {"json_schema_extra": {"example": {
        "userId": "usr_01j",
        "emailSubject": "Re: Q3 budget review",
        "emailBody": "Hi, can we jump on a call this week to finalize the numbers?",
        "senderName": "alice@example.com",
        "tone": "friendly",
        "instruction": None,
    }}}


class DraftGenerateResponse(BaseModel):
    draftText: str


class RewriteRequest(BaseModel):
    instruction: Annotated[
        str,
        Field(
            min_length=1,
            max_length=1_000,
            description=(
                "Natural language edit instruction. "
                "E.g. 'make it shorter', 'be more formal', 'add an apology for the delay'"
            ),
        ),
    ]

    model_config = {"json_schema_extra": {"example": {
        "instruction": "Make the tone more formal and shorten to 3 sentences",
    }}}


class RewriteResponse(BaseModel):
    id: str
    messageId: str
    userId: str
    subject: str
    fromEmail: str
    aiDraft: str
    priority: str
    status: str
    rewriteCount: int
    promptVersion: str
    updatedAt: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post(
    "/draft/generate",
    response_model=DraftGenerateResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a draft email reply",
    tags=["Drafts"],
)
async def generate_draft(body: DraftGenerateRequest) -> DraftGenerateResponse:
    """
    Synchronously generates an AI draft reply for an incoming email.

    - Fetches the user's writing style profile if available
    - Calls Anthropic to generate a contextual reply
    - Optionally applies the user's tone and instruction preferences
    - Returns the draft text (does not persist to DB)
    """
    logger.info(
        "draft_generate_request",
        user_id=body.userId,
        tone=body.tone,
    )

    try:
        # Fetch user style profile if it exists
        style_row = await get_user_style(body.userId)
        style_profile_str: str | None = (
            json.dumps(style_row.styleProfile) if style_row else None
        )

        # Build versioned prompt
        system_prompt, user_prompt = get_draft_prompt(
            subject=body.emailSubject,
            from_email=body.senderName,
            body=body.emailBody,
            priority="medium",
            style_profile=style_profile_str,
            version=settings.prompt_version,
        )

        # Call Anthropic with timeout
        response = await asyncio.wait_for(
            anthropic_client.messages.create(
                model=settings.anthropic_model,
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            ),
            timeout=settings.client_timeout_seconds,
        )

        draft_text = response.content[0].text.strip()

        logger.info(
            "draft_generate_complete",
            user_id=body.userId,
            draft_length=len(draft_text),
        )

        return DraftGenerateResponse(draftText=draft_text)

    except asyncio.TimeoutError:
        logger.warning("draft_generate_timeout", user_id=body.userId)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Draft generation timed out after {settings.client_timeout_seconds}s",
        )
    except ValueError as exc:
        logger.error("draft_generate_parse_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unexpected response from AI model: {exc}",
        )
    except Exception as exc:
        logger.error("draft_generate_error", error=str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate draft",
        )


@router.post(
    "/drafts/{draft_id}/rewrite",
    response_model=RewriteResponse,
    status_code=status.HTTP_200_OK,
    summary="Rewrite or modify an existing email draft",
    tags=["Drafts"],
)
async def rewrite(
    draft_id: Annotated[str, Path(description="EmailDraft.id (cuid)")],
    body: RewriteRequest,
) -> RewriteResponse:
    """
    Applies a natural language instruction to an existing draft.

    - Pulls the user's writing style profile if one exists
    - Regenerates the draft via Anthropic
    - Updates `aiDraft`, `rewriteCount`, `promptVersion` in DB
    - Resets `status` to `pending`
    """
    # Fetch existing draft
    draft = await prisma_client.emaildraft.find_unique(
        where={"id": draft_id}
    )
    if draft is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Draft '{draft_id}' not found",
        )

    logger.info(
        "rewrite_request",
        draft_id=draft_id,
        user_id=draft.userId,
        instruction=body.instruction[:120],
    )

    try:
        updated = await asyncio.wait_for(
            rewrite_draft(draft=draft, instruction=body.instruction),
            timeout=settings.client_timeout_seconds,
        )
    except asyncio.TimeoutError:
        logger.warning("rewrite_timeout", draft_id=draft_id)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Rewrite timed out after {settings.client_timeout_seconds}s",
        )
    except ValueError as exc:
        logger.error("rewrite_parse_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unexpected response from AI model: {exc}",
        )
    except Exception as exc:
        logger.error("rewrite_error", error=str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal rewrite error",
        )

    return RewriteResponse(
        id=updated.id,
        messageId=updated.messageId,
        userId=updated.userId,
        subject=updated.subject,
        fromEmail=updated.fromEmail,
        aiDraft=updated.aiDraft,
        priority=updated.priority,
        status=updated.status,
        rewriteCount=updated.rewriteCount,
        promptVersion=updated.promptVersion,
        updatedAt=updated.updatedAt.isoformat(),
    )
