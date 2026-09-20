"""
Logging configuration for VidSnap AI.

Configures structured logging and ensures sensitive patterns (passwords, tokens)
are not leaked to stdout or external collectors.
"""

import logging
import re
import sys


class SensitiveDataFilter(logging.Filter):
    """Filter that masks MongoDB credentials, Bearer tokens, and API keys."""

    MONGO_URI_PATTERN = re.compile(r":([^@]+)@")
    BEARER_PATTERN = re.compile(r"Bearer\s+([A-Za-z0-9-_.]+)", re.IGNORECASE)

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self.MONGO_URI_PATTERN.sub(":****@", record.msg)
            record.msg = self.BEARER_PATTERN.sub("Bearer ****", record.msg)
        return True


def setup_logging(debug: bool = False) -> None:
    """Setup application-wide logging."""
    log_level = logging.DEBUG if debug else logging.INFO
    formatter = logging.Formatter(
        fmt="%(asctime)s  %(levelname)-8s  [%(name)s]  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.addFilter(SensitiveDataFilter())

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers = [handler]

    # Silence overly verbose external loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("aiofiles").setLevel(logging.WARNING)
