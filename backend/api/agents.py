"""Agent management API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime

from ..core.database import get_db
from ..models import Agent, Token
from ..core.security import verify_jwt_token
from ..core.audit import create_audit_log, get_request_metadata
from ..core.config import get_swml_url
from ..core.swml_generator import generate_swml
from slowapi import Limiter
from slowapi.util import get_remote_address

router = APIRouter(prefix="/api/agents", tags=["agents"])
limiter = Limiter(key_func=get_remote_address)


class AgentConfig(BaseModel):
    """Agent configuration schema."""
    voice: str = Field(default="nova", description="Voice to use")
    engine: str = Field(default="elevenlabs", description="TTS engine")
    language: str = Field(default="en-US", description="Language code")
    model: Optional[str] = Field(None, description="Model for certain engines")
    prompt_sections: List[Dict[str, Any]] = Field(default_factory=list)
    skills: List[Dict[str, Any]] = Field(default_factory=list)
    params: Dict[str, Any] = Field(default_factory=dict)
    post_prompt: Optional[str] = None
    post_prompt_url: Optional[str] = None
    hints: List[str] = Field(default_factory=list)  # Legacy, kept for compatibility
    # Basic auth for SWML/SWAIG access
    basic_auth_user: Optional[str] = Field(None, description="Basic auth username for SWML access")
    basic_auth_password: Optional[str] = Field(None, description="Basic auth password for SWML access")
    
    # New configuration fields
    simple_hints: List[str] = Field(default_factory=list, description="Simple text hints")
    pattern_hints: List[Dict[str, Any]] = Field(default_factory=list, description="Pattern-based hints with regex")
    pronunciations: List[Dict[str, Any]] = Field(default_factory=list, description="Custom pronunciations")
    global_data: Dict[str, Any] = Field(default_factory=dict, description="Global data available throughout conversation")
    native_functions: List[str] = Field(default_factory=list, description="Enabled native SignalWire functions")
    internal_fillers: Dict[str, Dict[str, List[str]]] = Field(default_factory=dict, description="Custom fillers for native functions")
    record_call: bool = Field(default=False, description="Enable call recording")
    record_format: str = Field(default="mp4", description="Recording format (mp4 or wav)")
    record_stereo: bool = Field(default=True, description="Record in stereo")
    post_prompt_config: Optional[Dict[str, Any]] = Field(None, description="Post-prompt summary configuration")
    contexts_steps_config: Optional[Dict[str, Any]] = Field(None, description="Contexts and steps configuration")


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
    updated_by: Optional[str] = None
    version: Optional[int] = None


def format_swml_url(agent_id: str, config: Dict[str, Any]) -> str:
    """Format SWML URL with basic auth credentials if configured."""
    swml_url = get_swml_url(agent_id)
    if config.get("basic_auth_user"):
        # Show the format but not the actual password
        swml_url = swml_url.replace("https://", f"https://{config['basic_auth_user']}:****@")
    return swml_url


@router.get("", response_model=List[AgentResponse])
@limiter.limit("60/minute")
async def list_agents(
    request: Request,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
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
            swml_url=format_swml_url(str(agent.id), agent.config),
            created_at=agent.created_at,
            updated_at=agent.updated_at,
            updated_by=agent.updated_by,
            version=agent.version
        )
        for agent in agents
    ]


@router.post("", response_model=AgentResponse)
async def create_agent(
    request: Request,
    agent_data: AgentCreate,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> AgentResponse:
    """Create a new agent."""
    # Create agent
    agent = Agent(
        name=agent_data.name,
        description=agent_data.description,
        config=agent_data.config.model_dump(),
        updated_by=str(auth_data["token"].id)
    )
    db.add(agent)
    await db.flush()  # Get the ID
    
    # Create audit log
    token = auth_data["token"]
    await create_audit_log(
        db,
        user_id=str(token.id),
        action="AGENT_CREATE",
        description=f"Created agent: {agent.name}",
        metadata={
            **get_request_metadata(request),
            "agent_id": str(agent.id),
            "agent_name": agent.name,
            "config": agent_data.model_dump()
        }
    )
    
    await db.commit()
    await db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        config=agent.config,
        swml_url=format_swml_url(str(agent.id), agent.config),
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        updated_by=agent.updated_by,
        version=agent.version
    )


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
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
        swml_url=format_swml_url(str(agent.id), agent.config),
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        updated_by=agent.updated_by,
        version=agent.version
    )


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: UUID,
    agent_data: AgentUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
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
    
    # Update metadata
    agent.updated_by = str(auth_data["token"].id)
    agent.version = (agent.version or 1) + 1
    
    # Create audit log
    if changes:
        token = auth_data["token"]
        await create_audit_log(
            db,
            user_id=str(token.id),
            action="AGENT_UPDATE",
            description=f"Updated agent: {agent.name}",
            metadata={
                **get_request_metadata(request),
                "agent_id": str(agent.id),
                "changes": changes
            }
        )
    
    await db.commit()
    await db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        config=agent.config,
        swml_url=format_swml_url(str(agent.id), agent.config),
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        updated_by=agent.updated_by,
        version=agent.version
    )


@router.post("/{agent_id}/replace")
async def replace_agent(
    agent_id: UUID,
    request: Request,
    source_agent_id: UUID = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> AgentResponse:
    """Replace an agent's configuration with another agent's configuration."""
    # Get both agents
    target_result = await db.execute(select(Agent).where(Agent.id == agent_id))
    target_agent = target_result.scalar_one_or_none()
    
    if not target_agent:
        raise HTTPException(status_code=404, detail="Target agent not found")
    
    source_result = await db.execute(select(Agent).where(Agent.id == source_agent_id))
    source_agent = source_result.scalar_one_or_none()
    
    if not source_agent:
        raise HTTPException(status_code=404, detail="Source agent not found")
    
    # Save original name and description
    original_name = target_agent.name
    original_description = target_agent.description
    
    # Copy configuration from source to target
    target_agent.config = source_agent.config.copy()
    
    # Create audit log
    token = auth_data["token"]
    await create_audit_log(
        db,
        user_id=str(token.id),
        action="AGENT_REPLACE",
        description=f"Replaced configuration of agent '{original_name}' with configuration from '{source_agent.name}'",
        metadata={
            **get_request_metadata(request),
            "target_agent_id": str(agent_id),
            "source_agent_id": str(source_agent_id),
            "target_agent_name": original_name,
            "source_agent_name": source_agent.name
        }
    )
    
    await db.commit()
    await db.refresh(target_agent)
    
    return AgentResponse(
        id=target_agent.id,
        name=target_agent.name,
        description=target_agent.description,
        config=target_agent.config,
        swml_url=format_swml_url(str(target_agent.id), target_agent.config),
        created_at=target_agent.created_at,
        updated_at=target_agent.updated_at
    )


@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> Dict[str, str]:
    """Delete an agent."""
    # Get existing agent
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Create audit log
    token = auth_data["token"]
    await create_audit_log(
        db,
        user_id=str(token.id),
        action="AGENT_DELETE",
        description=f"Deleted agent: {agent.name}",
        metadata={
            **get_request_metadata(request),
            "agent_id": str(agent.id),
            "agent_name": agent.name,
            "config": agent.config
        }
    )
    
    # Delete agent
    await db.execute(delete(Agent).where(Agent.id == agent_id))
    await db.commit()
    
    return {"message": "Agent deleted successfully"}


# Call Summary endpoints

class CallSummaryResponse(BaseModel):
    """Call summary response schema."""
    id: str
    agent_id: UUID
    agent_name: str  # Added agent name
    call_id: str
    ai_session_id: Optional[str]
    call_start_date: Optional[int]
    call_end_date: Optional[int]
    caller_id_name: Optional[str]
    caller_id_number: Optional[str]
    post_prompt_summary: Optional[str]
    total_minutes: Optional[float]
    total_input_tokens: Optional[int]
    total_output_tokens: Optional[int]
    total_cost: Optional[float]
    has_recording: bool  # Added recording indicator
    created_at: datetime


class CallSummaryDetailResponse(CallSummaryResponse):
    """Detailed call summary with full logs."""
    call_log: List[Dict[str, Any]]
    swaig_log: List[Dict[str, Any]]
    raw_data: Dict[str, Any]


@router.get("/{agent_id}/summaries")
async def get_agent_summaries(
    agent_id: UUID,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> List[CallSummaryResponse]:
    """Get paginated call summaries for an agent."""
    # Import here to avoid circular imports
    from ..models import CallSummary
    
    # Verify agent exists
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get summaries
    result = await db.execute(
        select(CallSummary)
        .where(CallSummary.agent_id == agent_id)
        .order_by(CallSummary.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    summaries = result.scalars().all()
    
    return [
        CallSummaryResponse(
            id=summary.id,
            agent_id=summary.agent_id,
            agent_name=agent.name,  # Add agent name
            call_id=summary.call_id,
            ai_session_id=summary.ai_session_id,
            call_start_date=summary.call_start_date,
            call_end_date=summary.call_end_date,
            caller_id_name=summary.caller_id_name,
            caller_id_number=summary.caller_id_number,
            post_prompt_summary=summary.post_prompt_summary,
            total_minutes=summary.total_minutes,
            total_input_tokens=summary.total_input_tokens,
            total_output_tokens=summary.total_output_tokens,
            total_cost=summary.total_cost,
            has_recording=bool(summary.raw_data and any(
                msg.get("type") == "recording" or msg.get("recording_url") is not None
                for msg in summary.raw_data.get("conversation", [])
            )),
            created_at=summary.created_at
        )
        for summary in summaries
    ]


@router.get("/{agent_id}/summaries/{summary_id}")
async def get_summary_detail(
    agent_id: UUID,
    summary_id: str,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> CallSummaryDetailResponse:
    """Get detailed call summary including full logs."""
    # Import here to avoid circular imports
    from ..models import CallSummary
    
    # Get summary
    result = await db.execute(
        select(CallSummary)
        .where(CallSummary.id == summary_id)
        .where(CallSummary.agent_id == agent_id)
    )
    summary = result.scalar_one_or_none()
    
    if not summary:
        raise HTTPException(status_code=404, detail="Call summary not found")
    
    # Get agent for name
    agent = await db.get(Agent, agent_id)
    
    # Extract call log from raw data
    call_log = []
    if summary.raw_data:
        # Try different possible field names in order of preference:
        # 1. raw_call_log - most complete log
        # 2. call_log - cleaned/processed log
        # 3. conversation - legacy field name
        call_log = summary.raw_data.get("raw_call_log", 
                   summary.raw_data.get("call_log", 
                   summary.raw_data.get("conversation", [])))
    
    return CallSummaryDetailResponse(
        id=summary.id,
        agent_id=summary.agent_id,
        agent_name=agent.name if agent else "Unknown Agent",
        call_id=summary.call_id,
        ai_session_id=summary.ai_session_id,
        call_start_date=summary.call_start_date,
        call_end_date=summary.call_end_date,
        caller_id_name=summary.caller_id_name,
        caller_id_number=summary.caller_id_number,
        post_prompt_summary=summary.post_prompt_summary,
        total_minutes=summary.total_minutes,
        total_input_tokens=summary.total_input_tokens,
        total_output_tokens=summary.total_output_tokens,
        total_cost=summary.total_cost,
        has_recording=bool(summary.raw_data and any(
            msg.get("type") == "recording" or msg.get("recording_url") is not None
            for msg in call_log
        )),
        created_at=summary.created_at,
        call_log=call_log,
        swaig_log=summary.swaig_log or [],
        raw_data=summary.raw_data or {}
    )