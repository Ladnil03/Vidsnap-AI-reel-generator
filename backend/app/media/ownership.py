"""
Storage key ownership validation.

Central helper that asserts a storage key belongs to the requesting user,
preventing IDOR attacks where user A references user B's files.
"""

from fastapi import HTTPException, status

# Known key prefixes that contain {user_id} as the second path component.
# Any key accepted from client input MUST match one of these patterns.
_OWNED_PREFIXES = (
    "uploads/",
    "videos/",
    "reels/",
    "thumbnails/",
)


def assert_key_owned(user_id: str, key: str) -> None:
    """
    Validate that a storage key is owned by the given user_id.

    Expected key format: ``<prefix>/<user_id>/...``

    Raises:
        HTTPException 403 if the key does not belong to the user.
        HTTPException 400 if the key format is invalid.
    """
    if not key or not isinstance(key, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid storage key.",
        )

    # Normalize: reject traversal and backslashes
    if "\\" in key or ".." in key.split("/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid storage key: path traversal is not allowed.",
        )

    parts = key.split("/")
    if len(parts) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid storage key format.",
        )

    prefix = parts[0] + "/"
    key_user_id = parts[1]

    if prefix not in _OWNED_PREFIXES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid storage key prefix.",
        )

    if key_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: storage key does not belong to you.",
        )


def assert_keys_owned(user_id: str, keys: list[str]) -> None:
    """Validate ownership of multiple storage keys."""
    for key in keys:
        assert_key_owned(user_id, key)
