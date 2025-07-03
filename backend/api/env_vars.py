"""Environment variables API endpoints."""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from pydantic import BaseModel, Field
import re

from ..core.database import get_db
from ..models import EnvVar
from ..auth import get_current_user
from ..core.env_var_resolver import EnvVarResolver

router = APIRouter(prefix="/api/env-vars", tags=["env-vars"])


class EnvVarCreate(BaseModel):
    """Create environment variable request."""
    name: str = Field(..., min_length=1, max_length=255)
    value: str = Field(..., min_length=1)
    description: Optional[str] = None
    is_secret: bool = Field(True)
    
    class Config:
        schema_extra = {
            "example": {
                "name": "OPENAI_API_KEY",
                "value": "sk-1234567890",
                "description": "OpenAI API key for AI features",
                "is_secret": True
            }
        }


class EnvVarUpdate(BaseModel):
    """Update environment variable request."""
    value: Optional[str] = None
    description: Optional[str] = None
    is_secret: Optional[bool] = None


class EnvVarResponse(BaseModel):
    """Environment variable response."""
    id: int
    name: str
    value: str
    description: Optional[str]
    is_secret: bool
    created_at: str
    updated_at: str


class EnvVarStatusResponse(BaseModel):
    """Environment variable status response."""
    exists: bool
    source: Optional[str]
    is_set: bool


@router.get("/", response_model=List[EnvVarResponse])
async def list_env_vars(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all user-defined environment variables."""
    result = await db.execute(select(EnvVar).order_by(EnvVar.name))
    env_vars = result.scalars().all()
    return [EnvVarResponse(**var.to_dict()) for var in env_vars]


@router.post("/", response_model=EnvVarResponse)
async def create_env_var(
    env_var: EnvVarCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new environment variable."""
    # Validate name format (alphanumeric and underscore only)
    if not re.match(r'^[A-Z0-9_]+$', env_var.name):
        raise HTTPException(
            status_code=400,
            detail="Environment variable name must contain only uppercase letters, numbers, and underscores"
        )
    
    # Check if already exists
    result = await db.execute(select(EnvVar).where(EnvVar.name == env_var.name))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Environment variable '{env_var.name}' already exists"
        )
    
    # Create new env var
    db_env_var = EnvVar(
        name=env_var.name,
        value=env_var.value,
        description=env_var.description,
        is_secret=env_var.is_secret
    )
    
    db.add(db_env_var)
    await db.commit()
    await db.refresh(db_env_var)
    
    return EnvVarResponse(**db_env_var.to_dict(reveal_secret=True))


@router.get("/{env_var_id}", response_model=EnvVarResponse)
async def get_env_var(
    env_var_id: int,
    reveal: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific environment variable."""
    result = await db.execute(select(EnvVar).where(EnvVar.id == env_var_id))
    env_var = result.scalar_one_or_none()
    if not env_var:
        raise HTTPException(status_code=404, detail="Environment variable not found")
    
    return EnvVarResponse(**env_var.to_dict(reveal_secret=reveal))


@router.put("/{env_var_id}", response_model=EnvVarResponse)
async def update_env_var(
    env_var_id: int,
    update: EnvVarUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update an environment variable."""
    result = await db.execute(select(EnvVar).where(EnvVar.id == env_var_id))
    env_var = result.scalar_one_or_none()
    if not env_var:
        raise HTTPException(status_code=404, detail="Environment variable not found")
    
    # Update fields
    if update.value is not None:
        env_var.value = update.value
    if update.description is not None:
        env_var.description = update.description
    if update.is_secret is not None:
        env_var.is_secret = update.is_secret
    
    await db.commit()
    await db.refresh(env_var)
    
    return EnvVarResponse(**env_var.to_dict(reveal_secret=True))


@router.delete("/{env_var_id}")
async def delete_env_var(
    env_var_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete an environment variable."""
    result = await db.execute(select(EnvVar).where(EnvVar.id == env_var_id))
    env_var = result.scalar_one_or_none()
    if not env_var:
        raise HTTPException(status_code=404, detail="Environment variable not found")
    
    await db.delete(env_var)
    await db.commit()
    
    return {"message": f"Environment variable '{env_var.name}' deleted successfully"}


@router.get("/check/{name}", response_model=EnvVarStatusResponse)
async def check_env_var(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Check if an environment variable exists and its source."""
    # Check user-defined env vars first
    result = await db.execute(select(EnvVar).where(EnvVar.name == name))
    env_var = result.scalar_one_or_none()
    
    if env_var:
        return EnvVarStatusResponse(
            exists=True,
            source="user",
            is_set=True
        )
    
    # Check system env vars
    import os
    if os.environ.get(name):
        return EnvVarStatusResponse(
            exists=True,
            source="system",
            is_set=True
        )
    
    # Not found
    return EnvVarStatusResponse(
        exists=False,
        source=None,
        is_set=False
    )