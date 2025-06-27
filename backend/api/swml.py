"""Public SWML endpoint."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from ..core.database import get_db
from ..core.models import Agent
from ..core.swml_generator import generate_swml
from ..core.config import settings
from slowapi import Limiter
from slowapi.util import get_remote_address

# No auth required for public SWML endpoint
router = APIRouter(tags=["swml"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/agents/{agent_id}/swml")
@limiter.limit(f"{settings.rate_limit_swml}/hour")
async def get_agent_swml(
    request: Request,
    agent_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get SWML document for an agent (public endpoint)."""
    # Get agent
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Generate SWML
    swml = generate_swml(agent.config, str(agent.id))
    
    # Return as JSON with proper content type
    return JSONResponse(
        content=swml,
        media_type="application/json",
        headers={
            "Cache-Control": "public, max-age=60",  # Cache for 1 minute
            "X-Agent-Name": agent.name
        }
    )