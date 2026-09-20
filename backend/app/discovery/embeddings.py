"""
Deterministic Semantic Vector Embedding Engine.
Implements a 100% Free-Tier (₹0/month) 384-dimensional dense semantic hashing projection.
Runs in pure Python with zero heavy PyTorch/ONNX dependencies and <5MB RAM footprint.
Provides subword character n-gram hashing, topic anchor projection, and unit-norm cosine similarity.
Follows Ports & Adapters architecture to allow zero-rewrite swapping with FastEmbed or SentenceTransformers.
"""

import hashlib
import math
import re
from abc import ABC, abstractmethod
from typing import ClassVar


class BaseEmbeddingService(ABC):
    """Port interface for text embedding and vector similarity services."""

    @abstractmethod
    def embed_text(self, text: str) -> list[float]:
        """Generate a normalized 384-dimensional embedding vector for input text."""
        pass

    @abstractmethod
    def cosine_similarity(self, v1: list[float], v2: list[float]) -> float:
        """Compute cosine similarity between two embedding vectors."""
        pass


class DeterministicSemanticEmbeddingService(BaseEmbeddingService):
    """
    Zero-cost 384-dimensional dense semantic projection using signed feature hashing,
    subword n-grams, topic semantic anchors, and L2 unit-norm normalization.
    """

    DIMENSIONS = 384

    # Semantic topic anchors to project conceptual relationships into dense space
    TOPIC_ANCHORS: ClassVar[dict[str, list[str]]] = {
        "tech": ["technology", "coding", "software", "developer", "python", "ai", "web", "computer", "cloud", "code"],
        "gaming": ["gaming", "gameplay", "gamer", "esports", "playstation", "xbox", "fps", "streamer", "stream"],
        "comedy": ["funny", "humor", "comedy", "meme", "joke", "laugh", "hilarious", "relatable", "prank"],
        "fitness": ["fitness", "workout", "gym", "health", "exercise", "training", "diet", "bodybuilding", "yoga"],
        "art": ["art", "design", "creative", "drawing", "animation", "visual", "illustration", "aesthetic", "digital"],
        "music": ["music", "song", "audio", "sound", "beats", "melody", "track", "remix", "dance"],
        "nature": ["nature", "wildlife", "travel", "landscape", "outdoors", "scenic", "mountains", "ocean", "forest"],
        "education": ["learn", "tutorial", "science", "facts", "tips", "guide", "how-to", "insight", "knowledge"],
    }

    def _tokenize(self, text: str) -> list[str]:
        """Clean and extract normalized tokens and subwords."""
        cleaned = re.sub(r"[^\w\s#]", " ", text.lower())
        words = [w.strip("#") for w in cleaned.split() if len(w.strip("#")) >= 2]

        tokens: list[str] = list(words)
        # Add character 3-grams and 4-grams for subword semantic capture
        for word in words:
            if len(word) >= 4:
                for i in range(len(word) - 2):
                    tokens.append(word[i : i + 3])
                for i in range(len(word) - 3):
                    tokens.append(word[i : i + 4])
        return tokens

    def _hash_token(self, token: str, seed: int) -> int:
        """Deterministic hash of token with seed."""
        raw = f"{seed}:{token}".encode()
        digest = hashlib.sha256(raw).digest()
        return int.from_bytes(digest[:4], byteorder="little")

    def embed_text(self, text: str) -> list[float]:
        """
        Embed text into a 384-dimensional unit vector.
        Combines signed feature hashing of tokens with topic anchor amplification.
        """
        if not text or not text.strip():
            return [0.0] * self.DIMENSIONS

        vector = [0.0] * self.DIMENSIONS
        tokens = self._tokenize(text)
        if not tokens:
            return [0.0] * self.DIMENSIONS

        # 1. Signed Feature Hashing of tokens & subwords
        for token in tokens:
            weight = 1.0
            # Higher weight for full words vs n-grams
            if len(token) > 4:
                weight = 1.5

            # Deterministic bucket index and sign
            bucket = self._hash_token(token, 42) % self.DIMENSIONS
            sign = 1.0 if (self._hash_token(token, 1337) % 2 == 0) else -1.0
            vector[bucket] += weight * sign

        # 2. Topic Anchor Projection: amplify dimensions for matched semantic categories
        text_lower = text.lower()
        for topic_idx, (_topic, keywords) in enumerate(self.TOPIC_ANCHORS.items()):
            match_count = sum(1 for kw in keywords if kw in text_lower)
            if match_count > 0:
                anchor_weight = 2.0 * math.sqrt(match_count)
                # Spread topic influence across dedicated harmonic dimensions
                for h in range(4):
                    dim = (topic_idx * 40 + h * 7) % self.DIMENSIONS
                    vector[dim] += anchor_weight

        # 3. L2 Unit-Norm Normalization
        norm_sq = sum(x * x for x in vector)
        if norm_sq <= 1e-12:
            return [0.0] * self.DIMENSIONS

        norm = math.sqrt(norm_sq)
        return [round(x / norm, 6) for x in vector]

    def cosine_similarity(self, v1: list[float], v2: list[float]) -> float:
        """
        Compute cosine similarity between two unit vectors.
        Since vectors are L2-normalized, cosine similarity is simply their dot product.
        """
        if len(v1) != self.DIMENSIONS or len(v2) != self.DIMENSIONS:
            return 0.0

        dot = sum(a * b for a, b in zip(v1, v2, strict=False))
        # Clamp to [-1.0, 1.0] to guard against floating point precision errors
        return max(-1.0, min(1.0, dot))


# Global singleton instance for high-throughput zero-alloc embedding
_embedding_service: BaseEmbeddingService = DeterministicSemanticEmbeddingService()


def get_embedding_service() -> BaseEmbeddingService:
    """Return the active vector embedding service."""
    return _embedding_service
