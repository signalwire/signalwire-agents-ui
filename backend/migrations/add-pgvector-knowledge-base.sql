-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Standalone knowledge bases that can be shared across agents
CREATE TABLE IF NOT EXISTS knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{
        "chunk_size": 512,
        "chunk_overlap": 100,
        "search_count": 3,
        "similarity_threshold": 0.0,
        "chunking_strategy": "sentence",
        "max_sentences_per_chunk": 5,
        "split_newlines": 0,
        "semantic_threshold": 0.5,
        "topic_threshold": 0.3
    }'::jsonb,
    stats JSONB DEFAULT '{
        "total_documents": 0,
        "total_chunks": 0,
        "storage_size_bytes": 0
    }'::jsonb
);

-- Many-to-many relationship between agents and knowledge bases
CREATE TABLE IF NOT EXISTS agent_knowledge_bases (
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    attached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attached_by VARCHAR(255),
    config JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY(agent_id, knowledge_base_id)
);

-- Knowledge base collections (belong to knowledge bases)
CREATE TABLE IF NOT EXISTS kb_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Uploaded documents with processing status tracking
CREATE TABLE IF NOT EXISTS kb_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES kb_collections(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    file_hash VARCHAR(64) UNIQUE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processing_started_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    chunk_count INTEGER DEFAULT 0,
    chunks_processed INTEGER DEFAULT 0,
    document_metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(collection_id, file_hash)
);

-- Document chunks with vector embeddings
CREATE TABLE IF NOT EXISTS kb_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES kb_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    document_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kb_chunks_embedding 
    ON kb_chunks USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_kb_chunks_content 
    ON kb_chunks USING gin (content gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_kb_documents_collection 
    ON kb_documents(collection_id);

CREATE INDEX IF NOT EXISTS idx_kb_chunks_document 
    ON kb_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_kb_documents_status 
    ON kb_documents(status);

CREATE INDEX IF NOT EXISTS idx_kb_collections_knowledge_base 
    ON kb_collections(knowledge_base_id);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_bases_agent 
    ON agent_knowledge_bases(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_bases_kb 
    ON agent_knowledge_bases(knowledge_base_id);