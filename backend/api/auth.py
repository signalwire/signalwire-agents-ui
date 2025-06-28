"""Authentication API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Dict

from ..core.database import get_db
from ..models import Token
from ..core.security import create_jwt_token
from ..core.audit import create_audit_log, get_request_metadata

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    token: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    name: str


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """Authenticate with a token and receive a JWT."""
    # Check if token exists and is active
    result = await db.execute(
        select(Token).where(
            Token.token == login_data.token,
            Token.is_active == True
        )
    )
    token_obj = result.scalar_one_or_none()
    
    if not token_obj:
        # Log failed login attempt
        await create_audit_log(
            db,
            user_id="anonymous",
            action="LOGIN_FAILED",
            description=f"Failed login attempt with token: {login_data.token[:8]}...",
            metadata=get_request_metadata(request)
        )
        raise HTTPException(status_code=401, detail="Invalid or inactive token")
    
    # Create JWT token
    jwt_token = create_jwt_token({
        "token_id": token_obj.id,
        "token_name": token_obj.name
    }, remember_me=login_data.remember_me)
    
    # Log successful login
    await create_audit_log(
        db,
        user_id=str(token_obj.id),
        action="LOGIN",
        description=f"Successful login for token: {token_obj.name}",
        metadata=get_request_metadata(request)
    )
    
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "name": token_obj.name
    }