# Knowledge Base Phase 2: Standalone Knowledge Bases

## Overview

Refactor the knowledge base feature to make knowledge bases first-class entities that exist independently of agents. This solves the current UX issues where users must save agents before uploading documents and provides better reusability across multiple agents.

## Architecture Changes

### Current Architecture (Phase 1)
- Knowledge bases are embedded within agent configurations
- Each agent has its own dedicated knowledge base
- Must enable KB in agent config before uploading documents
- KB data is tied to agent lifecycle

### New Architecture (Phase 2)
- Knowledge bases are standalone entities
- Created and managed independently of agents
- Agents can reference one or more knowledge bases
- KB content can be shared across multiple agents

## Database Schema

### New Tables

```sql
-- Drop the current kb_collections name constraint since we'll use UUIDs
ALTER TABLE kb_collections DROP CONSTRAINT IF EXISTS kb_collections_name_key;

-- Standalone knowledge bases
CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{
        "chunk_size": 512,
        "chunk_overlap": 100,
        "search_count": 3,
        "similarity_threshold": 0.0
    }'::jsonb,
    stats JSONB DEFAULT '{
        "total_documents": 0,
        "total_chunks": 0,
        "storage_size_bytes": 0
    }'::jsonb
);

-- Many-to-many relationship between agents and knowledge bases
CREATE TABLE agent_knowledge_bases (
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    attached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attached_by UUID REFERENCES users(id),
    config JSONB DEFAULT '{}', -- Override settings per agent if needed
    PRIMARY KEY (agent_id, knowledge_base_id)
);

-- Update kb_collections to reference knowledge_bases instead of agents
ALTER TABLE kb_collections 
    DROP COLUMN IF EXISTS agent_id,
    ADD COLUMN knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_agent_knowledge_bases_agent ON agent_knowledge_bases(agent_id);
CREATE INDEX idx_agent_knowledge_bases_kb ON agent_knowledge_bases(knowledge_base_id);
CREATE INDEX idx_kb_collections_knowledge_base ON kb_collections(knowledge_base_id);
```

## API Endpoints

### Knowledge Base Management

```
# List all knowledge bases
GET /api/knowledge-bases
Response: {
    "knowledge_bases": [
        {
            "id": "uuid",
            "name": "Product Documentation",
            "description": "...",
            "created_at": "2024-01-01T00:00:00Z",
            "stats": {
                "total_documents": 25,
                "total_chunks": 1250,
                "storage_size_bytes": 5242880,
                "agent_count": 3
            }
        }
    ]
}

# Create knowledge base
POST /api/knowledge-bases
Body: {
    "name": "Product Documentation",
    "description": "Company product documentation and FAQs",
    "settings": {
        "chunk_size": 512,
        "chunk_overlap": 100
    }
}

# Get knowledge base details
GET /api/knowledge-bases/{kb_id}

# Update knowledge base
PUT /api/knowledge-bases/{kb_id}
Body: {
    "name": "Updated Name",
    "description": "Updated description",
    "settings": {...}
}

# Delete knowledge base
DELETE /api/knowledge-bases/{kb_id}

# Duplicate knowledge base (copy all documents)
POST /api/knowledge-bases/{kb_id}/duplicate
Body: {
    "name": "Copy of Product Documentation"
}
```

### Document Management (same as before but under KB routes)

```
POST /api/knowledge-bases/{kb_id}/documents/upload
GET /api/knowledge-bases/{kb_id}/documents
GET /api/knowledge-bases/{kb_id}/documents/{doc_id}
DELETE /api/knowledge-bases/{kb_id}/documents/{doc_id}
GET /api/knowledge-bases/{kb_id}/documents/{doc_id}/download
POST /api/knowledge-bases/{kb_id}/documents/{doc_id}/retry
POST /api/knowledge-bases/{kb_id}/search
GET /api/knowledge-bases/{kb_id}/processing-stream  # SSE endpoint
```

### Agent-KB Association

```
# List knowledge bases attached to an agent
GET /api/agents/{agent_id}/knowledge-bases
Response: {
    "knowledge_bases": [
        {
            "id": "uuid",
            "name": "Product Documentation",
            "attached_at": "2024-01-01T00:00:00Z"
        }
    ]
}

# Attach knowledge base to agent
POST /api/agents/{agent_id}/knowledge-bases/{kb_id}/attach
Body: {
    "config": {
        "search_count": 5  // Optional overrides
    }
}

# Detach knowledge base from agent
DELETE /api/agents/{agent_id}/knowledge-bases/{kb_id}/detach

# Search across all KBs attached to an agent
POST /api/agents/{agent_id}/knowledge-bases/search
Body: {
    "query": "search query",
    "knowledge_base_ids": ["kb1", "kb2"],  // Optional, defaults to all
    "count": 3
}
```

