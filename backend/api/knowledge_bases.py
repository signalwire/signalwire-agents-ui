"""Knowledge Base management API endpoints."""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_
from pydantic import BaseModel, Field

from ..core.database import get_db
from ..core.audit import create_audit_log as audit_log
from ..core.security import verify_jwt_token
from ..models import KnowledgeBase, AgentKnowledgeBase, Agent, KBCollection, KBDocument

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/knowledge-bases", tags=["knowledge_bases"])


class KnowledgeBaseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Knowledge base name")
    description: Optional[str] = Field(None, description="Knowledge base description")
    settings: Optional[dict] = Field(default_factory=dict, description="Knowledge base settings")


class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    settings: Optional[dict] = None


class KnowledgeBaseResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    settings: dict
    stats: dict
    agent_count: int = 0


class KnowledgeBaseListResponse(BaseModel):
    knowledge_bases: List[KnowledgeBaseResponse]
    total: int


@router.get("")
async def list_knowledge_bases(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> KnowledgeBaseListResponse:
    """List all knowledge bases."""
    query = select(KnowledgeBase)
    
    if search:
        query = query.where(
            KnowledgeBase.name.ilike(f"%{search}%") |
            KnowledgeBase.description.ilike(f"%{search}%")
        )
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)
    
    # Get paginated results
    query = query.order_by(KnowledgeBase.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    knowledge_bases = result.scalars().all()
    
    # Get agent counts
    kb_responses = []
    for kb in knowledge_bases:
        # Count agents using this KB
        agent_count = await db.scalar(
            select(func.count()).select_from(AgentKnowledgeBase)
            .where(AgentKnowledgeBase.knowledge_base_id == kb.id)
        )
        
        kb_responses.append(KnowledgeBaseResponse(
            id=kb.id,
            name=kb.name,
            description=kb.description,
            created_by=kb.created_by,
            created_at=kb.created_at,
            updated_at=kb.updated_at,
            settings=kb.settings or {},
            stats=kb.stats or {},
            agent_count=agent_count
        ))
    
    return KnowledgeBaseListResponse(
        knowledge_bases=kb_responses,
        total=total
    )


@router.post("")
async def create_knowledge_base(
    data: KnowledgeBaseCreate,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> KnowledgeBaseResponse:
    """Create a new knowledge base."""
    # Check if name already exists
    existing = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.name == data.name)
    )
    if existing.scalar():
        raise HTTPException(status_code=400, detail="Knowledge base with this name already exists")
    
    # Create knowledge base
    kb = KnowledgeBase(
        name=data.name,
        description=data.description,
        created_by=str(auth_data["token"].id),
        settings=data.settings or {
            "chunk_size": 512,
            "chunk_overlap": 100,
            "search_count": 3,
            "similarity_threshold": 0.0
        }
    )
    db.add(kb)
    await db.flush()  # Flush to get the KB ID
    
    # Create default collection for this KB
    collection = KBCollection(
        knowledge_base_id=kb.id,
        name=f"kb_{kb.id}_collection",
        settings={}
    )
    db.add(collection)
    
    await db.commit()
    await db.refresh(kb)
    
    # Audit log
    await audit_log(
        db,
        user_id=str(auth_data["token"].id),
        action="create_knowledge_base",
        description=f"Created knowledge base: {kb.name}",
        metadata={
            "knowledge_base_id": str(kb.id),
            "name": kb.name
        }
    )
    
    return KnowledgeBaseResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        created_by=kb.created_by,
        created_at=kb.created_at,
        updated_at=kb.updated_at,
        settings=kb.settings,
        stats=kb.stats or {},
        agent_count=0
    )


@router.get("/{kb_id}")
async def get_knowledge_base(
    kb_id: UUID,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> KnowledgeBaseResponse:
    """Get knowledge base details."""
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # Get agent count
    agent_count = await db.scalar(
        select(func.count()).select_from(AgentKnowledgeBase)
        .where(AgentKnowledgeBase.knowledge_base_id == kb.id)
    )
    
    return KnowledgeBaseResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        created_by=kb.created_by,
        created_at=kb.created_at,
        updated_at=kb.updated_at,
        settings=kb.settings or {},
        stats=kb.stats or {},
        agent_count=agent_count
    )


