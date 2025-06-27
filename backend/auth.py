"""Authentication dependencies and utilities."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt
from datetime import datetime

from .core.config import settings as app_settings
from .core.database import get_db
from .models import User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token."""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, app_settings.JWT_SECRET_KEY, algorithms=["HS256"])
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
    
    # For now, create a virtual user from the token info
    # In a real app, you'd look up the user in the database
    user = User(
        id=token_id,
        username=token_name,
        email=f"{token_name}@example.com"
    )
    
    return user