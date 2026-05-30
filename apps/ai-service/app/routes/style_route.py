"""
POST /analyse-style

Accepts up to 30 sent emails, runs AI writing style analysis,
upserts a UserStyle row, and returns the parsed style profile.
"""
import asyncio
from typing import Annotated

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.config.settings import get_settings
from app.lib.logger import get_logger
from app.services.style_service import analyse_and_persist_style

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()

MAX_EMAILS = 30
MIN_EMAILS = 1


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SentEmail(BaseModel):
    subject: Annotated[str, Field(default="", max_length=998)]
    toEmail: Annotated[str, Field(description="Recipient address")]
    body: Annotated[str, Field(min_length=0, max_length=50_000)]


class AnalyseStyleRequest(BaseModel):
    userId: Annotated[str, Field(description="Owner user ID")]
    emails: Annotated[
        list[SentEmail],
        Field(min_length=MIN_EMAILS, max_length=MAX_EMAILS),
    ]

    @field_validator("emails")
    @classmethod
    def emails_not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("emails list must not be empty")
        return v

    model_config = {"json_schema_extra": {"example": {
        "userId": "usr_01j",
        "emails": [
            {
                "subject": "Re: Project update",
                "toEmail": "bob@example.com",
                "body": "Hi Bob, thanks for the update — looks good to me. Let's sync Thursday.",
            }
        ],
    }}}


class StyleProfileResponse(BaseModel):
    userId: str
    emailCount: int
    promptVersion: str
    styleProfile: dict   # Json column — already a dict from Prisma
    updatedAt: str


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post(
    "/analyse-style",
    response_model=StyleProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyse sent emails to build a writing style profile",
    tags=["Style"],
)
async def analyse_style(body: AnalyseStyleRequest) -> StyleProfileResponse:
    """
    Accepts 1–30 sent emails and returns a writing style profile.
    The profile is persisted and automatically used when generating
    or rewriting drafts for this user.
    """
    emails_as_dicts = [e.model_dump() for e in body.emails]

    try:
        style_row = await asyncio.wait_for(
            analyse_and_persist_style(
                user_id=body.userId,
                emails=emails_as_dicts,
            ),
            timeout=settings.client_timeout_seconds * 2,
        )
    except asyncio.TimeoutError:
        logger.warning("analyse_style_timeout", user_id=body.userId)
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Style analysis timed out — try with fewer emails",
        )
    except ValueError as exc:
        logger.error("analyse_style_parse_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unexpected response from AI model: {exc}",
        )
    except Exception as exc:
        logger.error("analyse_style_error", error=str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal style analysis error",
        )

    return StyleProfileResponse(
        userId=style_row.userId,
        emailCount=style_row.emailCount,
        promptVersion=style_row.promptVersion,
        styleProfile=style_row.styleProfile,   # dict directly from Json column
        updatedAt=style_row.updatedAt.isoformat(),
    )
