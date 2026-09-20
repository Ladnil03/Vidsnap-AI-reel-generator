"""
Unit tests for LLMRouter: multi-provider fallback chain, prompt caching, offline heuristics, and room recaps.
"""

from unittest.mock import AsyncMock, patch

import httpx
import pytest

from backend.app.core.config import settings
from backend.app.core.llm_router import _COMPLETION_CACHE, LLMRouter


@pytest.fixture(autouse=True)
def clear_llm_cache():
    """Clear in-memory completion cache before each test."""
    _COMPLETION_CACHE.clear()
    yield
    _COMPLETION_CACHE.clear()


@pytest.mark.asyncio
async def test_llm_router_groq_success():
    """Test successful completion from primary provider Groq."""
    mock_response = {
        "choices": [{"message": {"content": "Groq: AI generated commentary for video."}}]
    }

    with patch.object(settings, "groq_api_key", "test_groq_key"):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = httpx.Response(200, json=mock_response)

            res = await LLMRouter.generate_completion("What is this video about?")
            assert "Groq: AI generated commentary" in res
            assert mock_post.called


@pytest.mark.asyncio
async def test_llm_router_groq_failure_gemini_fallback():
    """Test automatic failover to Google Gemini when Groq fails."""
    mock_gemini_response = {
        "candidates": [
            {"content": {"parts": [{"text": "Gemini: Fallback response here."}]}}
        ]
    }

    with patch.object(settings, "groq_api_key", "test_groq_key"):
        with patch.object(settings, "gemini_api_key", "test_gemini_key"):
            with patch.object(LLMRouter, "_call_groq", side_effect=Exception("Groq rate limited")):
                with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
                    mock_post.return_value = httpx.Response(200, json=mock_gemini_response)

                    res = await LLMRouter.generate_completion("Explain this short reel.")
                    assert "Gemini: Fallback response" in res


@pytest.mark.asyncio
async def test_llm_router_all_fail_offline_heuristic():
    """Test deterministic offline heuristic fallback when all remote providers fail or no keys set."""
    with patch.object(settings, "groq_api_key", None):
        with patch.object(settings, "gemini_api_key", None):
            with patch.object(settings, "openrouter_api_key", None):
                prompt = (
                    "User1: Look at that skateboard trick!\n"
                    "User2: That was unbelievable 10 out of 10!\n"
                    "User3: Where was this filmed guys?"
                )
                res = await LLMRouter.generate_completion(prompt)
                assert "Room Catch-Up Summary" in res
                assert "skateboard trick" in res or "unbelievable" in res


@pytest.mark.asyncio
async def test_llm_router_cache_hit():
    """Test that identical prompts hit SHA-256 cache without querying provider twice."""
    mock_response = {
        "choices": [{"message": {"content": "Cached AI text output."}}]
    }

    with patch.object(settings, "groq_api_key", "test_groq_key"):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = httpx.Response(200, json=mock_response)

            # First call
            res1 = await LLMRouter.generate_completion("Identical prompt 123")
            assert res1 == "Cached AI text output."
            assert mock_post.call_count == 1

            # Second call should hit cache directly
            res2 = await LLMRouter.generate_completion("Identical prompt 123")
            assert res2 == "Cached AI text output."
            assert mock_post.call_count == 1  # Still 1, not called again


@pytest.mark.asyncio
async def test_generate_room_summary_empty_messages():
    """Test room recap when chat has no messages yet."""
    res = await LLMRouter.generate_room_summary([], room_name="Tech Lounge")
    assert "Welcome to 'Tech Lounge'!" in res["summary"]
    assert len(res["highlights"]) >= 1


@pytest.mark.asyncio
async def test_generate_room_summary_with_messages():
    """Test room recap generation with chat messages."""
    messages = [
        {"user_name": "Alice", "text": "This anime fight scene is so peak!"},
        {"user_name": "Bob", "text": "The animation quality from Ufotable is insane."},
    ]

    with patch.object(settings, "groq_api_key", None):
        with patch.object(settings, "gemini_api_key", None):
            with patch.object(settings, "openrouter_api_key", None):
                res = await LLMRouter.generate_room_summary(
                    messages=messages,
                    room_name="Anime Party",
                    current_media_title="Demon Slayer Ep 19",
                )
                assert "summary" in res
                assert "highlights" in res
                assert isinstance(res["highlights"], list)
