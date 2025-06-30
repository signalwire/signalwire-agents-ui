"""Security and authentication utilities."""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
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

# Security scheme
security = HTTPBearer()


async def verify_jwt_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Verify JWT bearer token and return token data."""
    token = credentials.credentials
    
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
