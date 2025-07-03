-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Knowledge base collections (one per agent)
CREATE TABLE IF NOT EXISTS kb_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_kb_collections_agent 
    ON kb_collections(agent_id);