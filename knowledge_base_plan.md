# Knowledge Base Feature Plan

## Overview

This document outlines the implementation plan for adding a pgvector-based knowledge base feature to the SignalWire Agent Builder. The feature will allow users to upload documents to create a searchable knowledge base for their agents.

## Architecture Decision

We will implement a **custom internal skill** that:
- Only exists within the Agent Builder UI (not part of the SDK)
- Automatically connects to the agent's knowledge base collection
- Is managed entirely through the UI without manual configuration

## Key Components

### 1. Custom Knowledge Base Skill

Create a special skill that:
- Is NOT listed in the regular skills selection
- Gets automatically added when knowledge base is enabled
- Connects directly to our PostgreSQL database with pgvector
- Has a fixed function name like `search_knowledge_base`

```python
# backend/skills/knowledge_base_skill.py
class KnowledgeBaseSkill:
    """Internal skill for searching agent-specific knowledge bases"""
    
    def __init__(self, agent_id: str, db_session):
        self.agent_id = agent_id
        self.collection_name = f"agent_{agent_id}_kb"
        self.db_session = db_session
        # Embedding model loaded from singleton service
        
    async def search_knowledge_base(self, query: str, count: int = 3) -> dict:
        """Search the agent's knowledge base"""
        # Direct pgvector search implementation
        # No network calls, direct DB access
```

### 2. Database Schema

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Knowledge base collections
CREATE TABLE kb_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Uploaded documents
CREATE TABLE kb_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES kb_collections(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL, -- Path to stored original file
    file_type VARCHAR(50),
    file_size INTEGER,
    file_hash VARCHAR(64) UNIQUE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processing_started_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    chunk_count INTEGER DEFAULT 0,
    chunks_processed INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(collection_id, file_hash)
);

-- Document chunks with embeddings
CREATE TABLE kb_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES kb_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384), -- dimension depends on model
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_kb_chunks_embedding ON kb_chunks 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX idx_kb_chunks_content ON kb_chunks 
    USING gin (content gin_trgm_ops);

CREATE INDEX idx_kb_documents_collection ON kb_documents(collection_id);
CREATE INDEX idx_kb_chunks_document ON kb_chunks(document_id);
```

### 3. Backend Services

#### Embedding Model Service (Singleton)
```python
# backend/services/embedding_service.py
class EmbeddingService:
    _instance = None
    _model = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer('all-MiniLM-L6-v2')
        return self._model
```

#### Document Processing Service
```python
# backend/services/document_processor.py
class DocumentProcessor:
    async def process_document(self, file_path: str, document_id: str):
        """Process uploaded document into chunks with embeddings"""
        # 1. Update status to 'processing' with start time
        # 2. Load document based on file type
        # 3. Split into chunks with context preservation
        # 4. Update chunk_count in document
        # 5. Generate embeddings in batches
        # 6. Store chunks with progress updates (chunks_processed)
        # 7. Update document status to 'completed' or 'failed'
        
    async def delete_document(self, document_id: str):
        """Delete document and all associated data"""
        # 1. Get document record for file_path
        # 2. Delete chunks (CASCADE will handle)
        # 3. Delete document record
        # 4. Delete original file from storage
        # 5. Clean up any cached data
```

#### Document Storage Service
```python
# backend/services/document_storage.py
class DocumentStorage:
    def __init__(self):
        self.storage_path = settings.KB_STORAGE_PATH  # e.g., /app/data/knowledge_base
        
    async def store_file(self, file: UploadFile, agent_id: str) -> str:
        """Store uploaded file and return storage path"""
        # Create agent-specific directory
        agent_dir = f"{self.storage_path}/{agent_id}"
        os.makedirs(agent_dir, exist_ok=True)
        
        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{secure_filename(file.filename)}"
        file_path = f"{agent_dir}/{safe_filename}"
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(await file.read())
            
        return file_path
        
    async def delete_file(self, file_path: str):
        """Delete file from storage"""
        if os.path.exists(file_path):
            os.remove(file_path)
```

### 4. API Endpoints

```python
# backend/api/knowledge_base.py

# Upload documents
POST /api/agents/{agent_id}/knowledge-base/upload
- Accepts multiple files
- Stores original files in agent-specific directory
- Returns upload status and document IDs
- Queues for background processing

# List documents with processing status
GET /api/agents/{agent_id}/knowledge-base/documents
Response:
{
    "documents": [
        {
            "id": "uuid",
            "filename": "example.pdf",
            "file_size": 1024000,
            "file_type": "application/pdf",
            "uploaded_at": "2025-01-01T00:00:00Z",
            "status": "processing",
            "processing_started_at": "2025-01-01T00:01:00Z",
            "chunk_count": 50,
            "chunks_processed": 25,
            "progress_percentage": 50,
            "error_message": null
        }
    ]
}

# Get single document status
GET /api/agents/{agent_id}/knowledge-base/documents/{document_id}
- Detailed processing information
- Error details if failed

# Delete document
DELETE /api/agents/{agent_id}/knowledge-base/documents/{document_id}
- Deletes original file from storage
- Removes all chunks and embeddings
- Returns confirmation

