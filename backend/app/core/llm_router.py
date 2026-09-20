"""
Multi-Provider LLM Router with Free-Tier Fallback Chain and Intelligent Offline Fallback.
Provides unified completions for AI Room Assistant, caption helpers, and recommendations.

Fallback Chain:
1. Groq (Llama 3.3 70B / 8B free tier - No Card Required)
2. Google Gemini (1.5 Flash free tier - No Card Required)
3. OpenRouter (Free tier models - No Card Required)
4. Deterministic Offline Heuristic Summarizer (zero-cost offline fallback)
"""

import hashlib
import logging
import re
from typing import Any

import httpx

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Simple in-memory response cache: sha256 -> response_text
_COMPLETION_CACHE: dict[str, str] = {}


class LLMRouter:
    """Intelligent multi-provider LLM router with automatic free-tier failover."""

    @staticmethod
    def _compute_cache_key(prompt: str, system_prompt: str) -> str:
        content = f"{system_prompt}|||{prompt}"
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    @classmethod
    async def generate_completion(
        cls,
        prompt: str,
        system_prompt: str = "You are VidSnap AI assistant. Provide concise, high-value responses.",
        user_id: str | None = None,
        max_tokens: int = 500,
        temperature: float = 0.7,
    ) -> str:
        """Route prompt through the free-tier provider chain with caching and heuristic degradation."""
        cache_key = cls._compute_cache_key(prompt, system_prompt)
        if cache_key in _COMPLETION_CACHE:
            logger.debug("LLM cache hit for key %s", cache_key[:12])
            return _COMPLETION_CACHE[cache_key]

        # 1. Try Groq Free Tier
        if settings.groq_api_key:
            try:
                result = await cls._call_groq(prompt, system_prompt, max_tokens, temperature)
                if result:
                    _COMPLETION_CACHE[cache_key] = result
                    return result
            except Exception as e:
                logger.warning("Groq completion failed, falling back: %s", e)

        # 2. Try Google Gemini Free Tier
        if settings.gemini_api_key:
            try:
                result = await cls._call_gemini(prompt, system_prompt, max_tokens, temperature)
                if result:
                    _COMPLETION_CACHE[cache_key] = result
                    return result
            except Exception as e:
                logger.warning("Gemini completion failed, falling back: %s", e)

        # 3. Try OpenRouter Free Tier
        if settings.openrouter_api_key:
            try:
                result = await cls._call_openrouter(prompt, system_prompt, max_tokens, temperature)
                if result:
                    _COMPLETION_CACHE[cache_key] = result
                    return result
            except Exception as e:
                logger.warning("OpenRouter completion failed, falling back: %s", e)

        # 4. Deterministic Offline Heuristic Fallback
        logger.info("Using offline heuristic response generator (no active LLM key or providers exhausted).")
        offline_result = cls._generate_offline_heuristic(prompt, system_prompt)
        _COMPLETION_CACHE[cache_key] = offline_result
        return offline_result

    @classmethod
    async def _call_groq(cls, prompt: str, system_prompt: str, max_tokens: int, temperature: float) -> str | None:
        """Call Groq Cloud API with Llama 3.3 70B / 3.1 8B."""
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            logger.warning("Groq API returned status %s: %s", resp.status_code, resp.text)
            return None

    @classmethod
    async def _call_gemini(cls, prompt: str, system_prompt: str, max_tokens: int, temperature: float) -> str | None:
        """Call Google Gemini 1.5 Flash API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{prompt}"}]},
            ],
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": temperature,
            },
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
            logger.warning("Gemini API returned status %s: %s", resp.status_code, resp.text)
            return None

    @classmethod
    async def _call_openrouter(cls, prompt: str, system_prompt: str, max_tokens: int, temperature: float) -> str | None:
        """Call OpenRouter free models API."""
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://vidsnap.ai",
            "X-Title": "VidSnap AI",
        }
        payload = {
            "model": "meta-llama/llama-3.2-3b-instruct:free",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            return None

    @classmethod
    def _generate_offline_heuristic(cls, prompt: str, system_prompt: str) -> str:
        """
        Deterministic NLP extractor for offline zero-cost environments.
        Extracts key sentences, active topics, and action statements.
        """
        sentences = [s.strip() for s in re.split(r"[.\n!?]", prompt) if len(s.strip()) > 15]
        if not sentences:
            return "Party recap: Active room participants are watching and reacting to the synchronized stream."

        # Select top significant sentences
        unique_sentences = list(dict.fromkeys(sentences))[:4]
        summary_bullets = "\n".join([f"• {s}" for s in unique_sentences])
        return (
            "✨ **Room Catch-Up Summary**:\n"
            f"{summary_bullets}\n\n"
            "💬 *The room is active with real-time video reactions and live discussion.*"
        )

    @classmethod
    async def generate_room_summary(
        cls,
        messages: list[dict[str, Any]],
        room_name: str,
        current_media_title: str | None = None,
    ) -> dict[str, Any]:
        """
        Generate a concise 30-second catch-up summary of recent room discussions.
        Returns formatted summary and key highlights list.
        """
        if not messages:
            return {
                "summary": f"Welcome to '{room_name}'! No chat messages yet — be the first to start the conversation!",
                "highlights": ["Room initialized", "Ready to watch"],
            }

        # Build transcript prompt
        formatted_msgs = []
        for m in messages[-25:]:  # Last 25 messages
            user = m.get("user_name", "Viewer")
            text = m.get("text", "")
            formatted_msgs.append(f"{user}: {text}")

        chat_transcript = "\n".join(formatted_msgs)
        media_ctx = f"Currently watching: '{current_media_title}'" if current_media_title else "Watching synced media"

        system_prompt = (
            "You are the VidSnap AI Room Assistant. A viewer just joined a Watch Party room. "
            "Provide an engaging 30-second 'Catch Me Up' recap of what members discussed and reacted to. "
            "Keep it under 3 punchy bullet points. Be friendly, energetic, and concise."
        )
        prompt = (
            f"Room: '{room_name}' ({media_ctx})\n\n"
            f"Recent Chat Transcript:\n{chat_transcript}\n\n"
            "Summarize what just happened in this room:"
        )

        raw_summary = await cls.generate_completion(prompt, system_prompt, max_tokens=250, temperature=0.6)

        # Extract highlights (bullets or sentences)
        highlights = [
            line.lstrip("•-*0123456789. ").strip()
            for line in raw_summary.splitlines()
            if line.strip() and not line.startswith("✨") and not line.startswith("💬")
        ]
        if not highlights:
            highlights = ["Active discussion in progress", f"Watching: {current_media_title or room_name}"]

        return {
            "summary": raw_summary,
            "highlights": highlights[:3],
        }
