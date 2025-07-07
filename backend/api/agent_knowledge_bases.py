"""Agent-Knowledge Base association API endpoints."""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel

from ..core.database import get_db
from ..core.audit import create_audit_log as audit_log
from ..core.security import verify_jwt_token
from ..models import Agent, KnowledgeBase, AgentKnowledgeBase

logger = logging.getLogger(__name__)

router = APIRouter(tags=["agent_knowledge_bases"])


class AttachedKnowledgeBase(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    attached_at: datetime
    config: dict


class AttachConfig(BaseModel):
    # Tool configuration
    tool_name: Optional[str] = None
    tool_description: Optional[str] = None
    response_prefix: Optional[str] = None
    response_postfix: Optional[str] = None
    no_results_message: Optional[str] = None
    default_result_count: Optional[int] = None
    speech_hints: Optional[List[str]] = None
    # Additional config can be passed
    config: Optional[dict] = {}


@router.get("/agents/{agent_id}/knowledge-bases")
async def list_agent_knowledge_bases(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> List[AttachedKnowledgeBase]:
    """List knowledge bases attached to an agent."""
    # Verify agent exists
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get attached knowledge bases
    result = await db.execute(
        select(AgentKnowledgeBase, KnowledgeBase)
        .join(KnowledgeBase)
        .where(AgentKnowledgeBase.agent_id == agent_id)
        .order_by(AgentKnowledgeBase.attached_at.desc())
    )
    
    attached_kbs = []
    for akb, kb in result:
        attached_kbs.append(AttachedKnowledgeBase(
            id=kb.id,
            name=kb.name,
            description=kb.description,
            attached_at=akb.attached_at,
            config=akb.config or {}
        ))
    
    return attached_kbs


@router.post("/agents/{agent_id}/knowledge-bases/{kb_id}/attach")
async def attach_knowledge_base(
    agent_id: UUID,
    kb_id: UUID,
    data: AttachConfig = Body(default=AttachConfig()),
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Attach a knowledge base to an agent."""
    # Verify both exist
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # Check if already attached
    existing = await db.execute(
        select(AgentKnowledgeBase).where(
            and_(
                AgentKnowledgeBase.agent_id == agent_id,
                AgentKnowledgeBase.knowledge_base_id == kb_id
            )
        )
    )
    if existing.scalar():
        raise HTTPException(status_code=400, detail="Knowledge base already attached to this agent")
    
    # Build config from tool settings
    config = data.config or {}
    
    # Add tool configuration if provided
    if data.tool_name:
        config["tool_name"] = data.tool_name
    if data.tool_description:
        config["tool_description"] = data.tool_description
    if data.response_prefix is not None:
        config["response_prefix"] = data.response_prefix
    if data.response_postfix is not None:
        config["response_postfix"] = data.response_postfix
    if data.no_results_message:
        config["no_results_message"] = data.no_results_message
    if data.default_result_count is not None:
        config["default_result_count"] = data.default_result_count
    if data.speech_hints:
        config["speech_hints"] = data.speech_hints
    
    # Create association
    akb = AgentKnowledgeBase(
        agent_id=agent_id,
        knowledge_base_id=kb_id,
        attached_by=str(auth_data["token"].id),
        config=config
    )
    db.add(akb)
    await db.commit()
    
    # Audit log
    await audit_log(
        db,
        user_id=str(auth_data["token"].id),
        action="attach_knowledge_base",
        description=f"Attached knowledge base '{kb.name}' to agent '{agent.name}'",
        metadata={
            "agent_id": str(agent_id),
            "knowledge_base_id": str(kb_id),
            "agent_name": agent.name,
            "kb_name": kb.name
        }
    )
    
    return {"detail": "Knowledge base attached successfully"}


@router.delete("/agents/{agent_id}/knowledge-bases/{kb_id}/detach")
async def detach_knowledge_base(
    agent_id: UUID,
    kb_id: UUID,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Detach a knowledge base from an agent."""
    # Get the association
    result = await db.execute(
        select(AgentKnowledgeBase).where(
            and_(
                AgentKnowledgeBase.agent_id == agent_id,
                AgentKnowledgeBase.knowledge_base_id == kb_id
            )
        )
    )
    akb = result.scalar_one_or_none()
    
    if not akb:
        raise HTTPException(status_code=404, detail="Knowledge base not attached to this agent")
    
    # Get names for audit log
    agent = await db.get(Agent, agent_id)
    kb = await db.get(KnowledgeBase, kb_id)
    
    # Delete association
    await db.delete(akb)
    await db.commit()
    
    # Audit log
    await audit_log(
        db,
        user_id=str(auth_data["token"].id),
        action="detach_knowledge_base",
        description=f"Detached knowledge base '{kb.name if kb else kb_id}' from agent '{agent.name if agent else agent_id}'",
        metadata={
            "agent_id": str(agent_id),
            "knowledge_base_id": str(kb_id)
        }
    )
    
    return {"detail": "Knowledge base detached successfully"}


class SearchRequest(BaseModel):
    query: str
    knowledge_base_ids: Optional[List[UUID]] = None
    count: int = 3


class SearchResult(BaseModel):
    answer: str
    metadata: dict


@router.post("/agents/{agent_id}/knowledge-bases/search")
async def search_agent_knowledge_bases(
    agent_id: UUID,
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> SearchResult:
    """Search across all knowledge bases attached to an agent."""
    # This will be implemented when we update the search functionality
    # For now, return a placeholder
    return SearchResult(
        answer="Knowledge base search will be implemented in the next phase.",
        metadata={
            "agent_id": str(agent_id),
            "query": request.query,
            "knowledge_base_ids": [str(kb_id) for kb_id in request.knowledge_base_ids] if request.knowledge_base_ids else []
        }
    )