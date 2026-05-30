"""
Shared message envelope — published by the IO service, consumed by draft.consumer.
`body` (the raw email text) is intentionally NOT persisted to the DB.
"""
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field


class DraftMessageEnvelope(BaseModel):
    # DB keys
    userId: Annotated[str, Field(description="Owner user ID")]
    messageId: Annotated[str, Field(description="Unique email message ID")]
    threadId: Annotated[str, Field(description="Email thread ID")]

    # Metadata
    subject: Annotated[str, Field(description="Email subject line")]
    fromEmail: Annotated[str, Field(description="Sender email address")]

    # Payload — not persisted
    body: Annotated[str, Field(description="Raw email body text (not saved to DB)")]

    # Timing
    sentAt: Annotated[datetime, Field(description="ISO 8601 timestamp of original send")]

    # Optional: classifier output forwarded for context
    priority: Annotated[
        str,
        Field(default="medium", description="Priority from classifier: high|medium|low"),
    ]

    model_config = {"json_schema_extra": {"example": {
        "userId": "usr_01j",
        "messageId": "msg_abc123",
        "threadId": "thr_xyz",
        "subject": "Q3 budget review",
        "fromEmail": "alice@example.com",
        "body": "Hi, can we schedule a call to go over the numbers?",
        "sentAt": "2025-09-01T10:00:00Z",
        "priority": "high",
    }}}