# Download original document
GET /api/agents/{agent_id}/knowledge-base/documents/{document_id}/download
- Returns original uploaded file

# Retry failed processing
POST /api/agents/{agent_id}/knowledge-base/documents/{document_id}/retry
- Re-queues failed documents for processing

# Test search
POST /api/agents/{agent_id}/knowledge-base/search
{
    "query": "search query",
    "count": 3
}

# Get overall knowledge base status
GET /api/agents/{agent_id}/knowledge-base/status
Response:
{
    "total_documents": 10,
    "completed_documents": 8,
    "processing_documents": 1,
    "failed_documents": 1,
    "total_chunks": 450,
    "storage_size_bytes": 5242880
}
```

### 5. UI Components

#### Knowledge Base Tab
```tsx
// frontend/src/components/agents/KnowledgeBaseTab.tsx
- Enable/disable knowledge base toggle
- File upload area (drag & drop)
- Documents table with:
  - Filename
  - Upload date
  - File size
  - Status column showing:
    - "Pending" (gray badge)
    - "Processing 50%" (blue progress bar)
    - "Completed" (green badge)
    - "Failed" (red badge with retry button)
  - Processing progress:
    - Progress bar for active processing
    - "25/50 chunks processed" text
    - Time elapsed
  - Actions:
    - Download original file
    - Delete (with confirmation)
    - Retry (for failed documents)
- Real-time updates via WebSocket/SSE for processing status
- Search tester with example queries
- Settings (search count, similarity threshold)
```

#### Processing Status Component
```tsx
// frontend/src/components/agents/ProcessingStatus.tsx
interface ProcessingStatusProps {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  chunkCount?: number
  chunksProcessed?: number
  errorMessage?: string
  onRetry?: () => void
}

// Shows:
// - Status badge
// - Progress bar (if processing)
// - Error message (if failed)
// - Retry button (if failed)
// - Auto-refreshes every 2 seconds when processing
```

#### Integration with AgentBuilder
```tsx
// Automatically configure skill when knowledge base is enabled
useEffect(() => {
  if (knowledgeBaseEnabled) {
    // Add internal skill configuration
    // This is NOT added to the regular skills array
    // It's handled separately in SWML generation
  }
}, [knowledgeBaseEnabled])
```

### 6. SWML Generation Updates

```python
# backend/core/swml_generator.py
async def generate_swml(agent_config: Dict[str, Any], agent_id: str, db_session=None):
    # ... existing code ...
    
    # Add knowledge base skill if enabled
    if agent_config.get('knowledge_base', {}).get('enabled'):
        # Register the internal knowledge base function
        agent.register_swaig_function(
            name="search_knowledge_base",
            description="Search the agent's knowledge base for relevant information",
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query"
                    },
                    "count": {
                        "type": "integer",
                        "description": "Number of results to return",
                        "default": 3
                    }
                },
                "required": ["query"]
            }
        )
```

### 7. SWAIG Handler Updates

```python
# backend/api/swaig.py
@router.post("/swaig/function")
async def handle_swaig_function(request: SwaigRequest, db: AsyncSession = Depends(get_db)):
    # ... existing code ...
    
    if request.function == "search_knowledge_base":
        # Extract agent_id from request metadata
        agent_id = request.meta_data.get("agent_id")
        
        # Use our internal KB skill
        kb_skill = KnowledgeBaseSkill(agent_id, db)
        results = await kb_skill.search_knowledge_base(
            query=request.params.get("query"),
            count=request.params.get("count", 3)
        )
        
        return SwaigResponse(
            action="return",
            result=results["answer"],
            metadata=results.get("metadata", {})
        )
```

## Implementation Steps

### Phase 1: Infrastructure (Week 1)
1. Update Dockerfile to install `signalwire-agents[search-all]`
2. Add database migrations for pgvector tables
3. Create document storage directory structure
4. Create embedding service singleton
5. Set up background task queue for document processing
6. Add file storage configuration to settings

### Phase 2: Backend APIs (Week 1-2)
1. Implement document upload endpoint
2. Create document processor with support for multiple formats
3. Build knowledge base search functionality
4. Add document management endpoints

### Phase 3: UI Development (Week 2)
1. Create KnowledgeBaseTab component
2. Implement file upload with progress tracking
3. Build document management interface
4. Add search testing tool

### Phase 4: Integration (Week 3)
1. Update SWML generator to include KB function
2. Modify SWAIG handler for KB searches
3. Add knowledge base config to agent model
4. Test end-to-end functionality

### Phase 5: Polish & Optimization (Week 3)
1. Add file deduplication
2. Implement search result caching
3. Add bulk operations
4. Performance testing and optimization

## Configuration

Agent configuration will include:
```json
{
  "knowledge_base": {
    "enabled": false,
    "search_count": 3,
    "similarity_threshold": 0.7,
    "include_metadata": true,
    "chunk_size": 512,
    "chunk_overlap": 100
  }
}
```

## File Support

Initial support for:
- Text files (.txt)
- Markdown (.md)
- PDF (.pdf)
- Word documents (.docx)
- HTML files (.html)
- JSON/YAML for structured data

## Security Considerations

1. **File validation**: Check file types and sizes before processing
2. **Isolation**: Each agent can only access its own knowledge base
3. **Rate limiting**: Limit uploads per agent
4. **Sanitization**: Clean content before storage
5. **Access control**: Verify agent ownership on all operations

## Performance Targets

- Document upload: < 1 second response (async processing)
- Search query: < 500ms for typical 3-result search
- Embedding generation: Batch process for efficiency
- Model loading: One-time cost at service startup

## Background Processing Details

### Processing Queue
- Use asyncio tasks or Celery for background processing
- Process documents in order of upload
- Update progress in database every N chunks
- Handle failures gracefully with error logging

### Progress Tracking
```python
async def update_processing_progress(document_id: str, chunks_processed: int):
    """Update processing progress in database"""
    await db.execute(
        update(kb_documents)
        .where(kb_documents.id == document_id)
        .values(
            chunks_processed=chunks_processed,
            status='processing' if chunks_processed < chunk_count else 'completed'
        )
    )
