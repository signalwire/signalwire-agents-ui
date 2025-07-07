#!/usr/bin/env python3
"""Test script for multi-knowledge base search functionality."""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from backend.skills.knowledge_base_skill import KnowledgeBaseSkill
from backend.services.embedding_service import EmbeddingService
import json

# Database connection
DATABASE_URL = "postgresql+asyncpg://agent_builder:changeme@localhost:5432/agent_builder"

async def test_search_strategies():
    """Test different search strategies for multi-KB search."""
    
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get a test agent ID that has multiple KBs
        from sqlalchemy import text
        result = await session.execute(
            text("""
                SELECT DISTINCT a.id, a.name, COUNT(akb.knowledge_base_id) as kb_count
                FROM agents a
                JOIN agent_knowledge_bases akb ON a.id = akb.agent_id
                GROUP BY a.id, a.name
                HAVING COUNT(akb.knowledge_base_id) > 1
                LIMIT 1
            """)
        )
        agent_data = result.fetchone()
        
        if not agent_data:
            print("No agents with multiple knowledge bases found. Creating test data...")
            # You would need to create test data here
            return
        
        agent_id = str(agent_data.id)
        print(f"Testing with agent: {agent_data.name} (ID: {agent_id}) with {agent_data.kb_count} KBs")
        
        # Create KB skill instance
        kb_skill = KnowledgeBaseSkill(agent_id, session)
        
        # Test queries
        test_queries = [
            "What is the company policy?",
            "How do I reset my password?",
            "Tell me about the product features"
        ]
        
        # Test different strategies
        strategies = ['all', 'round_robin', 'fallback']
        
        for strategy in strategies:
            print(f"\n{'='*60}")
            print(f"Testing {strategy.upper()} strategy")
            print(f"{'='*60}")
            
            # Update agent config to use this strategy
            from sqlalchemy import update
            from backend.models import Agent
            
            await session.execute(
                update(Agent).where(Agent.id == agent_id).values(
                    config=text(f"""
                        jsonb_set(
                            COALESCE(config, '{{}}'),
                            '{{knowledge_base_config}}',
                            '{{"search_strategy": "{strategy}", "similarity_threshold": 0.3, "search_count": 3}}'::jsonb
                        )
                    """)
                )
            )
            await session.commit()
            
            # Test each query
            for query in test_queries:
                print(f"\nQuery: '{query}'")
                try:
                    result = await kb_skill.search_knowledge_base(query, count=3)
                    
                    if result['metadata']['found']:
                        print(f"Found {result['metadata']['result_count']} results")
                        for i, source in enumerate(result['metadata']['sources']):
                            print(f"  {i+1}. KB: {source.get('knowledge_base', 'Legacy')}, "
                                  f"File: {source['filename']}, "
                                  f"Similarity: {source['similarity']}")
                    else:
                        print("  No results found")
                        
                except Exception as e:
                    print(f"  Error: {e}")
            
            # For round_robin, test multiple searches to see rotation
            if strategy == 'round_robin':
                print("\nTesting round-robin rotation:")
                for i in range(5):
                    result = await kb_skill.search_knowledge_base("test query", count=1)
                    if result['metadata']['found'] and result['metadata']['sources']:
                        kb_name = result['metadata']['sources'][0].get('knowledge_base', 'Unknown')
                        print(f"  Search {i+1}: {kb_name}")

if __name__ == "__main__":
    asyncio.run(test_search_strategies())