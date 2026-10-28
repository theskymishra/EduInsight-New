import os
from datetime import datetime, timezone

import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from pymongo.database import Database

from app.core.security import create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer(auto_error=False)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


def get_database(request: Request) -> Database:
    return request.app.state.database


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    database: Database = Depends(get_database),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    secret = os.getenv("JWT_SECRET_KEY")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")

    try:
        payload = jwt.decode(
            credentials.credentials,
            secret,
            algorithms=[algorithm],
        )
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            raise ValueError("Invalid subject")
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = database.users.find_one({"_id": ObjectId(user_id), "active": True})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is unavailable",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_role(*allowed_roles: str):
    def role_dependency(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return user

    return role_dependency


def public_user(user: dict) -> UserResponse:
    return UserResponse(
        id=str(user["_id"]),
        full_name=user["full_name"],
        email=user["email"],
        role=user["role"],
    )


@router.post("/login", response_model=LoginResponse)
def login(
    body: LoginRequest,
    database: Database = Depends(get_database),
):
    email = str(body.email).strip().lower()
    user = database.users.find_one({"email": email, "active": True})

    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user["last_login_at"] = datetime.now(timezone.utc)
    database.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login_at": user["last_login_at"]}},
    )

    return LoginResponse(
        access_token=create_access_token(user),
        user=public_user(user),
    )


@router.get("/me", response_model=UserResponse)
def me(user: dict = Depends(get_current_user)):
    return public_user(user)
