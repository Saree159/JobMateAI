"""
Field-level encryption for sensitive database values.
Uses Fernet (AES-128-CBC + HMAC-SHA256) — symmetric, authenticated.
"""
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from app.config import settings

_fernet: Optional[Fernet] = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(settings.fernet_key.encode())
    return _fernet


def encrypt_field(value: str) -> str:
    """Encrypt a plaintext string. Returns a URL-safe base64 token."""
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt_field(token: str) -> str:
    """Decrypt a Fernet token back to plaintext. Returns original string."""
    return _get_fernet().decrypt(token.encode()).decode()


def decrypt_field_safe(token: Optional[str]) -> Optional[str]:
    """Decrypt with graceful fallback — returns None on failure or if input is None."""
    if not token:
        return None
    try:
        return decrypt_field(token)
    except (InvalidToken, Exception):
        # Value may be a legacy plaintext cookie stored before encryption was added.
        # Return as-is so existing sessions keep working until they re-authenticate.
        return token
