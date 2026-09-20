"""
Billing & Quota Service.
Guarantees atomic credit operations using MongoDB find_one_and_update with {$gt: 0}
and maintains an append-only audit ledger to prevent double-spending and races.
"""

import logging
import uuid
from datetime import datetime, timezone

from pymongo import ReturnDocument

from backend.app.billing_quota.models import TransactionType
from backend.app.core.database import get_db

logger = logging.getLogger(__name__)


class BillingService:
    """Service handling token consumption, refunds, and ledger tracking."""

    @staticmethod
    async def atomic_consume_token(user_id: str, job_id: str) -> bool:
        """
        Atomically decrement user's token balance by 1 if tokens_remaining > 0.
        Records an append-only audit entry in credit_ledger.
        Returns True if deducted, False if user has 0 tokens.
        """
        db = get_db()
        now = datetime.now(timezone.utc)

        # Atomic find and update with condition tokens_remaining > 0
        updated_user = await db.users.find_one_and_update(
            filter={"user_id": user_id, "tokens_remaining": {"$gt": 0}},
            update={"$inc": {"tokens_remaining": -1}},
            return_document=ReturnDocument.AFTER,
        )

        if not updated_user:
            logger.warning("Token deduction failed for user %s: Insufficient balance", user_id)
            return False

        balance_after = updated_user["tokens_remaining"]

        # Append to immutable credit ledger
        ledger_doc = {
            "ledger_id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": -1,
            "balance_after": balance_after,
            "transaction_type": TransactionType.JOB_CONSUMED.value,
            "reference_id": job_id,
            "memo": f"Consumed 1 token for job {job_id}",
            "created_at": now,
        }
        await db.credit_ledger.insert_one(ledger_doc)
        logger.info(
            "Token consumed for user %s on job %s (Remaining: %d)",
            user_id,
            job_id,
            balance_after,
        )
        return True

    @staticmethod
    async def atomic_refund_token(user_id: str, job_id: str, reason: str = "Job failed") -> None:
        """
        Atomically refund 1 token back to the user and record in ledger.
        """
        db = get_db()
        now = datetime.now(timezone.utc)

        updated_user = await db.users.find_one_and_update(
            filter={"user_id": user_id},
            update={"$inc": {"tokens_remaining": 1}},
            return_document=ReturnDocument.AFTER,
        )

        if not updated_user:
            logger.error("Failed to refund token: User %s not found", user_id)
            return

        balance_after = updated_user["tokens_remaining"]
        ledger_doc = {
            "ledger_id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": 1,
            "balance_after": balance_after,
            "transaction_type": TransactionType.JOB_REFUND.value,
            "reference_id": job_id,
            "memo": f"Refund 1 token for job {job_id}: {reason}",
            "created_at": now,
        }
        await db.credit_ledger.insert_one(ledger_doc)
        logger.info("Token refunded for user %s on job %s (New balance: %d)", user_id, job_id, balance_after)

    @staticmethod
    async def grant_tokens(
        user_id: str,
        amount: int,
        transaction_type: TransactionType,
        memo: str | None = None,
        reference_id: str | None = None,
    ) -> int:
        """Grant or adjust tokens and record in ledger."""
        db = get_db()
        now = datetime.now(timezone.utc)

        updated_user = await db.users.find_one_and_update(
            filter={"user_id": user_id},
            update={"$inc": {"tokens_remaining": amount}},
            return_document=ReturnDocument.AFTER,
        )

        if not updated_user:
            raise ValueError(f"User '{user_id}' not found")

        balance_after = updated_user["tokens_remaining"]
        ledger_doc = {
            "ledger_id": str(uuid.uuid4()),
            "user_id": user_id,
            "amount": amount,
            "balance_after": balance_after,
            "transaction_type": transaction_type.value,
            "reference_id": reference_id,
            "memo": memo or f"Token grant: {amount}",
            "created_at": now,
        }
        await db.credit_ledger.insert_one(ledger_doc)
        logger.info("Granted %d tokens to user %s (New balance: %d)", amount, user_id, balance_after)
        return balance_after
