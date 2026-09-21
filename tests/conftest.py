"""
Pytest configuration and shared fixtures for unit and integration testing.
Uses mongomock-motor for in-memory MongoDB emulation and provides async HTTP client.
"""

import asyncio
import os
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

# Force test configuration
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "true"
os.environ["STORAGE_PROVIDER"] = "local"
os.environ["EMAIL_PROVIDER"] = "console"
os.environ["JWT_SECRET_KEY"] = "test_super_secret_jwt_key_min_32_characters_long_12345"
os.environ["MONGODB_DB"] = "test_vidsnap"

import backend.app.core.database as database_module
from backend.app.core.database import ensure_indexes
from backend.app.core.rate_limiter import _in_memory_windows
from backend.app.main import app


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def mock_db():
    """Provide a clean in-memory MongoMock database for each test function."""
    client = AsyncMongoMockClient()
    db = client["test_vidsnap"]

    # Inject mock db into database module
    database_module._client = client
    database_module._db = db

    # Ensure indexes on mock db
    try:
        await ensure_indexes(db)
    except Exception:
        # MongoMock may not support all index options, ignore unsupported
        pass

    yield db

    # Cleanup after test
    database_module._client = None
    database_module._db = None


@pytest_asyncio.fixture(scope="function")
async def async_client(mock_db) -> AsyncGenerator[AsyncClient, None]:
    """Provide an asynchronous HTTP client bound to the FastAPI application."""
    _in_memory_windows.clear()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    _in_memory_windows.clear()
