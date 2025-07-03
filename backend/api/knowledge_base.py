"""Knowledge base API endpoints."""
import logging
import asyncio
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, func
from pydantic import BaseModel

from ..core.database import get_db
from ..core.audit import create_audit_log as audit_log
from ..auth import get_current_user
from ..models import Agent, KBCollection, KBDocument, KBChunk
from ..services.document_storage import DocumentStorage
from ..services.document_processor import DocumentProcessor
from ..services.embedding_service import EmbeddingService

# Import SSE manager - we'll implement this integration later
# from ..core.sse_manager import sse_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agents/{agent_id}/knowledge-base", tags=["knowledge-base"])

# Pydantic models for API
class SearchRequest(BaseModel):
    query: str
    count: int = 3


class SearchResponse(BaseModel):
    answer: str
    metadata: dict


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    file_type: Optional[str]
    uploaded_at: datetime
    status: str
    processing_started_at: Optional[datetime]
    processed_at: Optional[datetime]
    error_message: Optional[str]
    chunk_count: int
    chunks_processed: int
    progress_percentage: int
    document_metadata: dict


class StatusResponse(BaseModel):
    total_documents: int
    completed_documents: int
    processing_documents: int
    failed_documents: int
    total_chunks: int
    storage_size_bytes: int


# Initialize services
document_storage = DocumentStorage()
document_processor = DocumentProcessor()


