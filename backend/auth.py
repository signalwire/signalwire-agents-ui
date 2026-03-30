"""Authentication dependencies and utilities."""
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

from .core.config import settings as app_settings
from .core.cookies import get_jwt_from_cookie
from .core.database import get_db
from .models import User

security = HTTPBearer(auto_error=False)
security_optional = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get the current authenticated user from cookie or Bearer token."""
    # Cookie first, then Bearer header
    token = get_jwt_from_cookie(request)
    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(token, app_settings.jwt_secret, algorithms=["HS256"])
        token_id: str = payload.get("token_id")
        token_name: str = payload.get("token_name")

        if token_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create a virtual user from the token info
    user = User(
        id=token_id,
        username=token_name,
        email=f"{token_name}@example.com"
    )

    return user


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Get the current authenticated user, or None if not authenticated."""
    # Cookie first, then Bearer header
    token = get_jwt_from_cookie(request)
    if not token and credentials:
        token = credentials.credentials

    if not token:
        return None

    try:
        payload = jwt.decode(token, app_settings.jwt_secret, algorithms=["HS256"])
        token_id = payload.get("token_id")
        token_name = payload.get("token_name")
        if token_id is None:
            return None
        return User(
            id=token_id,
            username=token_name,
            email=f"{token_name}@example.com"
        )
    except JWTError:
        return None
