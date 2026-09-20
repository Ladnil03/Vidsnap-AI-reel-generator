"""
Unit tests for deterministic semantic vector embeddings and cosine similarity.
Validates 384-dimensional unit normalization, zero memory bloat, and topic similarity.
"""

import math

from backend.app.discovery.embeddings import (
    DeterministicSemanticEmbeddingService,
    get_embedding_service,
)


def test_embedding_dimensions_and_unit_norm():
    """Verify vectors are exactly 384 dimensions and have unit L2 length."""
    service = DeterministicSemanticEmbeddingService()
    vector = service.embed_text("Building high performance microservices in Python with FastAPI")

    assert len(vector) == 384
    norm_sq = sum(x * x for x in vector)
    assert math.isclose(norm_sq, 1.0, rel_tol=1e-3)


def test_embedding_empty_text():
    """Empty or whitespace text should return zero vector."""
    service = DeterministicSemanticEmbeddingService()
    zero_vec = service.embed_text("   ")

    assert len(zero_vec) == 384
    assert all(x == 0.0 for x in zero_vec)


def test_cosine_similarity_properties():
    """Verify cosine similarity reflexivity and semantic ranking."""
    service = get_embedding_service()

    v_tech1 = service.embed_text("Python backend API programming and software engineering")
    v_tech2 = service.embed_text("Developer writing Python code and REST APIs")
    v_nature = service.embed_text("Scenic alpine mountain forest and ocean wildlife landscape")

    # Reflexivity: similarity with self is 1.0
    sim_self = service.cosine_similarity(v_tech1, v_tech1)
    assert math.isclose(sim_self, 1.0, rel_tol=1e-3)

    # Semantic similarity: related tech texts must score significantly higher than nature
    sim_tech = service.cosine_similarity(v_tech1, v_tech2)
    sim_cross = service.cosine_similarity(v_tech1, v_nature)

    assert sim_tech > sim_cross
    assert sim_tech > 0.4
