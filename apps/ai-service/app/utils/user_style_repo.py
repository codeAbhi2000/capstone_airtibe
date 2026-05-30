"""
UserStyle repository — DB access for writing style profiles.
One profile per user, upserted on each /analyse-style call.

styleProfile is stored as Json (prisma-client-py returns it as a dict).
"""
from prisma.models import UserStyle
import json

from app.lib.logger import get_logger
from app.lib.prisma_client import prisma_client

logger = get_logger(__name__)


async def upsert_user_style(
    *,
    user_id: str,
    style_profile: dict,   # stored as Json column
    email_count: int,
    prompt_version: str,
) -> UserStyle:
    """Insert or fully replace the style profile for a user."""
    style = await prisma_client.userstyle.upsert(
        where={"userId": user_id},
        data={
        "create": {
            "user": {"connect": {"id": user_id}},  # ✅ relation connect
            "styleProfile": json.dumps(style_profile), # ✅ serialized JSON
            "emailCount": email_count,
            "promptVersion": prompt_version,
        },
        "update": {
            "styleProfile": json.dumps(style_profile), # ✅ serialized JSON
            "emailCount": email_count,
            "promptVersion": prompt_version,
        }
    }
    )

    logger.info(
        "user_style_upserted",
        user_id=user_id,
        email_count=email_count,
        prompt_version=prompt_version,
    )
    return style


async def get_user_style(user_id: str) -> UserStyle | None:
    """Return the persisted style profile for a user, or None if not yet analysed."""
    return await prisma_client.userstyle.find_unique(
        where={"userId": user_id}
    )
