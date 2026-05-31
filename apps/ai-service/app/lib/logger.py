"""
Structured JSON logger using structlog.
Usage:
    from app.lib.logger import get_logger
    logger = get_logger(__name__)
    logger.info("event_name", key="value")
"""
import logging
import time
from pathlib import Path
from threading import Thread

import structlog

from app.config.settings import get_settings

SENSITIVE_KEYS = {
    "access_token",
    "accesstoken",
    "refresh_token",
    "refreshtoken",
    "token",
    "authorization",
    "cookie",
    "password",
    "secret",
    "client_secret",
    "clientsecret",
    "encryptedtokens",
    "openrouter_api_key",
    "anthropic_api_key",
    "stripe_secret_key",
    "session_secret",
    "encryption_key",
}


def _redact_value(value):
    if isinstance(value, dict):
        return {
            key: "[secure]" if key.lower() in SENSITIVE_KEYS else _redact_value(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact_value(item) for item in value]
    return value


def redact_sensitive(_logger, _method_name, event_dict):
    return _redact_value(event_dict)


def _prune_old_logs(log_dir: Path, retention_days: int) -> None:
    cutoff = time.time() - retention_days * 24 * 60 * 60
    for path in log_dir.glob("*.log"):
        try:
            if path.stat().st_mtime < cutoff:
                path.unlink()
        except OSError:
            continue


def _start_prune_loop(log_dir: Path, retention_days: int, interval_seconds: int) -> None:
    def loop() -> None:
        while True:
            _prune_old_logs(log_dir, retention_days)
            time.sleep(interval_seconds)

    Thread(target=loop, daemon=True).start()


def _handler(settings) -> logging.Handler:
    if settings.log_to_file:
        log_dir = Path(settings.log_dir)
        log_dir.mkdir(parents=True, exist_ok=True)
        _prune_old_logs(log_dir, settings.log_retention_days)
        _start_prune_loop(
            log_dir,
            settings.log_retention_days,
            settings.log_prune_interval_seconds,
        )
        date = time.strftime("%Y-%m-%d")
        return logging.FileHandler(log_dir / f"ai-service-{date}.log")

    return logging.StreamHandler()



def _configure_once() -> None:
    settings = get_settings()
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    handler = _handler(settings)
    handler.setFormatter(logging.Formatter("%(message)s"))

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level)

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            structlog.stdlib.add_logger_name,          # works now
            structlog.processors.TimeStamper(fmt="iso"),
            redact_sensitive,
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
