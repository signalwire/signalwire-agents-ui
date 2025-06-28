from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
import jwt
import json
import secrets
import psutil
import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from ..core.database import get_db
from ..auth import get_current_user
from ..models import User, Setting, Token, AuditLog
from ..core.config import settings as app_settings
from ..core.audit import create_audit_log

router = APIRouter(prefix="/admin", tags=["admin"])


class SettingUpdate(BaseModel):
    value: Any


# Settings endpoints
@router.get("/settings")
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all admin settings"""
    settings_dict = {}
    
    # Get all settings from database
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT key, value FROM settings")
    )
    for row in result:
        try:
            settings_dict[row.key] = json.loads(row.value)
        except:
            settings_dict[row.key] = row.value
    
    # Add default values if not set
    defaults = {
        "organization_name": "SignalWire Agent Builder",
        "support_email": "support@example.com",
        "default_voice": "alloy",
        "default_ai_model": "gpt-4o-mini",
        "default_system_prompt": "You are a helpful AI assistant.",
        "enforce_basic_auth": False,
        "enable_audit_log": True,
        "jwt_expiration_hours": 1,
    }
    
    for key, default_value in defaults.items():
        if key not in settings_dict:
            settings_dict[key] = default_value
    
    return settings_dict

@router.put("/settings/{key}")
async def update_setting(
    key: str,
    setting_update: SettingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a specific setting"""
    value = setting_update.value
    # Check if setting exists
    from sqlalchemy import text
    result = await db.execute(
        text("SELECT id FROM settings WHERE key = :key"),
        {"key": key}
    )
    existing = result.fetchone()
    
    if existing:
        # Update existing setting
        await db.execute(
            text("UPDATE settings SET value = :value, updated_at = :updated_at WHERE key = :key"),
            {"key": key, "value": json.dumps(value), "updated_at": datetime.utcnow()}
        )
    else:
        # Create new setting
        await db.execute(
            text("INSERT INTO settings (key, value, created_at, updated_at) VALUES (:key, :value, :created_at, :updated_at)"),
            {"key": key, "value": json.dumps(value), "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        )
    
    await db.commit()
    
    # Log the change
    await create_audit_log(
        db,
        user_id=current_user.id,
        action="settings_update",
        description=f"Updated setting: {key}",
        metadata={"key": key, "value": value}
    )
    
    return {"message": "Setting updated"}

# Security settings endpoints
@router.get("/security")
async def get_security_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get security-specific settings"""
    result = await db.execute(
        """
        SELECT key, value FROM settings 
        WHERE key IN ('global_basic_auth_enabled', 'global_basic_auth_user', 'global_basic_auth_password')
        """
    )
    
    settings_dict = {}
    for row in result:
        settings_dict[row.key] = row.value
    
    return settings_dict

@router.put("/security")
async def update_security_settings(
    security_settings: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update security settings"""
    for key, value in security_settings.items():
        if key in ['global_basic_auth_enabled', 'global_basic_auth_user', 'global_basic_auth_password']:
            await update_setting(key, value, current_user, db)
    
    return {"message": "Security settings updated"}

# Token management endpoints
@router.get("/tokens")
async def list_tokens(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all JWT tokens"""
    result = await db.execute(
        """
        SELECT id, name, token, created_at, expires_at, last_used_at, is_active
        FROM tokens
        ORDER BY created_at DESC
        """
    )
    
    tokens = []
    for row in result:
        tokens.append({
            "id": row.id,
            "name": row.name,
            "token": row.token if row.is_active else "***",  # Hide revoked tokens
            "created_at": row.created_at.isoformat(),
            "expires_at": row.expires_at.isoformat(),
            "last_used_at": row.last_used_at.isoformat() if row.last_used_at else None,
            "is_active": row.is_active
        })
    
    return tokens

@router.post("/tokens")
async def create_token(
    data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new JWT token"""
    name = data.get("name")
    expiry_days = data.get("expiry_days", 30)
    
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token name is required"
        )
    
    # Generate token
    token_id = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=expiry_days)
    
    payload = {
        "sub": token_id,
        "type": "skill_token",
        "exp": expires_at,
        "iat": datetime.utcnow()
    }
    
    token = jwt.encode(payload, app_settings.jwt_secret, algorithm="HS256")
    
    # Save to database
    result = await db.execute(
        """
        INSERT INTO tokens (id, name, token, created_at, expires_at, created_by, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        """,
        token_id, name, token, datetime.utcnow(), expires_at, current_user.id, True
    )
    await db.commit()
    
    # Log the creation
    await create_audit_log(
        db,
        user_id=current_user.id,
        action="token_create",
        description=f"Created token: {name}",
        metadata={"token_id": token_id, "name": name, "expiry_days": expiry_days}
    )
    
    return {
        "id": token_id,
        "name": name,
        "token": token,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": expires_at.isoformat(),
        "is_active": True
    }

@router.delete("/tokens/{token_id}")
async def revoke_token(
    token_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revoke a JWT token"""
    result = await db.execute(
        "SELECT name FROM tokens WHERE id = $1",
        token_id
    )
    token = result.fetchone()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token not found"
        )
    
    await db.execute(
        "UPDATE tokens SET is_active = false WHERE id = $1",
        token_id
    )
    await db.commit()
    
    # Log the revocation
    await create_audit_log(
        db,
        user_id=current_user.id,
        action="token_revoke",
        description=f"Revoked token: {token.name}",
        metadata={"token_id": token_id, "name": token.name}
    )
    
    return {"message": "Token revoked"}

# System info endpoints
@router.get("/system/info")
async def get_system_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get system information"""
    # Get database connection count
    result = await db.execute(
        "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()"
    )
    db_connections = result.scalar()
    
    # Get system metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    # Calculate uptime
    boot_time = datetime.fromtimestamp(psutil.boot_time())
    uptime = datetime.now() - boot_time
    uptime_str = f"{uptime.days}d {uptime.seconds // 3600}h {(uptime.seconds % 3600) // 60}m"
    
    # Get SDK version
    try:
        import signalwire_agents
        sdk_version = getattr(signalwire_agents, "__version__", "Unknown")
    except:
        sdk_version = "Not installed"
    
    # Count installed skills
    try:
        from signalwire_agents.tools import get_available_tools
        installed_skills = len(get_available_tools())
    except:
        installed_skills = 0
    
    return {
        "status": "healthy" if cpu_percent < 80 and memory.percent < 80 else "degraded",
        "uptime": uptime_str,
        "db_connections": db_connections,
        "memory_percent": round(memory.percent, 1),
        "cpu_percent": round(cpu_percent, 1),
        "app_version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "production"),
        "sdk_version": sdk_version,
        "installed_skills": installed_skills
    }

@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get recent audit logs"""
    result = await db.execute(
        """
        SELECT id, action, description, user_id, timestamp, metadata
        FROM audit_logs
        ORDER BY timestamp DESC
        LIMIT $1
        """,
        limit
    )
    
    logs = []
    for row in result:
        logs.append({
            "id": row.id,
            "action": row.action,
            "description": row.description,
            "user_id": row.user_id,
            "timestamp": row.timestamp.isoformat(),
            "metadata": row.metadata
        })
    
    return logs

# Language configuration endpoints
@router.get("/settings/language-configs")
async def get_language_configs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get language configuration settings"""
    from sqlalchemy import text
    
    # Get language configs from settings
    result = await db.execute(
        text("SELECT value FROM settings WHERE key = 'language_configs'")
    )
    row = result.fetchone()
    configs = json.loads(row.value) if row else []
    
    # Get selected presets
    result = await db.execute(
        text("SELECT value FROM settings WHERE key = 'selected_language_presets'")
    )
    row = result.fetchone()
    selected_presets = json.loads(row.value) if row else []
    
    return {
        "configs": configs,
        "selectedPresets": selected_presets
    }

@router.post("/settings/language-configs")
async def save_language_configs(
    data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Save language configuration settings"""
    from sqlalchemy import text
    
    configs = data.get("configs", [])
    selected_presets = data.get("selectedPresets", [])
    
    # Save configs
    await db.execute(
        text("""
            INSERT INTO settings (key, value, created_at, updated_at) 
            VALUES ('language_configs', :value, :created_at, :updated_at)
            ON CONFLICT (key) DO UPDATE 
            SET value = :value, updated_at = :updated_at
        """),
        {
            "value": json.dumps(configs),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    )
    
    # Save selected presets
    await db.execute(
        text("""
            INSERT INTO settings (key, value, created_at, updated_at) 
            VALUES ('selected_language_presets', :value, :created_at, :updated_at)
            ON CONFLICT (key) DO UPDATE 
            SET value = :value, updated_at = :updated_at
        """),
        {
            "value": json.dumps(selected_presets),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    )
    
    await db.commit()
    
    # Log the change
    await create_audit_log(
        db,
        user_id=current_user.id,
        action="language_config_update",
        description="Updated language configuration",
        metadata={"configs_count": len(configs), "presets_count": len(selected_presets)}
    )
    
    return {"message": "Language configuration saved"}

