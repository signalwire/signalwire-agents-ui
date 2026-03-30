"""Authentication API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Dict
from slowapi import Limiter
from slowapi.util import get_remote_address

from ..core.database import get_db
from ..models import Token
from ..core.security import create_jwt_token, decode_jwt_token
from ..core.cookies import set_auth_cookie, clear_auth_cookies, get_jwt_from_cookie
from ..core.audit import create_audit_log, get_request_metadata

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


class LoginRequest(BaseModel):
    token: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    name: str


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate with a token and receive a JWT (set as httpOnly cookie)."""
    # Check if token exists and is active
    result = await db.execute(
        select(Token).where(
            Token.token == login_data.token,
            Token.is_active == True
        )
    )
    token_obj = result.scalar_one_or_none()

    if not token_obj:
        await create_audit_log(
            db,
            user_id="anonymous",
            action="LOGIN_FAILED",
            description=f"Failed login attempt with token: {login_data.token[:8]}...",
            metadata=get_request_metadata(request)
        )
        raise HTTPException(status_code=401, detail="Invalid or inactive token")

    # Create JWT token (include role for frontend access control)
    token_role = getattr(token_obj, "role", "admin") or "admin"
    jwt_token = create_jwt_token({
        "token_id": token_obj.id,
        "token_name": token_obj.name,
        "role": token_role,
    }, remember_me=login_data.remember_me)

    # Log successful login
    await create_audit_log(
        db,
        user_id=str(token_obj.id),
        action="LOGIN",
        description=f"Successful login for token: {token_obj.name}",
        metadata=get_request_metadata(request)
    )

    # Return JWT in both the response body (backward compat) and as httpOnly cookie
    response = JSONResponse(content={
        "access_token": jwt_token,
        "token_type": "bearer",
        "name": token_obj.name,
        "role": token_role,
    })
    set_auth_cookie(response, request, jwt_token, remember_me=login_data.remember_me)
    return response


@router.post("/logout")
async def logout(request: Request):
    """Clear auth cookies. No-op for Bearer-only clients."""
    response = JSONResponse(content={"detail": "Logged out"})
    clear_auth_cookies(response, request)
    return response


@router.get("/me")
async def get_me(request: Request):
    """Return current user info from cookie or Bearer token.

    Used by the frontend to check auth status on page load.
    """
    # Try cookie first
    token = get_jwt_from_cookie(request)

    # Fall back to Bearer header
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_jwt_token(token)
    return {
        "token_id": payload.get("token_id"),
        "name": payload.get("token_name"),
        "role": payload.get("role", "admin"),
        "exp": payload.get("exp"),
    }
