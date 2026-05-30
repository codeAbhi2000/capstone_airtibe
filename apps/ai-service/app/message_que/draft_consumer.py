"""
Draft Queue Consumer

Listens to `draft.queue` and calls the draft generation service for each message.

Retry / DLQ strategy:
  - On success → ack
  - On recoverable error (Anthropic 5xx, transient DB) → nack with requeue=True (up to MAX_RETRIES)
  - On non-recoverable error (bad payload, DB unique violation) → nack with requeue=False → DLQ
  - delivery_tag header `x-death` count is used to cap retries
"""
import asyncio
import json

import aio_pika
from aio_pika import IncomingMessage

from app.config.rabbitmq import get_channel
from app.config.settings import get_settings
from app.lib.logger import get_logger
from app.utils.message_envelope import DraftMessageEnvelope
from app.services.draft_service import generate_and_persist_draft

logger = get_logger(__name__)
settings = get_settings()

MAX_RETRIES = 3  # after this, nack without requeue → DLQ


def _death_count(message: IncomingMessage) -> int:
    """Return how many times this message has been dead-lettered."""
    x_death = message.headers.get("x-death")
    if not x_death:
        return 0
    # x-death is a list of dicts; sum the 'count' fields
    return sum(entry.get("count", 0) for entry in x_death)


async def _requeue_with_backoff(channel, message: IncomingMessage, retries: int):
    delay_ms = (2 ** retries) * 1000  # exponential: 2s, 4s, 8s...
    await channel.default_exchange.publish(
        aio_pika.Message(
            body=message.body,
            headers={**message.headers, "x-retry-count": retries + 1},
            expiration=str(delay_ms),  # TTL before DLX re-routes it back
        ),
        routing_key=settings.retry_queue,  # dedicated retry queue
    )
    await message.ack() 


async def _handle_message(message: IncomingMessage) -> None:
    retries = _death_count(message)

    async with message.process(ignore_processed=True):
        try:
            payload = json.loads(message.body.decode())
            envelope = DraftMessageEnvelope(**payload)
        except Exception as exc:
            logger.error(
                "draft_consumer_bad_payload",
                error=str(exc),
                raw=message.body.decode()[:200],
            )
            # Non-recoverable — send straight to DLQ
            await message.nack(requeue=False)
            return

        logger.info(
            "draft_consumer_received",
            message_id=envelope.messageId,
            priority=envelope.priority,
            retry=retries,
        )

        try:
            draft = await generate_and_persist_draft(envelope)
            logger.info(
                "draft_consumer_success",
                draft_id=draft.id,
                message_id=envelope.messageId,
            )
            await message.ack()

        except Exception as exc:
            logger.error(
                "draft_consumer_error",
                error=str(exc),
                message_id=envelope.messageId,
                retry=retries,
                exc_info=True,
            )
            if retries >= MAX_RETRIES:
                logger.warning(
                    "draft_consumer_max_retries",
                    message_id=envelope.messageId,
                    routing_to_dlq=True,
                )
                await message.nack(requeue=False)
            else:
                # Requeue for retry — RabbitMQ will re-deliver
                channel = await get_channel()
                await _requeue_with_backoff(channel, message, retries)


async def start_consumer() -> None:
    """
    Begin consuming from draft.queue.
    Blocks until the channel/connection is closed (e.g. on shutdown).
    """
    channel = await get_channel()
    queue = await channel.get_queue(settings.draft_queue)

    logger.info(
        "draft_consumer_started",
        queue=settings.draft_queue,
        prefetch=10,
    )

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            # Each message is handled in its own task to allow parallel processing
            asyncio.create_task(_handle_message(message))
