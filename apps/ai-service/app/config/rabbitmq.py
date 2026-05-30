"""
RabbitMQ factory — creates the topic exchange, draft.queue, and DLQ.
Call `get_rabbitmq_channel()` to obtain a ready-to-use channel.
"""
import asyncio
from typing import Optional

import aio_pika
from aio_pika import Channel, ExchangeType, RobustConnection

from app.config.settings import get_settings
from app.lib.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

_connection: Optional[RobustConnection] = None
_channel: Optional[Channel] = None
_lock = asyncio.Lock()


async def _declare_topology(channel: Channel) -> None:
    """Idempotently declare exchange, queues, and bindings."""
    # Dead-letter exchange (direct) that routes to DLQ
    dlx = await channel.declare_exchange(
        "email.dlx",
        ExchangeType.DIRECT,
        durable=True,
    )

    # Dead letter queue
    dlq = await channel.declare_queue(
        settings.dlq_name,
        durable=True,
    )
    await dlq.bind(dlx, routing_key=settings.dlq_routing_key)

    # Main topic exchange
    await channel.declare_exchange(
        settings.rabbitmq_exchange,
        ExchangeType.TOPIC,
        durable=True,
    )

    # Draft queue — failed messages are routed to DLX
    draft_q = await channel.declare_queue(
        settings.draft_queue,
        durable=True,
        arguments={
            "x-dead-letter-exchange": "email.dlx",
            "x-dead-letter-routing-key": settings.dlq_routing_key,
        },
    )

    # Re-fetch exchange object for binding (channel caches by name)
    main_exchange = await channel.get_exchange(settings.rabbitmq_exchange)
    await draft_q.bind(main_exchange, routing_key=settings.draft_routing_key)


    retry_exchange = await channel.declare_exchange(
        "retry.exchange",
        aio_pika.ExchangeType.DIRECT,
        durable=True,
    )


    # ── 5. Retry queue ────────────────────────────────────────────────
    #    Messages sit here until TTL expires (set per-message in _requeue_with_backoff)
    #    then DLX routes them back to main.exchange → draft.queue
    retry_queue = await channel.declare_queue(
        settings.retry_queue,           # e.g. "retry.queue"
        durable=True,
        arguments={
            "x-dead-letter-exchange":    "retry.exchange",   # on TTL expiry →
            "x-dead-letter-routing-key": settings.draft_queue,  # → back to draft.queue
        },
    )
    await retry_queue.bind(retry_exchange, routing_key=settings.retry_queue)

    logger.info(
        "rabbitmq_topology_declared",
        exchange=settings.rabbitmq_exchange,
        draft_queue=settings.draft_queue,
        dlq=settings.dlq_name,
    )


async def connect() -> None:
    """Create connection + channel and declare topology. Called once at startup."""
    global _connection, _channel

    async with _lock:
        if _connection is not None and not _connection.is_closed:
            return

        logger.info("rabbitmq_connecting", url=settings.rabbitmq_url)
        _connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        _channel = await _connection.channel()
        await _channel.set_qos(prefetch_count=10)
        await _declare_topology(_channel)
        logger.info("rabbitmq_connected")


async def disconnect() -> None:
    """Graceful shutdown — called in FastAPI lifespan."""
    global _connection, _channel

    if _channel and not _channel.is_closed:
        await _channel.close()
    if _connection and not _connection.is_closed:
        await _connection.close()
    logger.info("rabbitmq_disconnected")


async def get_channel() -> Channel:
    """Return the shared channel, reconnecting if necessary."""
    if _channel is None or _channel.is_closed:
        await connect()
    return _channel  # type: ignore[return-value]
