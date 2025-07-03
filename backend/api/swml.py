"""Public SWML endpoint."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
import secrets

from ..core.database import get_db
from ..models import Agent, Setting
from ..core.swml_generator import generate_swml
from ..core.config import settings
from slowapi import Limiter
from slowapi.util import get_remote_address

# SWML endpoint with optional basic auth
router = APIRouter(tags=["swml"])
limiter = Limiter(key_func=get_remote_address)
security = HTTPBasic(auto_error=False)


def verify_agent_auth(credentials: HTTPBasicCredentials, agent_config: dict) -> bool:
    """Verify basic auth credentials against agent configuration."""
    if not credentials:
        return False
        
    correct_username = agent_config.get("basic_auth_user")
    correct_password = agent_config.get("basic_auth_password")
    
    if not correct_username or not correct_password:
        return False
    
    # Use constant-time comparison to prevent timing attacks
    username_ok = secrets.compare_digest(credentials.username, correct_username)
    password_ok = secrets.compare_digest(credentials.password, correct_password)
    
    return username_ok and password_ok


@router.get("/agents/{agent_id}/swml")
@limiter.limit(f"{settings.rate_limit_swml}/hour")
async def get_agent_swml(
    request: Request,
    agent_id: UUID,
    credentials: HTTPBasicCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get SWML document for an agent (optionally protected by basic auth)."""
    # Get agent
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Check if agent requires basic auth
    if agent.config.get("basic_auth_user") and agent.config.get("basic_auth_password"):
        if not credentials or not verify_agent_auth(credentials, agent.config):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Basic"},
            )
    else:
        # Check for global basic auth if agent doesn't have its own
        result = await db.execute(select(Setting).where(Setting.key == "global_basic_auth"))
        global_auth_setting = result.scalar_one_or_none()
        
        if global_auth_setting and global_auth_setting.value:
            global_auth = global_auth_setting.value
            if global_auth.get("enabled") and global_auth.get("username") and global_auth.get("password"):
                if not credentials:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Authentication required",
                        headers={"WWW-Authenticate": "Basic"},
                    )
                
                # Verify against global credentials
                username_ok = secrets.compare_digest(credentials.username, global_auth["username"])
                password_ok = secrets.compare_digest(credentials.password, global_auth["password"])
                
                if not (username_ok and password_ok):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid authentication credentials",
                        headers={"WWW-Authenticate": "Basic"},
                    )
    
    # Generate SWML with db session for env var resolution
    swml = await generate_swml(agent.config, str(agent.id), db)
    
    # Return as JSON with proper content type
    return JSONResponse(
        content=swml,
        media_type="application/json",
        headers={
            "Cache-Control": "public, max-age=60",  # Cache for 1 minute
            "X-Agent-Name": agent.name
        }
    )