## UI Changes

### 1. New Main Navigation Item

```
SignalWire Agent Builder
├── Agents
├── Knowledge Bases  (NEW)
├── Call Summaries
└── Admin
```

### 2. Knowledge Bases List Page

```tsx
// frontend/src/pages/KnowledgeBases.tsx
- Table/Grid view of all knowledge bases
- Columns: Name, Description, Documents, Size, Agents Using, Created, Actions
- Search/filter functionality
- Create New Knowledge Base button
- Actions: View/Edit, Duplicate, Delete
```

### 3. Knowledge Base Detail/Edit Page

```tsx
// frontend/src/pages/KnowledgeBaseDetail.tsx
- Reuse existing KnowledgeBaseConfig component
- Top section: Name, Description (editable)
- Settings card: Chunk size, overlap, search defaults
- Documents section: Upload, list, manage
- Agents Using section: List of agents with links
- Delete Knowledge Base button (with confirmation)
```

### 4. Agent Builder Changes

```tsx
// In AgentBuilder.tsx
- Replace knowledge base toggle/config with:
  - Knowledge Bases dropdown (multi-select)
  - "Create New Knowledge Base" link
  - Quick view of selected KB stats
  
// New component
// frontend/src/components/agents/KnowledgeBaseSelector.tsx
- Dropdown with search
- Shows KB stats (docs, size)
- Create new KB option that opens modal
```

## SWML/SWAIG Changes

### Update SWML Generator

When agent has multiple knowledge bases, the search function can specify which to search:

```python
# In swml_generator.py
if agent_knowledge_bases:
    agent.register_swaig_function(
        name="search_knowledge_base",
        description="Search the agent's knowledge bases for relevant information",
        parameters={
            "query": {
                "type": "string",
                "required": True,
                "description": "The search query"
            },
            "knowledge_base_name": {
                "type": "string",
                "required": False,
                "description": "Specific knowledge base to search (optional)"
            }
        }
    )
```

### Update SWAIG Handler

```python
# In swaig.py
async def handle_kb_search(agent_id, query, kb_name=None):
    # Get all KBs for agent
    agent_kbs = await get_agent_knowledge_bases(agent_id)
    
    if kb_name:
        # Search specific KB
        kb = next((kb for kb in agent_kbs if kb.name == kb_name), None)
        if not kb:
            return {"error": f"Knowledge base '{kb_name}' not found"}
        results = await search_knowledge_base(kb.id, query)
    else:
        # Search all KBs and merge results
        all_results = []
        for kb in agent_kbs:
            results = await search_knowledge_base(kb.id, query)
            all_results.extend(results)
        # Sort by relevance and dedupe
        results = sorted(all_results, key=lambda x: x['similarity'], reverse=True)[:count]
```

## Migration Plan

Since the current system has no data, we can:

1. Keep existing tables but repurpose them
2. kb_collections becomes the link between knowledge_bases and their documents
3. No data migration needed

## Implementation Steps

### Phase 2.1: Backend Infrastructure (Week 1)
1. Create new database tables
2. Create knowledge base models
3. Implement knowledge base CRUD API
4. Update document APIs to work with new structure
5. Update agent APIs to handle KB associations

### Phase 2.2: Frontend Knowledge Base Management (Week 1-2)
1. Create Knowledge Bases list page
2. Create Knowledge Base detail/edit page
3. Refactor KnowledgeBaseConfig component for reuse
4. Add navigation and routing

### Phase 2.3: Agent Integration (Week 2)
1. Create KnowledgeBaseSelector component
2. Update AgentBuilder to use selector
3. Update agent save/load logic
4. Update SWML generator for multiple KBs

### Phase 2.4: Search and SWAIG Updates (Week 2-3)
1. Update search to handle multiple KBs
2. Update SWAIG handler for KB selection
3. Add search result source attribution
4. Test multi-KB search scenarios

## Benefits

1. **Better UX**: Create and populate KBs before configuring agents
2. **Reusability**: Share knowledge across multiple agents
3. **Scalability**: Manage large knowledge bases independently
4. **Flexibility**: Agents can use multiple KBs for different domains
5. **Maintenance**: Update KB content without touching agent configs
6. **Performance**: Can optimize search per KB rather than per agent

## Future Enhancements

1. **Access Control**: Role-based permissions for KB management
2. **Versioning**: Track changes to KB content over time
3. **Import/Export**: Bulk import/export of KB content
4. **Analytics**: Usage stats, popular queries per KB
5. **KB Templates**: Pre-built KBs for common use cases
6. **Federated Search**: Search across external data sources