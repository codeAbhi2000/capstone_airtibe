"""
Structured JSON logger using structlog.
Usage:
    from app.lib.logger import get_logger
    logger = get_logger(__name__)
    logger.info("event_name", key="value")
"""
import logging
import sys

import structlog

from app.config.settings import get_settings




def _configure_once() -> None:
    settings = get_settings()
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,          # works now
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),  # ← fix
        cache_logger_on_first_use=True,
    )


_configured = False


def get_logger(name: str) -> structlog.BoundLogger:
    global _configured
    if not _configured:
        _configure_once()
        _configured = True
    return structlog.get_logger(name)