@router.put("/{kb_id}")
async def update_knowledge_base(
    kb_id: UUID,
    data: KnowledgeBaseUpdate,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> KnowledgeBaseResponse:
    """Update knowledge base."""
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # Check if new name conflicts
    if data.name and data.name != kb.name:
        existing = await db.execute(
            select(KnowledgeBase).where(
                and_(
                    KnowledgeBase.name == data.name,
                    KnowledgeBase.id != kb_id
                )
            )
        )
        if existing.scalar():
            raise HTTPException(status_code=400, detail="Knowledge base with this name already exists")
    
    # Update fields
    if data.name is not None:
        kb.name = data.name
    if data.description is not None:
        kb.description = data.description
    if data.settings is not None:
        # Merge settings instead of replacing
        current_settings = kb.settings or {}
        current_settings.update(data.settings)
        kb.settings = current_settings
    
    await db.commit()
    await db.refresh(kb)
    
    # Audit log
    await audit_log(
        db,
        user_id=str(auth_data["token"].id),
        action="update_knowledge_base",
        description=f"Updated knowledge base: {kb.name}",
        metadata={
            "knowledge_base_id": str(kb.id),
            "changes": data.dict(exclude_unset=True)
        }
    )
    
    # Get agent count
    agent_count = await db.scalar(
        select(func.count()).select_from(AgentKnowledgeBase)
        .where(AgentKnowledgeBase.knowledge_base_id == kb.id)
    )
    
    return KnowledgeBaseResponse(
        id=kb.id,
        name=kb.name,
        description=kb.description,
        created_by=kb.created_by,
        created_at=kb.created_at,
        updated_at=kb.updated_at,
        settings=kb.settings or {},
        stats=kb.stats or {},
        agent_count=agent_count
    )


@router.delete("/{kb_id}")
async def delete_knowledge_base(
    kb_id: UUID,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Delete knowledge base and all its data."""
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # Check if any agents are using this KB
    agent_count = await db.scalar(
        select(func.count()).select_from(AgentKnowledgeBase)
        .where(AgentKnowledgeBase.knowledge_base_id == kb.id)
    )
    
    if agent_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete knowledge base that is attached to {agent_count} agent(s)"
        )
    
    # Delete will cascade to collections, documents, and chunks
    await db.delete(kb)
    await db.commit()
    
    # Audit log
    await audit_log(
        db,
        user_id=str(auth_data["token"].id),
        action="delete_knowledge_base",
        description=f"Deleted knowledge base: {kb.name}",
        metadata={
            "knowledge_base_id": str(kb_id),
            "name": kb.name
        }
    )
    
    return {"detail": "Knowledge base deleted successfully"}


@router.post("/{kb_id}/duplicate")
async def duplicate_knowledge_base(
    kb_id: UUID,
    name: str = Query(..., description="Name for the duplicated knowledge base"),
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> KnowledgeBaseResponse:
    """Duplicate a knowledge base (structure only, not documents)."""
    source_kb = await db.get(KnowledgeBase, kb_id)
    if not source_kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # Check if name already exists
    existing = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.name == name)
    )
    if existing.scalar():
        raise HTTPException(status_code=400, detail="Knowledge base with this name already exists")
    
    # Create new KB with same settings
    new_kb = KnowledgeBase(
        name=name,
        description=f"Copy of {source_kb.description}" if source_kb.description else None,
        created_by=str(auth_data["token"].id),
        settings=source_kb.settings.copy() if source_kb.settings else {}
    )
    db.add(new_kb)
    
    # Create default collection
    collection = KBCollection(
        knowledge_base_id=new_kb.id,
        name=f"kb_{new_kb.id}_collection",
        settings={}
    )
    db.add(collection)
    
    await db.commit()
    await db.refresh(new_kb)
    
    # Audit log
    await audit_log(
        db,
        user_id=str(auth_data["token"].id),
        action="duplicate_knowledge_base",
        description=f"Duplicated knowledge base: {source_kb.name} -> {new_kb.name}",
        metadata={
            "source_kb_id": str(kb_id),
            "new_kb_id": str(new_kb.id),
            "new_name": name
        }
    )
    
    return KnowledgeBaseResponse(
        id=new_kb.id,
        name=new_kb.name,
        description=new_kb.description,
        created_by=new_kb.created_by,
        created_at=new_kb.created_at,
        updated_at=new_kb.updated_at,
        settings=new_kb.settings,
        stats=new_kb.stats or {},
        agent_count=0
    )