```

### SSE Updates
Using the existing SSE system from the app:

```python
# backend/api/knowledge_base.py
from ..core.sse_manager import sse_manager

async def send_kb_update(agent_id: str, document_id: str, status: str, progress: int = None):
    """Send knowledge base update via SSE"""
    await sse_manager.send_event({
        "type": "kb_update",
        "agent_id": agent_id,
        "document_id": document_id,
        "status": status,
        "progress": progress,
        "timestamp": datetime.utcnow().isoformat()
    })

# In document processor
async def process_document(self, file_path: str, document_id: str, agent_id: str):
    # ... processing logic ...
    
    # Send progress updates
    await send_kb_update(agent_id, document_id, "processing", progress=50)
    
    # Send completion notification
    await send_kb_update(agent_id, document_id, "completed", progress=100)

# On server restart - resend status of all processing documents
async def on_startup():
    """Send status updates for any documents that were processing"""
    processing_docs = await db.execute(
        select(kb_documents)
        .where(kb_documents.status == 'processing')
    )
    for doc in processing_docs:
        # Either resume processing or mark as failed
        await send_kb_update(
            doc.collection.agent_id, 
            doc.id, 
            "resumed",
            progress=doc.chunks_processed / doc.chunk_count * 100
        )
```

Frontend integration:
```tsx
// Use existing SSE hook
const { events } = useSSE()

useEffect(() => {
  const kbEvents = events.filter(e => 
    e.type === 'kb_update' && 
    e.agent_id === agentId
  )
  
  kbEvents.forEach(event => {
    // Update document status in UI
    if (event.status === 'completed') {
      toast({
        title: 'Document processed',
        description: `Processing complete for ${getDocumentName(event.document_id)}`
      })
    }
  })
}, [events])

## File Management

### Storage Structure
```
/app/data/knowledge_base/
├── {agent_id_1}/
│   ├── 20250103_120000_document1.pdf
│   ├── 20250103_120100_document2.docx
│   └── ...
├── {agent_id_2}/
│   └── ...
```

### Cleanup Policy
- When document is deleted, remove:
  1. All database records (document, chunks)
  2. Original file from storage
  3. Any cached embeddings
- When agent is deleted, remove entire agent directory

### Storage Monitoring
- Track total storage per agent
- Implement storage quotas if needed
- Alert on low disk space

## Future Enhancements

1. **Incremental updates**: Update specific documents without full reprocessing
2. **Web scraping**: Add URLs as knowledge sources
3. **Scheduled updates**: Periodic refresh of knowledge base
4. **Export/Import**: Backup and restore knowledge bases
5. **Analytics**: Track which knowledge is most accessed
6. **Multi-language**: Support for non-English documents
7. **Permission system**: Shared knowledge bases between agents
8. **Version control**: Keep history of document changes
9. **Duplicate detection**: Warn about similar documents
10. **Batch operations**: Select multiple documents for actions

## Dependencies

```python
# Add to backend/requirements.txt
signalwire-agents[search-all]  # Includes all search features + pgvector support

# This brings in:
# - sentence-transformers (embedding models)
# - pgvector (PostgreSQL vector extension)
# - psycopg2-binary (PostgreSQL adapter)
# - PyPDF2 (PDF processing)
# - python-docx (Word document processing)
# - beautifulsoup4 (HTML processing)
# - numpy (vector operations)
# - And more...
```

## Success Metrics

1. **Adoption**: % of agents using knowledge base
2. **Performance**: Average search response time
3. **Accuracy**: User feedback on search relevance
4. **Scale**: Number of documents per agent
5. **Reliability**: Upload success rate

## Risk Mitigation

1. **Large files**: Implement file size limits and chunked uploads
2. **Model memory**: Monitor memory usage, implement model unloading if needed
3. **Database growth**: Plan for data retention policies
4. **Processing failures**: Robust error handling and retry logic
5. **Search quality**: Provide feedback mechanism for improvements