async def get_agent_and_collection(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> tuple[Agent, Optional[KBCollection]]:
    """Get agent and its knowledge base collection."""
    # Get agent
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Get or create collection
    collection_name = f"agent_{agent_id}_kb"
    result = await db.execute(
        select(KBCollection).where(KBCollection.agent_id == agent_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        # Create collection if it doesn't exist
        collection = KBCollection(
            agent_id=agent_id,
            name=collection_name,
            settings={}
        )
        db.add(collection)
        try:
            await db.commit()
            await db.refresh(collection)
        except Exception:
            # Another request might have created it, try to fetch again
            await db.rollback()
            result = await db.execute(
                select(KBCollection).where(KBCollection.agent_id == agent_id)
            )
            collection = result.scalar_one_or_none()
            if not collection:
                raise HTTPException(status_code=500, detail="Failed to create knowledge base collection")
    
    return agent, collection


@router.post("/upload")
async def upload_documents(
    agent_id: UUID,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Upload documents to the knowledge base."""
    logger.info(f"Upload request for agent {agent_id} with {len(files)} files")
    
    try:
        agent, collection = await get_agent_and_collection(agent_id, db, current_user)
    except Exception as e:
        logger.error(f"Failed to get agent/collection: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get agent/collection: {str(e)}")
    
    # Check if knowledge base is enabled
    if not agent.config.get("knowledge_base", {}).get("enabled", False):
        logger.warning(f"Knowledge base not enabled for agent {agent_id}")
        raise HTTPException(
            status_code=400,
            detail="Knowledge base is not enabled for this agent"
        )
    
    uploaded_documents = []
    
    for file in files:
        try:
            # Store file
            file_path, file_hash = await document_storage.store_file(file, str(agent_id))
            file_size = await document_storage.get_file_size(file_path)
            
            # Check for duplicate
            existing = await db.execute(
                select(KBDocument).where(KBDocument.file_hash == file_hash)
            )
            if existing.scalar():
                raise HTTPException(
                    status_code=400,
                    detail=f"File {file.filename} already exists in knowledge base"
                )
            
            # Create document record
            document = KBDocument(
                collection_id=collection.id,
                filename=file.filename,
                file_path=file_path,
                file_type=file.content_type,
                file_size=file_size,
                file_hash=file_hash,
                status='pending',
                document_metadata={}
            )
            db.add(document)
            await db.commit()
            await db.refresh(document)
            
            # Queue for background processing
            background_tasks.add_task(
                process_document_task,
                str(document.id),
                file_path,
                str(agent_id),
                str(collection.id)
            )
            
            uploaded_documents.append({
                "id": str(document.id),
                "filename": document.filename,
                "status": "queued"
            })
            
            # Audit log
            await audit_log(
                db,
                user_id=current_user["id"],
                action="upload_kb_document",
                description=f"Uploaded {file.filename} to agent {agent.name} knowledge base",
                metadata={
                    "agent_id": str(agent_id),
                    "document_id": str(document.id),
                    "filename": file.filename,
                    "file_size": file_size
                }
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to upload file {file.filename}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload {file.filename}: {str(e)}"
            )
    
    return {
        "uploaded": len(uploaded_documents),
        "documents": uploaded_documents
    }


@router.get("/documents")
async def list_documents(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """List all documents in the knowledge base."""
    agent, collection = await get_agent_and_collection(agent_id, db, current_user)
    
    if not collection:
        return {"documents": []}
    
    # Get all documents
    result = await db.execute(
        select(KBDocument)
        .where(KBDocument.collection_id == collection.id)
        .order_by(KBDocument.uploaded_at.desc())
    )
    documents = result.scalars().all()
    
    # Format response
    document_list = []
    for doc in documents:
        progress = 0
        if doc.chunk_count > 0:
            progress = int((doc.chunks_processed / doc.chunk_count) * 100)
        
        document_list.append(DocumentResponse(
            id=str(doc.id),
            filename=doc.filename,
            file_size=doc.file_size or 0,
            file_type=doc.file_type,
            uploaded_at=doc.uploaded_at,
            status=doc.status,
            processing_started_at=doc.processing_started_at,
            processed_at=doc.processed_at,
            error_message=doc.error_message,
            chunk_count=doc.chunk_count,
            chunks_processed=doc.chunks_processed,
            progress_percentage=progress,
            document_metadata=doc.document_metadata or {}
        ))
    
    return {"documents": document_list}


@router.get("/documents/{document_id}")
async def get_document(
    agent_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> DocumentResponse:
    """Get single document details."""
    agent, collection = await get_agent_and_collection(agent_id, db, current_user)
    
    # Get document
    result = await db.execute(
        select(KBDocument)
        .where(and_(
            KBDocument.id == document_id,
            KBDocument.collection_id == collection.id
        ))
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    progress = 0
    if document.chunk_count > 0:
        progress = int((document.chunks_processed / document.chunk_count) * 100)
    
    return DocumentResponse(
        id=str(document.id),
        filename=document.filename,
        file_size=document.file_size or 0,
        file_type=document.file_type,
        uploaded_at=document.uploaded_at,
        status=document.status,
        processing_started_at=document.processing_started_at,
        processed_at=document.processed_at,
        error_message=document.error_message,
        chunk_count=document.chunk_count,
        chunks_processed=document.chunks_processed,
        progress_percentage=progress,
        document_metadata=document.document_metadata or {}
    )


@router.delete("/documents/{document_id}")
async def delete_document(
    agent_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete document from knowledge base."""
    agent, collection = await get_agent_and_collection(agent_id, db, current_user)
    
    # Get document
    result = await db.execute(
        select(KBDocument)
        .where(and_(
            KBDocument.id == document_id,
            KBDocument.collection_id == collection.id
        ))
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from storage
    try:
        await document_storage.delete_file(document.file_path)
    except Exception as e:
        logger.error(f"Failed to delete file from storage: {e}")
    
    # Delete from database (cascades to chunks)
    await db.delete(document)
    await db.commit()
    
    # Audit log
    await audit_log(
        db,
        user_id=current_user["id"],
        action="delete_kb_document",
        description=f"Deleted {document.filename} from agent {agent.name} knowledge base",
        metadata={
            "agent_id": str(agent_id),
            "document_id": str(document_id),
            "filename": document.filename
        }
    )
    
    return {"message": "Document deleted successfully"}


@router.get("/documents/{document_id}/download")
async def download_document(
    agent_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Download original document file."""
    agent, collection = await get_agent_and_collection(agent_id, db, current_user)
    
    # Get document
    result = await db.execute(
        select(KBDocument)
        .where(and_(
            KBDocument.id == document_id,
            KBDocument.collection_id == collection.id
        ))
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if file exists
    if not await document_storage.file_exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=document.file_path,
        filename=document.filename,
        media_type=document.file_type or 'application/octet-stream'
    )


@router.post("/documents/{document_id}/retry")
async def retry_processing(
    agent_id: UUID,
    document_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retry processing for failed documents."""
    agent, collection = await get_agent_and_collection(agent_id, db, current_user)
    
    # Get document
    result = await db.execute(
        select(KBDocument)
        .where(and_(
            KBDocument.id == document_id,
            KBDocument.collection_id == collection.id
        ))
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.status not in ['failed', 'pending']:
        raise HTTPException(
            status_code=400,
            detail="Can only retry failed or pending documents"
        )
    
    # Reset status
    document.status = 'pending'
    document.error_message = None
    document.chunks_processed = 0
    await db.commit()
    
    # Queue for processing
    background_tasks.add_task(
        process_document_task,
        str(document.id),
        document.file_path,
        str(agent_id),
        str(collection.id)
    )
    
    return {"message": "Document queued for reprocessing"}


@router.post("/search")
async def search_knowledge_base(
    agent_id: UUID,
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> SearchResponse:
    """Search the knowledge base."""
    agent, collection = await get_agent_and_collection(agent_id, db, current_user)
    
    # Check if knowledge base is enabled
    if not agent.config.get("knowledge_base", {}).get("enabled", False):
        raise HTTPException(
            status_code=400,
            detail="Knowledge base is not enabled for this agent"
        )
    
    # Use the knowledge base skill
    from ..skills.knowledge_base_skill import KnowledgeBaseSkill
    kb_skill = KnowledgeBaseSkill(str(agent_id), db)
    
    # Perform search
    result = await kb_skill.search_knowledge_base(
        query=request.query,
        count=request.count,
        similarity_threshold=agent.config.get("knowledge_base", {}).get("similarity_threshold", 0.0)
    )
    
    return SearchResponse(
        answer=result["answer"],
        metadata=result.get("metadata", {})
    )


@router.get("/status")
async def get_knowledge_base_status(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> StatusResponse:
    """Get overall knowledge base status."""
    agent, collection = await get_agent_and_collection(agent_id, db, current_user)
    
    if not collection:
        return StatusResponse(
            total_documents=0,
            completed_documents=0,
            processing_documents=0,
            failed_documents=0,
            total_chunks=0,
            storage_size_bytes=0
        )
    
    # Get document counts by status
    status_counts = await db.execute(
        select(
            KBDocument.status,
            func.count(KBDocument.id).label('count'),
            func.sum(KBDocument.file_size).label('total_size')
        )
        .where(KBDocument.collection_id == collection.id)
        .group_by(KBDocument.status)
    )
    
    counts = {row.status: (row.count, row.total_size or 0) for row in status_counts}
    
    # Get total chunks
    chunk_count = await db.execute(
        select(func.count(KBChunk.id))
        .join(KBDocument)
        .where(KBDocument.collection_id == collection.id)
    )
    total_chunks = chunk_count.scalar() or 0
    
    return StatusResponse(
        total_documents=sum(count for count, _ in counts.values()),
        completed_documents=counts.get('completed', (0, 0))[0],
        processing_documents=counts.get('processing', (0, 0))[0],
        failed_documents=counts.get('failed', (0, 0))[0],
        total_chunks=total_chunks,
        storage_size_bytes=sum(size for _, size in counts.values())
    )


async def process_document_task(
    document_id: str,
    file_path: str,
    agent_id: str,
    collection_id: str
):
    """Background task to process a document."""
    from ..core.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        try:
            # TODO: Implement SSE callback when SSE manager is available
            await document_processor.process_document(
                file_path=file_path,
                document_id=document_id,
                agent_id=agent_id,
                db=db,
                sse_callback=None  # Will implement SSE integration later
            )
        except Exception as e:
            logger.error(f"Failed to process document {document_id}: {e}")