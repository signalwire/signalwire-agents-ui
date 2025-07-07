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
        self.collection_name = f"agent_{agent_id}_kb"  # Legacy support
        self.db_session = db_session
        self.embedding_service = EmbeddingService()
        self.collection_id = None  # Can be overridden for direct collection search
        self.search_count = 0  # Track searches for round-robin
        
    async def search_collection(
        self,
        query: str,
        count: int = 3,
        similarity_threshold: float = 0.0
    ) -> Dict[str, Any]:
        """Search a specific collection by ID (used for new standalone KBs)."""
        try:
            # Generate query embedding
            query_embedding = self.embedding_service.encode(query)[0]
            
            # Perform vector similarity search
            results = await self.db_session.execute(
                text("""
                    SELECT 
                        c.content,
                        c.document_metadata,
                        d.filename,
                        d.id as document_id,
                        1 - (c.embedding <=> CAST(:query_embedding AS vector)) as similarity
                    FROM kb_chunks c
                    JOIN kb_documents d ON c.document_id = d.id
                    WHERE d.collection_id = :collection_id
                        AND d.status = 'completed'
                        AND (1 - (c.embedding <=> CAST(:query_embedding AS vector))) >= :similarity_threshold
                    ORDER BY c.embedding <=> CAST(:query_embedding AS vector)
                    LIMIT :limit
                """),
                {
                    "query_embedding": str(query_embedding.tolist()),
                    "collection_id": self.collection_id,
                    "similarity_threshold": similarity_threshold,
                    "limit": count
                }
            )
            
            # Fetch results
            chunks = results.fetchall()
            
            return self._format_search_results(chunks, query)
            
        except Exception as e:
            logger.error(f"Error searching collection {self.collection_id}: {e}")
            return {
                "answer": "I encountered an error while searching the knowledge base. Please try again.",
                "metadata": {
                    "error": str(e),
                    "query": query
                }
            }
        
    async def get_agent_kb_config(self) -> Dict[str, Any]:
        """Get the agent's knowledge base configuration."""
        from sqlalchemy import select
        from ..models import Agent
        
        result = await self.db_session.execute(
            select(Agent.config).where(Agent.id == self.agent_id)
        )
        agent_config = result.scalar_one_or_none()
        
        if agent_config and agent_config.get('knowledge_base_config'):
            return agent_config['knowledge_base_config']
        
        # Default config
        return {
            'search_strategy': 'all',
            'similarity_threshold': 0.0,
            'search_count': 3
        }
    
    async def search_specific_knowledge_base(
        self,
        kb_id: str,
        query: str,
        count: int = 3,
        response_prefix: str = "",
        response_postfix: str = "",
        no_results_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Search a specific knowledge base by ID with custom formatting."""
        try:
            # Get the collection for this KB
            from sqlalchemy import select
            from ..models import KBCollection
            
            result = await self.db_session.execute(
                select(KBCollection.id).where(KBCollection.knowledge_base_id == kb_id)
            )
            collection_id = result.scalar_one_or_none()
            
            if not collection_id:
                return {
                    "answer": "Knowledge base not found.",
                    "metadata": {"error": "kb_not_found", "kb_id": kb_id}
                }
            
            # Search the specific collection
            self.collection_id = collection_id
            search_result = await self.search_collection(query, count)
            
            # Format the response with custom prefix/postfix
            if search_result["metadata"].get("found", False):
                answer = search_result["answer"]
                # Format with prefix/postfix similar to native_vector_search
                response_parts = []
                if response_prefix:
                    response_parts.append(response_prefix)
                response_parts.append(answer)
                if response_postfix:
                    response_parts.append(response_postfix)
                search_result["answer"] = "\n\n".join(response_parts)
            else:
                # No results - use custom message with prefix/postfix
                no_results_msg = no_results_message.format(query=query) if no_results_message else f"No information found for '{query}'"
                if response_prefix:
                    no_results_msg = f"{response_prefix} {no_results_msg}"
                if response_postfix:
                    no_results_msg = f"{no_results_msg} {response_postfix}"
                search_result["answer"] = no_results_msg
            
            return search_result
            
        except Exception as e:
            logger.error(f"Error searching specific knowledge base: {e}")
            return {
                "answer": f"Error searching knowledge base: {str(e)}",
                "metadata": {"error": str(e)}
            }
    
    async def search_knowledge_base(
        self, 
        query: str, 
        count: int = 3,
        similarity_threshold: float = 0.0
    ) -> Dict[str, Any]:
        """
        Search the agent's knowledge bases (supports both legacy and new multi-KB approach).
        
        Args:
            query: Search query text
            count: Number of results to return
            similarity_threshold: Minimum similarity score (0-1)
            
        Returns:
            Dictionary with answer and metadata
        """
        try:
            # Get agent's KB configuration
            kb_config = await self.get_agent_kb_config()
            search_strategy = kb_config.get('search_strategy', 'all')
            config_threshold = kb_config.get('similarity_threshold', similarity_threshold)
            config_count = kb_config.get('search_count', count)
            
            # Use config values if not overridden
            similarity_threshold = config_threshold
            count = config_count
            
            # Check if agent has new-style knowledge bases
            from sqlalchemy import select
            from ..models import AgentKnowledgeBase, KnowledgeBase, KBCollection
            
            result = await self.db_session.execute(
                select(KBCollection.id, KnowledgeBase.name)
                .join(KnowledgeBase, KBCollection.knowledge_base_id == KnowledgeBase.id)
                .join(AgentKnowledgeBase, AgentKnowledgeBase.knowledge_base_id == KnowledgeBase.id)
                .where(AgentKnowledgeBase.agent_id == self.agent_id)
                .order_by(AgentKnowledgeBase.created_at)  # Order for consistent round-robin/fallback
            )
            kb_data = result.fetchall()
            collection_ids = [row[0] for row in kb_data]
            kb_names = {row[0]: row[1] for row in kb_data}
            
            # Generate query embedding
            query_embedding = self.embedding_service.encode(query)[0]
            
            if collection_ids:
                # New approach with search strategies
                if search_strategy == 'all':
                    # Search all KBs and combine results
                    results = await self._search_all_strategy(
                        query_embedding, collection_ids, kb_names, 
                        similarity_threshold, count
                    )
                elif search_strategy == 'round_robin':
                    # Search one KB at a time in rotation
                    results = await self._search_round_robin_strategy(
                        query_embedding, collection_ids, kb_names,
                        similarity_threshold, count
                    )
                elif search_strategy == 'fallback':
                    # Search KBs in order until results found
                    results = await self._search_fallback_strategy(
                        query_embedding, collection_ids, kb_names,
                        similarity_threshold, count
                    )
                else:
                    # Default to 'all' strategy
                    results = await self._search_all_strategy(
                        query_embedding, collection_ids, kb_names,
                        similarity_threshold, count
                    )
                
                return self._format_search_results(results, query)
            else:
                # Legacy approach: search by collection name
                results = await self.db_session.execute(
                    text("""
                        SELECT 
                            c.content,
                            c.document_metadata,
                            d.filename,
                            d.id as document_id,
                            col.name as kb_name,
                            1 - (c.embedding <=> CAST(:query_embedding AS vector)) as similarity
                        FROM kb_chunks c
                        JOIN kb_documents d ON c.document_id = d.id
                        JOIN kb_collections col ON d.collection_id = col.id
                        WHERE col.name = :collection_name
                            AND d.status = 'completed'
                            AND (1 - (c.embedding <=> CAST(:query_embedding AS vector))) >= :similarity_threshold
                        ORDER BY c.embedding <=> CAST(:query_embedding AS vector)
                        LIMIT :limit
                    """),
                    {
                        "query_embedding": str(query_embedding.tolist()),
                        "collection_name": self.collection_name,
                        "similarity_threshold": similarity_threshold,
                        "limit": count
                    }
                )
                
                # Fetch results
                chunks = results.fetchall()
                
                return self._format_search_results(chunks, query)
            
        except Exception as e:
            logger.error(f"Error searching knowledge base for agent {self.agent_id}: {e}")
            return {
                "answer": "I encountered an error while searching the knowledge base. Please try again.",
                "metadata": {
                    "error": str(e),
                    "query": query
                }
            }
    
    async def _search_all_strategy(
        self, query_embedding: Any, collection_ids: List[Any], 
        kb_names: Dict[Any, str], similarity_threshold: float, count: int
    ) -> List[Any]:
        """Search all knowledge bases and combine results by similarity."""
        results = await self.db_session.execute(
            text("""
                SELECT 
                    c.content,
                    c.document_metadata,
                    d.filename,
                    d.id as document_id,
                    col.id as collection_id,
                    1 - (c.embedding <=> CAST(:query_embedding AS vector)) as similarity
                FROM kb_chunks c
                JOIN kb_documents d ON c.document_id = d.id
                JOIN kb_collections col ON d.collection_id = col.id
                WHERE col.id = ANY(:collection_ids)
                    AND d.status = 'completed'
                    AND (1 - (c.embedding <=> CAST(:query_embedding AS vector))) >= :similarity_threshold
                ORDER BY c.embedding <=> CAST(:query_embedding AS vector)
                LIMIT :limit
            """),
            {
                "query_embedding": str(query_embedding.tolist()),
                "collection_ids": collection_ids,
                "similarity_threshold": similarity_threshold,
                "limit": count
            }
        )
        
        # Add KB names to results
        chunks = []
        for row in results.fetchall():
            chunk = {
                'content': row.content,
                'document_metadata': row.document_metadata,
                'filename': row.filename,
                'document_id': row.document_id,
                'similarity': row.similarity,
                'kb_name': kb_names.get(row.collection_id, 'Unknown KB')
            }
            chunks.append(type('Chunk', (), chunk))
        
        return chunks
    
    async def _search_round_robin_strategy(
        self, query_embedding: Any, collection_ids: List[Any],
        kb_names: Dict[Any, str], similarity_threshold: float, count: int
    ) -> List[Any]:
        """Search one KB at a time in rotation."""
        # Select which KB to search based on search count
        kb_index = self.search_count % len(collection_ids)
        selected_collection_id = collection_ids[kb_index]
        self.search_count += 1
        
        results = await self.db_session.execute(
            text("""
                SELECT 
                    c.content,
                    c.document_metadata,
                    d.filename,
                    d.id as document_id,
                    1 - (c.embedding <=> CAST(:query_embedding AS vector)) as similarity
                FROM kb_chunks c
                JOIN kb_documents d ON c.document_id = d.id
                WHERE d.collection_id = :collection_id
                    AND d.status = 'completed'
                    AND (1 - (c.embedding <=> CAST(:query_embedding AS vector))) >= :similarity_threshold
                ORDER BY c.embedding <=> CAST(:query_embedding AS vector)
                LIMIT :limit
            """),
            {
                "query_embedding": str(query_embedding.tolist()),
                "collection_id": selected_collection_id,
                "similarity_threshold": similarity_threshold,
                "limit": count
            }
        )
        
        # Add KB name to results
        chunks = []
        kb_name = kb_names.get(selected_collection_id, 'Unknown KB')
        for row in results.fetchall():
            chunk = {
                'content': row.content,
                'document_metadata': row.document_metadata,
                'filename': row.filename,
                'document_id': row.document_id,
                'similarity': row.similarity,
                'kb_name': kb_name
            }
            chunks.append(type('Chunk', (), chunk))
        
        return chunks
    
    async def _search_fallback_strategy(
        self, query_embedding: Any, collection_ids: List[Any],
        kb_names: Dict[Any, str], similarity_threshold: float, count: int
    ) -> List[Any]:
        """Search KBs in order until results are found."""
        for collection_id in collection_ids:
            results = await self.db_session.execute(
                text("""
                    SELECT 
                        c.content,
                        c.document_metadata,
                        d.filename,
                        d.id as document_id,
                        1 - (c.embedding <=> CAST(:query_embedding AS vector)) as similarity
                    FROM kb_chunks c
                    JOIN kb_documents d ON c.document_id = d.id
                    WHERE d.collection_id = :collection_id
                        AND d.status = 'completed'
                        AND (1 - (c.embedding <=> CAST(:query_embedding AS vector))) >= :similarity_threshold
                    ORDER BY c.embedding <=> CAST(:query_embedding AS vector)
                    LIMIT :limit
                """),
                {
                    "query_embedding": str(query_embedding.tolist()),
                    "collection_id": collection_id,
                    "similarity_threshold": similarity_threshold,
                    "limit": count
                }
            )
            
            chunks = []
            kb_name = kb_names.get(collection_id, 'Unknown KB')
            for row in results.fetchall():
                chunk = {
                    'content': row.content,
                    'document_metadata': row.document_metadata,
                    'filename': row.filename,
                    'document_id': row.document_id,
                    'similarity': row.similarity,
                    'kb_name': kb_name
                }
                chunks.append(type('Chunk', (), chunk))
            
            # If we found results, return them
            if chunks:
                return chunks
        
        # No results found in any KB
        return []
    
    def _format_search_results(self, chunks: List[Any], query: str) -> Dict[str, Any]:
        """Format search results into a response."""
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
            source_info = {
                "filename": chunk.filename,
                "document_id": str(chunk.document_id),
                "similarity": round(chunk.similarity, 3),
                "metadata": chunk.document_metadata or {}
            }
            # Add KB name if available
            if hasattr(chunk, 'kb_name'):
                source_info["knowledge_base"] = chunk.kb_name
            sources.append(source_info)
        
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