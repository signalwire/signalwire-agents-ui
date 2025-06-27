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
from .models import Token, AuditLog

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncSession = Depends(get_db)
) -> Token:
    """Verify bearer token and return token object."""
    token = credentials.credentials
    
    # Query database for token
    result = await db.execute(
        select(Token).where(Token.token == token, Token.active == True)
    )
    token_obj = result.scalar_one_or_none()
    
    if not token_obj:
        raise HTTPException(
            status_code=401,
            detail="Invalid or inactive token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token_obj


def create_jwt_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT token for internal use."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def decode_jwt_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
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


async def create_audit_log(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: str,
    changes: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    auth_token: Optional[str] = None
) -> None:
    """Create an audit log entry."""
    audit_entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=changes,
        metadata=metadata,
        auth_token=auth_token
    )
    db.add(audit_entry)
    # Note: commit is handled by the session dependency


def get_request_metadata(request: Request) -> Dict[str, Any]:
    """Extract metadata from request for audit logging."""
    return {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "method": request.method,
        "path": str(request.url.path)
    }