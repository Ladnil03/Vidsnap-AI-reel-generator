"""
Billing & Quota Domain Models.
Defines immutable credit ledger entries and token balance schemas.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class TransactionType(str, Enum):
    """Credit transaction types."""
    SIGNUP_BONUS = "signup_bonus"
    JOB_CONSUMED = "job_consumed"
    JOB_REFUND = "job_refund"
    ADMIN_GRANT = "admin_grant"


class CreditLedgerEntry(BaseModel):
    """Immutable ledger entry representing a token credit or debit."""
    ledger_id: str
    user_id: str
    amount: int = Field(..., description="Change in tokens (+ or -)")
    balance_after: int = Field(..., description="User's token balance after this transaction")
    transaction_type: TransactionType
    reference_id: str | None = Field(None, description="Related job_id or admin action")
    memo: str | None = None
    created_at: datetime


class TokenBalanceResponse(BaseModel):
    """Token balance response."""
    user_id: str
    tokens_remaining: int
