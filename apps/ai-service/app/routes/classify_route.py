"""
POST /classify — synchronous reply classifier endpoint.

Flow:
  1. Validate request body
  2. asyncio.wait_for wraps the Anthropic call (client-side 10 s timeout)
  3. Return ClassificationResult JSON
  4. Never touches DB or queue
"""
import asyncio
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field

from app.config.settings import get_settings
from app.lib.logger import get_logger
from app.services.classifier_service import ClassificationResult, classify_email

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ClassifyRequest(BaseModel):
    subject: Annotated[str, Field(min_length=1, max_length=998)]
    fromEmail: Annotated[str, Field(description="Sender email address")]
    body: Annotated[str, Field(min_length=1, max_length=100_000)]

    model_config = {"json_schema_extra": {"example": {
        "subject": "Re: Q3 budget review",
        "fromEmail": "alice@example.com",
        "body": "Hi, can we jump on a call this week to finalize the numbers?",
    }}}


class ClassifyResponse(BaseModel):
    needsReply: bool
    priority: Literal["high", "medium", "low"]
    reason: str


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post(
    "/classify",
    response_model=ClassifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Classify whether an inbound email requires a reply",
    tags=["Classifier"],
)
async def classify(request: Request, body: ClassifyRequest) -> ClassifyResponse:
    """
    Synchronous reply classifier. Blocks up to `client_timeout_seconds` (default 10 s).

    Returns:
        needsReply: Whether the email warrants a human reply
        priority: high | medium | low
        reason: One-sentence explanation
    """
    try:
        result: ClassificationResult = await asyncio.wait_for(
            classify_email(
                subject=body.subject,
                from_email=body.fromEmail,
                body=body.body,
            ),
            timeout=settings.client_timeout_seconds,
        )
    except asyncio.TimeoutError:
        logger.warning(
            "classify_timeout",
            timeout=settings.client_timeout_seconds,
            from_email=body.fromEmail,
        )
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=f"Classifier timed out after {settings.client_timeout_seconds}s",
        )
    except ValueError as exc:
        logger.error("classify_parse_error", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unexpected response from AI model: {exc}",
        )
    except Exception as exc:
        logger.error("classify_unexpected_error", error=str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal classification error",
        )

    return ClassifyResponse(
        needsReply=result.needsReply,
        priority=result.priority,
        reason=result.reason,
    )
