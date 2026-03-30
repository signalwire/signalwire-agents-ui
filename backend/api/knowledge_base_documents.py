"""Knowledge Base document management API endpoints."""
import logging
import asyncio
from typing import List, Optional, Dict, Any
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
from ..core.security import verify_jwt_token
from ..models import KnowledgeBase, KBCollection, KBDocument, KBChunk
from ..services.document_storage import DocumentStorage
from ..services.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/knowledge-bases/{kb_id}", tags=["knowledge_base_documents"])

# Initialize services
document_storage = DocumentStorage()
document_processor = DocumentProcessor()


class DocumentResponse(BaseModel):
    id: UUID
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
    progress_percentage: float
    document_metadata: dict


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class SearchRequest(BaseModel):
    query: str
    count: int = 3


class SearchResponse(BaseModel):
    answer: str
    metadata: dict


async def get_knowledge_base_and_collection(
    kb_id: UUID,
    db: AsyncSession,
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> tuple[KnowledgeBase, KBCollection]:
    """Get knowledge base and its collection."""
    # Get knowledge base
    kb = await db.get(KnowledgeBase, kb_id)
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base not found")
    
    # Get collection
    result = await db.execute(
        select(KBCollection).where(KBCollection.knowledge_base_id == kb_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(status_code=500, detail="Knowledge base collection not found")
    
    return kb, collection


@router.post("/documents/upload")
async def upload_documents(
    kb_id: UUID,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Upload documents to the knowledge base."""
    logger.info(f"Upload request for knowledge base {kb_id} with {len(files)} files")
    
    kb, collection = await get_knowledge_base_and_collection(kb_id, db, auth_data)
    
    uploaded_documents = []
    
    for file in files:
        try:
            # Store file
            file_path, file_hash = await document_storage.store_file(file, str(kb_id))
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
                str(kb_id),
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
                user_id=str(auth_data["token"].id),
                action="upload_kb_document",
                description=f"Uploaded {file.filename} to knowledge base {kb.name}",
                metadata={
                    "knowledge_base_id": str(kb_id),
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
    
    # Update knowledge base stats
    await update_kb_stats(kb_id, db)
    
    return {
        "uploaded": len(uploaded_documents),
        "documents": uploaded_documents
    }


@router.get("/documents")
async def list_documents(
    kb_id: UUID,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> DocumentListResponse:
    """List all documents in the knowledge base."""
    kb, collection = await get_knowledge_base_and_collection(kb_id, db, auth_data)
    
    # Get documents
    result = await db.execute(
        select(KBDocument)
        .where(KBDocument.collection_id == collection.id)
        .order_by(KBDocument.uploaded_at.desc())
    )
    documents = result.scalars().all()
    
    # Convert to response format
    doc_responses = []
    for doc in documents:
        progress = 0
        if doc.chunk_count > 0:
            progress = (doc.chunks_processed / doc.chunk_count) * 100
        
        doc_responses.append(DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            file_size=doc.file_size,
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
    
    return DocumentListResponse(
        documents=doc_responses,
        total=len(doc_responses)
    )


@router.delete("/documents/{document_id}")
async def delete_document(
    kb_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Delete a document and all its chunks."""
    kb, collection = await get_knowledge_base_and_collection(kb_id, db, auth_data)
    
    # Get document
    document = await db.get(KBDocument, document_id)
    if not document or document.collection_id != collection.id:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file from storage
    try:
        await document_storage.delete_file(document.file_path)
    except Exception as e:
        logger.warning(f"Failed to delete file {document.file_path}: {e}")
    
    # Delete from database (chunks will cascade)
    await db.delete(document)
    await db.commit()
    
    # Update stats
    await update_kb_stats(kb_id, db)
    
    # Audit log
    await audit_log(
        db,
        user_id=str(auth_data["token"].id),
        action="delete_kb_document",
        description=f"Deleted document {document.filename} from knowledge base {kb.name}",
        metadata={
            "knowledge_base_id": str(kb_id),
            "document_id": str(document_id),
            "filename": document.filename
        }
    )
    
    return {"detail": "Document deleted successfully"}


@router.get("/documents/{document_id}/download")
async def download_document(
    kb_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Download the original document file."""
    kb, collection = await get_knowledge_base_and_collection(kb_id, db, auth_data)
    
    # Get document
    document = await db.get(KBDocument, document_id)
    if not document or document.collection_id != collection.id:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check if file exists
    if not Path(document.file_path).exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=document.file_path,
        filename=document.filename,
        media_type=document.file_type or 'application/octet-stream'
    )


@router.post("/documents/{document_id}/retry")
async def retry_document_processing(
    kb_id: UUID,
    document_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
):
    """Retry processing a failed document."""
    kb, collection = await get_knowledge_base_and_collection(kb_id, db, auth_data)
    
    # Get document
    document = await db.get(KBDocument, document_id)
    if not document or document.collection_id != collection.id:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.status not in ['failed', 'completed']:
        raise HTTPException(
            status_code=400,
            detail="Can only retry failed or completed documents"
        )
    
    # Reset status
    document.status = 'pending'
    document.error_message = None
    document.chunks_processed = 0
    document.processing_started_at = None
    document.processed_at = None
    
    # Delete existing chunks
    from sqlalchemy import delete
    await db.execute(
        delete(KBChunk)
        .where(KBChunk.document_id == document_id)
    )
    
    await db.commit()
    
    # Queue for reprocessing
    background_tasks.add_task(
        process_document_task,
        str(document.id),
        document.file_path,
        str(kb_id),
        str(collection.id)
    )
    
    return {"detail": "Document queued for reprocessing"}


@router.post("/search")
async def search_knowledge_base(
    kb_id: UUID,
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
    auth_data: Dict[str, Any] = Depends(verify_jwt_token)
) -> SearchResponse:
    """Search the knowledge base."""
    from ..skills.knowledge_base_skill import KnowledgeBaseSkill
    
    kb, collection = await get_knowledge_base_and_collection(kb_id, db, auth_data)
    
    # Use the knowledge base skill to search
    kb_skill = KnowledgeBaseSkill(None, db)  # We don't need agent_id for direct search
    
    # Override the collection search
    kb_skill.collection_id = collection.id
    
    result = await kb_skill.search_collection(
        query=request.query,
        count=request.count,
        similarity_threshold=kb.settings.get('similarity_threshold', 0.0)
    )
    
    return SearchResponse(
        answer=result.get("answer", "No relevant information found."),
        metadata=result.get("metadata", {})
    )


async def process_document_task(
    document_id: str,
    file_path: str,
    kb_id: str,
    collection_id: str
):
    """Background task to process a document."""
    from ..core.database import AsyncSessionLocal
    from ..models import KnowledgeBase
    
    async with AsyncSessionLocal() as db:
        try:
            # Get KB settings
            kb = await db.get(KnowledgeBase, UUID(kb_id))
            if not kb:
                raise ValueError(f"Knowledge base {kb_id} not found")
            
            # Extract chunking settings
            settings = kb.settings or {}
            
            # Create a document processor with the appropriate settings
            processor = DocumentProcessor(
                chunk_size=settings.get('chunk_size', 512),
                chunk_overlap=settings.get('chunk_overlap', 100)
            )
            
            # Update chunking parameters based on strategy
            processor.chunking_strategy = settings.get('chunking_strategy', 'sentence')
            processor.max_sentences_per_chunk = settings.get('max_sentences_per_chunk', 5)
            processor.split_newlines = settings.get('split_newlines', 0)
            processor.semantic_threshold = settings.get('semantic_threshold', 0.5)
            processor.topic_threshold = settings.get('topic_threshold', 0.3)
            
            # Process the document - this method handles everything including status updates
            await processor.process_document(
                file_path=file_path,
                document_id=document_id,
                agent_id=kb_id,  # Using kb_id as agent_id for SSE updates
                db=db,
                sse_callback=None  # No SSE callback for background tasks
            )
            
            # Update KB stats after processing
            await update_kb_stats(UUID(kb_id), db)
            
        except Exception as e:
            logger.error(f"Failed to process document {document_id}: {e}")
            await db.execute(
                update(KBDocument)
                .where(KBDocument.id == UUID(document_id))
                .values({
                    "status": "failed",
                    "error_message": str(e)
                })
            )
            await db.commit()


async def update_kb_stats(kb_id: UUID, db: AsyncSession):
    """Update knowledge base statistics."""
    # Get stats
    doc_count = await db.scalar(
        select(func.count())
        .select_from(KBDocument)
        .join(KBCollection)
        .where(KBCollection.knowledge_base_id == kb_id)
    )
    
    chunk_count = await db.scalar(
        select(func.count())
        .select_from(KBChunk)
        .join(KBDocument)
        .join(KBCollection)
        .where(KBCollection.knowledge_base_id == kb_id)
    )
    
    storage_size = await db.scalar(
        select(func.sum(KBDocument.file_size))
        .select_from(KBDocument)
        .join(KBCollection)
        .where(KBCollection.knowledge_base_id == kb_id)
    ) or 0
    
    # Update KB stats
    await db.execute(
        update(KnowledgeBase)
        .where(KnowledgeBase.id == kb_id)
        .values({
            "stats": {
                "total_documents": doc_count,
                "total_chunks": chunk_count,
                "storage_size_bytes": storage_size
            }
        })
    )
    await db.commit()