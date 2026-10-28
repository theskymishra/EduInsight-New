import os
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user: dict) -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY is not configured")

    expires_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }

    return jwt.encode(
        payload,
        secret,
        algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
    )
