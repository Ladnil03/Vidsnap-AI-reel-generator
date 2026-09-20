"""
Unit tests for atomic token billing and credit ledger operations.
"""

from datetime import datetime, timezone

import pytest

from backend.app.billing_quota.models import TransactionType
from backend.app.billing_quota.service import BillingService


@pytest.mark.asyncio
async def test_atomic_token_consumption(mock_db):
    """Verify atomic token deduction and double-spend prevention."""
    user_id = "test-user-billing"
    # Seed user with 1 token
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Test User",
        "email": "billing@vidsnap.ai",
        "tokens_remaining": 1,
        "created_at": datetime.now(timezone.utc),
    })

    # First deduction should succeed
    success1 = await BillingService.atomic_consume_token(user_id, "job-1")
    assert success1 is True

    user = await mock_db.users.find_one({"user_id": user_id})
    assert user["tokens_remaining"] == 0

    # Second deduction must fail (preventing negative tokens / double spend)
    success2 = await BillingService.atomic_consume_token(user_id, "job-2")
    assert success2 is False

    user = await mock_db.users.find_one({"user_id": user_id})
    assert user["tokens_remaining"] == 0  # Still 0, not -1!

    # Verify credit ledger recorded transaction
    ledger_entries = await mock_db.credit_ledger.find({"user_id": user_id}).to_list(length=10)
    assert len(ledger_entries) == 1
    assert ledger_entries[0]["amount"] == -1
    assert ledger_entries[0]["balance_after"] == 0
    assert ledger_entries[0]["reference_id"] == "job-1"


@pytest.mark.asyncio
async def test_atomic_token_refund(mock_db):
    """Verify atomic refund correctly increments balance and writes audit record."""
    user_id = "test-user-refund"
    await mock_db.users.insert_one({
        "user_id": user_id,
        "name": "Refund User",
        "email": "refund@vidsnap.ai",
        "tokens_remaining": 0,
        "created_at": datetime.now(timezone.utc),
    })

    await BillingService.atomic_refund_token(user_id, "failed-job-99", "FFmpeg failure")

    user = await mock_db.users.find_one({"user_id": user_id})
    assert user["tokens_remaining"] == 1

    ledger_entries = await mock_db.credit_ledger.find({"user_id": user_id}).to_list(length=10)
    assert len(ledger_entries) == 1
    assert ledger_entries[0]["amount"] == 1
    assert ledger_entries[0]["transaction_type"] == TransactionType.JOB_REFUND.value
