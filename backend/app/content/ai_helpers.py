"""
AI Content Assistants: Hashtag Recommender and Hook Generator.
Provides free-tier viral hashtag suggestions and catchy captions with offline fallback.
"""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
    "did", "do", "does", "doing", "don't", "down", "during", "each", "few", "for",
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers",
    "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it",
    "its", "itself", "just", "me", "more", "most", "my", "myself", "no", "nor", "not",
    "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves",
    "out", "over", "own", "same", "she", "should", "so", "some", "such", "than", "that",
    "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they",
    "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why",
    "with", "would", "you", "your", "yours", "yourself", "yourselves"
}


def extract_keywords(text: str, max_keywords: int = 5) -> list[str]:
    """Extract significant keywords from text using frequency filtering and stopword pruning."""
    words = re.findall(r"\b[A-Za-z]{3,}\b", text.lower())
    filtered = [w for w in words if w not in STOP_WORDS]
    freq: dict[str, int] = {}
    for w in filtered:
        freq[w] = freq.get(w, 0) + 1

    sorted_words = sorted(freq.keys(), key=lambda w: freq[w], reverse=True)
    return sorted_words[:max_keywords]


async def generate_hashtags_and_hook(
    title: str,
    transcript: str | None = None,
) -> dict[str, Any]:
    """
    Generate viral hashtags and engagement hooks for video content.
    Returns:
        {"hashtags": list[str], "suggested_hook": str}
    """
    combined_text = f"{title} {transcript or ''}"

    # Semantic keyword extraction
    keywords = extract_keywords(combined_text, max_keywords=5)

    # Base trending social tags
    default_tags = ["VidSnap", "Reels", "ShortVideo", "AI", "Creator"]
    custom_tags = [f"#{k.capitalize()}" for k in keywords]
    all_tags = custom_tags + [f"#{t}" for t in default_tags]
    # Deduplicate while preserving order
    seen = set()
    final_tags = []
    for tag in all_tags:
        if tag.lower() not in seen:
            seen.add(tag.lower())
            final_tags.append(tag)

    # Generate hook based on title
    clean_title = title.strip()
    if clean_title.endswith("?"):
        hook = f"You won't believe the answer to: {clean_title}"
    else:
        hook = f"Watch this: {clean_title} 🔥"

    return {
        "hashtags": final_tags[:6],
        "suggested_hook": hook,
    }
