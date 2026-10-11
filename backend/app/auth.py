
import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


bearer_scheme = HTTPBearer(auto_error=False)


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def hash_password(password: str) -> str:
    """Create a salted PBKDF2 password hash for an environment variable."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, 310_000
    )
    return f"{_b64encode(salt)}${_b64encode(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_text, digest_text = stored_hash.split("$", 1)
        salt = _b64decode(salt_text)
        expected = _b64decode(digest_text)
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, 310_000
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str) -> str:
    secret = os.getenv("SECRET_KEY", "")
    if len(secret) < 32:
        raise RuntimeError("SECRET_KEY must contain at least 32 characters.")

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": subject,
        "exp": int(time.time()) + 8 * 60 * 60,
    }

    message = (
        _b64encode(json.dumps(header, separators=(",", ":")).encode())
        + "."
        + _b64encode(json.dumps(payload, separators=(",", ":")).encode())
    )
    signature = hmac.new(
        secret.encode(), message.encode(), hashlib.sha256
    ).digest()
    return message + "." + _b64encode(signature)


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    unauthorized = HTTPException(
        status_code=401,
        detail="Admin login required or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials or credentials.scheme.lower() != "bearer":
        raise unauthorized

    parts = credentials.credentials.split(".")
    if len(parts) != 3:
        raise unauthorized

    secret = os.getenv("SECRET_KEY", "")
    if len(secret) < 32:
        raise HTTPException(status_code=500, detail="Authentication is not configured.")

    message = parts[0] + "." + parts[1]
    expected = hmac.new(
        secret.encode(), message.encode(), hashlib.sha256
    ).digest()

    try:
        supplied = _b64decode(parts[2])
        payload = json.loads(_b64decode(parts[1]))
        header = json.loads(_b64decode(parts[0]))
    except (ValueError, TypeError, json.JSONDecodeError):
        raise unauthorized

    if (
        header.get("alg") != "HS256"
        or not hmac.compare_digest(expected, supplied)
        or not isinstance(payload.get("exp"), int)
        or payload["exp"] <= int(time.time())
        or payload.get("sub") != "admin"
    ):
        raise unauthorized

    return payload
