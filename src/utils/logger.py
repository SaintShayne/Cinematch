"""
Structured logger for CineMatch backend.

Emits JSON-like log lines that are easy to parse in production log aggregators
(Datadog, Logtail, etc.) and human-readable in development.

Format:
    TIMESTAMP | LEVEL | name | key=value key=value ...

Usage:
    from src.utils.logger import get_logger
    logger = get_logger(__name__)
    logger.info("search request", query="avatar", latency_ms=42)
"""

import logging
import time
from typing import Any


class StructuredFormatter(logging.Formatter):
    """Formats log records as structured key=value pairs."""

    def format(self, record: logging.LogRecord) -> str:
        base = (
            f"{self.formatTime(record, self.datefmt)} | "
            f"{record.levelname:<8} | "
            f"{record.name} | "
            f"{record.getMessage()}"
        )
        # Attach any extra structured fields added via logger.info("msg", extra={...})
        extras = {
            k: v
            for k, v in record.__dict__.items()
            if k not in {
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "taskName",
            }
        }
        if extras:
            pairs = " ".join(f"{k}={v!r}" for k, v in extras.items())
            base = f"{base} | {pairs}"
        return base


def get_logger(name: str) -> logging.Logger:
    """Return a named logger with the structured formatter attached."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(StructuredFormatter(datefmt="%Y-%m-%d %H:%M:%S"))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger


class RequestTimer:
    """
    Context manager that measures wall-clock latency and logs a summary line.

    Usage:
        with RequestTimer(logger, "search", query=query):
            results = do_search(query)
    """

    def __init__(self, logger: logging.Logger, endpoint: str, **fields: Any):
        self._logger = logger
        self._endpoint = endpoint
        self._fields = fields
        self._start: float = 0.0

    def __enter__(self) -> "RequestTimer":
        self._start = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        latency_ms = round((time.perf_counter() - self._start) * 1000, 1)
        if exc_type is None:
            self._logger.info(
                f"{self._endpoint} ok",
                extra={"latency_ms": latency_ms, **self._fields},
            )
        else:
            self._logger.error(
                f"{self._endpoint} error",
                extra={
                    "latency_ms": latency_ms,
                    "error": str(exc_val),
                    **self._fields,
                },
            )
        return False  # do not suppress exceptions
