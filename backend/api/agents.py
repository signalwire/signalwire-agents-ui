"""Agent management API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime

from ..core.database import get_db
from ..core.models import Agent, Token
from ..core.security import verify_token, create_audit_log, get_request_metadata
from ..core.config import get_swml_url
from ..core.swml_generator import generate_swml
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/agents", tags=["agents"])
limiter = Limiter(key_func=get_remote_address)


class AgentConfig(BaseModel):
    """Agent configuration schema."""
    voice: str = Field(default="nova", description="Voice to use")
    language: str = Field(default="en-US", description="Language code")
    prompt_sections: List[Dict[str, Any]] = Field(default_factory=list)
    skills: List[Dict[str, Any]] = Field(default_factory=list)
    params: Dict[str, Any] = Field(default_factory=dict)
    post_prompt: Optional[str] = None
    post_prompt_url: Optional[str] = None
    hints: List[str] = Field(default_factory=list)


class AgentCreate(BaseModel):
    """Agent creation request."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    config: AgentConfig


class AgentUpdate(BaseModel):
    """Agent update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    config: Optional[AgentConfig] = None


class AgentResponse(BaseModel):
    """Agent response model."""
    id: UUID
    name: str
    description: Optional[str]
    config: Dict[str, Any]
    swml_url: str
    created_at: datetime
    updated_at: datetime


@router.get("", response_model=List[AgentResponse])
@limiter.limit("60/minute")
async def list_agents(
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: Token = Depends(verify_token)
) -> List[AgentResponse]:
    """List all agents."""
    result = await db.execute(select(Agent).order_by(Agent.created_at.desc()))
    agents = result.scalars().all()
    
    return [
        AgentResponse(
            id=agent.id,
            name=agent.name,
            description=agent.description,
            config=agent.config,
            swml_url=get_swml_url(str(agent.id)),
            created_at=agent.created_at,
            updated_at=agent.updated_at
        )
        for agent in agents
    ]


@router.post("", response_model=AgentResponse)
async def create_agent(
    request: Request,
    agent_data: AgentCreate,
    db: AsyncSession = Depends(get_db),
    token: Token = Depends(verify_token)
) -> AgentResponse:
    """Create a new agent."""
    # Create agent
    agent = Agent(
        name=agent_data.name,
        description=agent_data.description,
        config=agent_data.config.model_dump()
    )
    db.add(agent)
    await db.flush()  # Get the ID
    
    # Create audit log
    await create_audit_log(
        db,
        action="CREATE",
        entity_type="agent",
        entity_id=str(agent.id),
        changes=agent_data.model_dump(),
        metadata=get_request_metadata(request),
        auth_token=token.token
    )
    
    await db.commit()
    await db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        config=agent.config,
        swml_url=get_swml_url(str(agent.id)),
        created_at=agent.created_at,
        updated_at=agent.updated_at
    )


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: Token = Depends(verify_token)
) -> AgentResponse:
    """Get a specific agent."""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        config=agent.config,
        swml_url=get_swml_url(str(agent.id)),
        created_at=agent.created_at,
        updated_at=agent.updated_at
    )


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    agent_data: AgentUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: Token = Depends(verify_token)
) -> AgentResponse:
    """Update an agent."""
    # Get existing agent
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Track changes for audit
    changes = {}
    
    # Update fields
    if agent_data.name is not None:
        changes["name"] = {"old": agent.name, "new": agent_data.name}
        agent.name = agent_data.name
    
    if agent_data.description is not None:
        changes["description"] = {"old": agent.description, "new": agent_data.description}
        agent.description = agent_data.description
    
    if agent_data.config is not None:
        changes["config"] = {"old": agent.config, "new": agent_data.config.model_dump()}
        agent.config = agent_data.config.model_dump()
    
    # Create audit log
    if changes:
        await create_audit_log(
            db,
            action="UPDATE",
            entity_type="agent",
            entity_id=str(agent.id),
            changes=changes,
            metadata=get_request_metadata(request),
            auth_token=token.token
        )
    
    await db.commit()
    await db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        config=agent.config,
        swml_url=get_swml_url(str(agent.id)),
        created_at=agent.created_at,
        updated_at=agent.updated_at
    )


@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: Token = Depends(verify_token)
) -> Dict[str, str]:
    """Delete an agent."""
    # Get existing agent
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Create audit log
    await create_audit_log(
        db,
        action="DELETE",
        entity_type="agent",
        entity_id=str(agent.id),
        changes={"name": agent.name, "config": agent.config},
        metadata=get_request_metadata(request),
        auth_token=token.token
    )
    
    # Delete agent
    await db.execute(delete(Agent).where(Agent.id == agent_id))
    await db.commit()
    
    return {"message": "Agent deleted successfully"}