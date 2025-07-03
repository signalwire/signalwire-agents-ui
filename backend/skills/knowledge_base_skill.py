"""Internal knowledge base skill for searching agent-specific knowledge."""
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import numpy as np

from ..services.embedding_service import EmbeddingService
from ..models import KBCollection, KBDocument, KBChunk

logger = logging.getLogger(__name__)


class KnowledgeBaseSkill:
    """Internal skill for searching agent-specific knowledge bases."""
    
    def __init__(self, agent_id: str, db_session: AsyncSession):
        self.agent_id = agent_id
        self.collection_name = f"agent_{agent_id}_kb"
        self.db_session = db_session
        self.embedding_service = EmbeddingService()
        
    async def search_knowledge_base(
        self, 
        query: str, 
        count: int = 3,
        similarity_threshold: float = 0.0
    ) -> Dict[str, Any]:
        """
        Search the agent's knowledge base.
        
        Args:
            query: Search query text
            count: Number of results to return
            similarity_threshold: Minimum similarity score (0-1)
            
        Returns:
            Dictionary with answer and metadata
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_service.encode(query)[0]  # Get first (and only) embedding
            
            # Perform vector similarity search
            results = await self.db_session.execute(
                text("""
                    SELECT 
                        c.content,
                        c.document_metadata,
                        d.filename,
                        d.id as document_id,
                        1 - (c.embedding <=> :query_embedding::vector) as similarity
                    FROM kb_chunks c
                    JOIN kb_documents d ON c.document_id = d.id
                    JOIN kb_collections col ON d.collection_id = col.id
                    WHERE col.name = :collection_name
                        AND d.status = 'completed'
                        AND (1 - (c.embedding <=> :query_embedding::vector)) >= :similarity_threshold
                    ORDER BY c.embedding <=> :query_embedding::vector
                    LIMIT :limit
                """),
                {
                    "query_embedding": query_embedding.tolist(),
                    "collection_name": self.collection_name,
                    "similarity_threshold": similarity_threshold,
                    "limit": count
                }
            )
            
            # Fetch results
            chunks = results.fetchall()
            
            if not chunks:
                return {
                    "answer": "I couldn't find any relevant information in the knowledge base for your query.",
                    "metadata": {
                        "found": False,
                        "query": query,
                        "sources": []
                    }
                }
            
            # Format results
            formatted_chunks = []
            sources = []
            
            for chunk in chunks:
                formatted_chunks.append(chunk.content)
                sources.append({
                    "filename": chunk.filename,
                    "document_id": str(chunk.document_id),
                    "similarity": round(chunk.similarity, 3),
                    "metadata": chunk.document_metadata or {}
                })
            
            # Combine chunks into a coherent answer
            if len(formatted_chunks) == 1:
                answer = f"Based on the knowledge base:\n\n{formatted_chunks[0]}"
            else:
                answer = "Based on the knowledge base, here's what I found:\n\n"
                for i, chunk_content in enumerate(formatted_chunks, 1):
                    answer += f"{i}. {chunk_content}\n\n"
            
            return {
                "answer": answer.strip(),
                "metadata": {
                    "found": True,
                    "query": query,
                    "sources": sources,
                    "similarity_scores": [s["similarity"] for s in sources],
                    "result_count": len(chunks)
                }
            }
            
        except Exception as e:
            logger.error(f"Error searching knowledge base for agent {self.agent_id}: {e}")
            return {
                "answer": "I encountered an error while searching the knowledge base. Please try again.",
                "metadata": {
                    "error": str(e),
                    "query": query
                }
            }
    
    async def check_collection_exists(self) -> bool:
        """Check if the knowledge base collection exists for this agent."""
        result = await self.db_session.execute(
            text("SELECT 1 FROM kb_collections WHERE name = :name"),
            {"name": self.collection_name}
        )
        return result.scalar() is not None
    
    async def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the knowledge base collection."""
        stats_result = await self.db_session.execute(
            text("""
                SELECT 
                    COUNT(DISTINCT d.id) as document_count,
                    COUNT(c.id) as chunk_count,
                    SUM(d.file_size) as total_size
                FROM kb_collections col
                LEFT JOIN kb_documents d ON d.collection_id = col.id
                LEFT JOIN kb_chunks c ON c.document_id = d.id
                WHERE col.name = :collection_name
                    AND d.status = 'completed'
            """),
            {"collection_name": self.collection_name}
        )
        
        stats = stats_result.fetchone()
        return {
            "document_count": stats.document_count or 0,
            "chunk_count": stats.chunk_count or 0,
            "total_size_bytes": stats.total_size or 0
        }