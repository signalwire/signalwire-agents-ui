"""Security and authentication utilities."""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from jose import JWTError, jwt
from fastapi import HTTPException, Security, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from .config import settings
from .database import get_db
from ..models import Token

logger = logging.getLogger(__name__)

# Role hierarchy: admin > user > viewer
ROLE_HIERARCHY = {"admin": 3, "user": 2, "viewer": 1}

# Security scheme — auto_error=False so missing header doesn't 401 before we check cookies
security = HTTPBearer(auto_error=False)


async def verify_jwt_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Verify JWT from cookie (preferred) or Bearer header (fallback)."""
    from .cookies import get_jwt_from_cookie

    # 1. Try cookie first
    token = get_jwt_from_cookie(request)

    # 2. Fall back to Bearer header
    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Decode JWT token
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        token_id = payload.get("token_id")
        
        if not token_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify the token still exists and is active in DB
        result = await db.execute(
            select(Token).where(Token.id == token_id, Token.is_active == True)
        )
        token_obj = result.scalar_one_or_none()
        
        if not token_obj:
            raise HTTPException(
                status_code=401,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Return both payload and token object
        return {"payload": payload, "token": token_obj}
        
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncSession = Depends(get_db)
) -> Token:
    """Verify bearer token and return token object."""
    token = credentials.credentials
    
    # Query database for token
    result = await db.execute(
        select(Token).where(Token.token == token, Token.is_active == True)
    )
    token_obj = result.scalar_one_or_none()
    
    if not token_obj:
        raise HTTPException(
            status_code=401,
            detail="Invalid or inactive token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token_obj


def create_jwt_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None, remember_me: bool = False) -> str:
    """Create a JWT token for internal use."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    elif remember_me:
        expire = datetime.utcnow() + timedelta(days=30)  # 30 days for remember me
    else:
        expire = datetime.utcnow() + timedelta(days=7)  # Default 7 days
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm="HS256")
    return encoded_jwt


def decode_jwt_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def create_skill_jwt_token(agent_id: str, skill_name: str, skill_params: Dict[str, Any]) -> str:
    """Create a JWT token for skill execution in SignalWire."""
    payload = {
        "agent_id": agent_id,
        "skill_name": skill_name,
        "skill_params": skill_params,
        "exp": datetime.utcnow() + timedelta(days=30)  # Skills tokens last longer
    }
    
    return jwt.encode(
        payload,
        settings.signalwire_jwt_secret,
        algorithm="HS256"
    )


def decode_skill_jwt_token(token: str) -> Dict[str, Any]:
    """Decode and validate a skill JWT token."""
    try:
        payload = jwt.decode(token, settings.signalwire_jwt_secret, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate skill token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_role(minimum_role: str):
    """Dependency factory that checks the token's role meets the minimum required.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(auth_data = Depends(require_role("admin"))):
            ...
    """
    min_level = ROLE_HIERARCHY.get(minimum_role, 0)

    async def _check_role(auth_data: Dict[str, Any] = Depends(verify_jwt_token)) -> Dict[str, Any]:
        token_obj = auth_data["token"]
        token_role = getattr(token_obj, "role", "admin") or "admin"
        token_level = ROLE_HIERARCHY.get(token_role, 0)

        if token_level < min_level:
            raise HTTPException(
                status_code=403,
                detail=f"Requires {minimum_role} role",
            )
        return auth_data

    return _check_role
