-- SignalWire Agent Builder Database Initialization
-- This script runs in the PostgreSQL container during initialization
-- It applies all migrations in order

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- If upgrading from Alembic, mark existing schema as migrated
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'alembic_version') THEN
        -- Mark base tables as already migrated
        INSERT INTO schema_migrations (version) 
        VALUES ('base-schema'), ('add-media-library'), ('add-pgvector-knowledge-base'), 
               ('add-env-vars-table'), ('add-call-summaries')
        ON CONFLICT (version) DO NOTHING;
    END IF;
END $$;

-- Ensure uuid-ossp functions are available
SELECT uuid_generate_v4();

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS tokens (
    id VARCHAR(255) PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    created_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    version INTEGER DEFAULT 1,
    post_prompt_enabled BOOLEAN DEFAULT false,
    post_prompt_mode VARCHAR(50) DEFAULT 'builtin',
    post_prompt_text TEXT DEFAULT 'Summarize the conversation including key points and action items',
    post_prompt_url VARCHAR(500),
    agent_type VARCHAR(50) DEFAULT 'regular' CHECK (agent_type IN ('regular', 'bedrock'))
);

CREATE TABLE IF NOT EXISTS settings (
    id VARCHAR(255) PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drop and recreate audit_logs with proper UUID type
DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_agents_updated_at ON agents(updated_at);

-- Insert default tokens if not exists
INSERT INTO tokens (id, token, name, expires_at, created_by) 
SELECT 'default-admin-token', 'admin-token-changeme', 'Default Admin Token', NOW() + INTERVAL '100 years', 'system'
WHERE NOT EXISTS (SELECT 1 FROM tokens WHERE id = 'default-admin-token');

INSERT INTO settings (id, key, value) 
SELECT 'default-languages', 'languages', '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'languages');

-- Record base schema as migrated
INSERT INTO schema_migrations (version) VALUES ('base-schema') ON CONFLICT (version) DO NOTHING;

-- MIGRATION: add-media-library
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'add-media-library') THEN
        -- Media library tables
        CREATE TABLE IF NOT EXISTS media_files (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            filename VARCHAR(255) NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            size_bytes BIGINT NOT NULL,
            media_type VARCHAR(50) NOT NULL CHECK (media_type IN ('audio', 'video', 'image', 'document')),
            metadata JSONB DEFAULT '{}',
            uploaded_by VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS media_usage (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
            agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
            usage_type VARCHAR(100) NOT NULL,
            usage_context JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(media_file_id, agent_id, usage_type)
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(media_type);
        CREATE INDEX IF NOT EXISTS idx_media_files_created ON media_files(created_at);
        CREATE INDEX IF NOT EXISTS idx_media_usage_agent ON media_usage(agent_id);
        CREATE INDEX IF NOT EXISTS idx_media_usage_file ON media_usage(media_file_id);

        -- Trigger for updated_at
        DROP TRIGGER IF EXISTS update_media_files_updated_at ON media_files;
        CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON media_files 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        -- Record migration
        INSERT INTO schema_migrations (version) VALUES ('add-media-library');
    END IF;
END $$;

-- MIGRATION: add-pgvector-knowledge-base
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'add-pgvector-knowledge-base') THEN
        -- Knowledge base tables
        CREATE TABLE IF NOT EXISTS knowledge_bases (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) UNIQUE NOT NULL,
            description TEXT,
            created_by VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            settings JSONB DEFAULT '{}',
            stats JSONB DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS agent_knowledge_bases (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
            knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
            config JSONB DEFAULT '{}',
            attached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            attached_by VARCHAR(255),
            UNIQUE(agent_id, knowledge_base_id)
        );

        CREATE TABLE IF NOT EXISTS kb_collections (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            config JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(knowledge_base_id, name)
        );

        CREATE TABLE IF NOT EXISTS kb_documents (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            collection_id UUID NOT NULL REFERENCES kb_collections(id) ON DELETE CASCADE,
            filename VARCHAR(255) NOT NULL,
            content_type VARCHAR(100),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS kb_chunks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding vector(384),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_agent_kb_agent ON agent_knowledge_bases(agent_id);
        CREATE INDEX IF NOT EXISTS idx_agent_kb_kb ON agent_knowledge_bases(knowledge_base_id);
        CREATE INDEX IF NOT EXISTS idx_kb_collections_kb ON kb_collections(knowledge_base_id);
        CREATE INDEX IF NOT EXISTS idx_kb_documents_collection ON kb_documents(collection_id);
        CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON kb_chunks(document_id);
        CREATE INDEX IF NOT EXISTS idx_kb_chunks_embedding ON kb_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

        -- Triggers
        DROP TRIGGER IF EXISTS update_kb_updated_at ON knowledge_bases;
        CREATE TRIGGER update_kb_updated_at BEFORE UPDATE ON knowledge_bases 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        DROP TRIGGER IF EXISTS update_kb_documents_updated_at ON kb_documents;
        CREATE TRIGGER update_kb_documents_updated_at BEFORE UPDATE ON kb_documents 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        -- Record migration
        INSERT INTO schema_migrations (version) VALUES ('add-pgvector-knowledge-base');
    END IF;
END $$;

-- MIGRATION: add-env-vars-table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'add-env-vars-table') THEN
        -- Environment variables table
        CREATE TABLE IF NOT EXISTS env_vars (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            value TEXT NOT NULL,
            description TEXT,
            is_secret BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Index for faster lookups
        CREATE INDEX IF NOT EXISTS idx_env_vars_name ON env_vars(name);

        -- Trigger for updated_at
        DROP TRIGGER IF EXISTS update_env_vars_updated_at ON env_vars;
        CREATE TRIGGER update_env_vars_updated_at BEFORE UPDATE ON env_vars 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        -- Record migration
        INSERT INTO schema_migrations (version) VALUES ('add-env-vars-table');
    END IF;
END $$;

-- MIGRATION: add-call-summaries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'add-call-summaries') THEN
        -- Call summaries table
        CREATE TABLE IF NOT EXISTS call_summaries (
            id VARCHAR(255) PRIMARY KEY,
            agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
            call_id VARCHAR(255) UNIQUE,
            ai_session_id VARCHAR(255),
            call_start_date BIGINT,
            call_end_date BIGINT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            caller_id_name VARCHAR(255),
            caller_id_number VARCHAR(255),
            post_prompt_summary TEXT,
            call_log JSONB,
            swaig_log JSONB,
            total_minutes FLOAT,
            total_input_tokens INTEGER,
            total_output_tokens INTEGER,
            total_cost FLOAT,
            raw_data JSONB
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_call_summaries_agent ON call_summaries(agent_id);
        CREATE INDEX IF NOT EXISTS idx_call_summaries_call ON call_summaries(call_id);
        CREATE INDEX IF NOT EXISTS idx_call_summaries_created ON call_summaries(created_at);
        
        -- Record migration
        INSERT INTO schema_migrations (version) VALUES ('add-call-summaries');
    END IF;
END $$;

-- MIGRATION: add-agent-type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'add-agent-type') THEN
        -- Add agent_type column to agents table (already included above, but ensure it exists)
        ALTER TABLE agents 
        ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50) DEFAULT 'regular' CHECK (agent_type IN ('regular', 'bedrock'));

        -- Update existing agents to have explicit 'regular' type
        UPDATE agents SET agent_type = 'regular' WHERE agent_type IS NULL;
        
        -- Record migration
        INSERT INTO schema_migrations (version) VALUES ('add-agent-type');
    END IF;
END $$;

-- MIGRATION: add-kb-settings-stats
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = 'add-kb-settings-stats') THEN
        -- Add settings and stats columns if they don't exist (already included above)
        ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
        ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}';
        
        -- Record migration
        INSERT INTO schema_migrations (version) VALUES ('add-kb-settings-stats');
    END IF;
END $$;

-- Show completion message
DO $$
BEGIN
    RAISE NOTICE 'Database initialization and migrations completed successfully!';
END $$;