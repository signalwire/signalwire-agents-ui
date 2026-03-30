"""initial schema

Revision ID: a1558c36c63f
Revises:
Create Date: 2026-03-30 10:15:49.157275

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1558c36c63f'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables for the initial schema.

    For existing databases (upgrading from the old migration system),
    this migration is stamped as applied without running.
    All statements use IF NOT EXISTS so it's safe to run either way.
    """
    # Extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector"')

    # Users
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Tokens
    op.execute("""
        CREATE TABLE IF NOT EXISTS tokens (
            id VARCHAR(255) PRIMARY KEY,
            token TEXT UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            last_used_at TIMESTAMP,
            created_by VARCHAR(255),
            is_active BOOLEAN DEFAULT true
        )
    """)

    # Agents
    op.execute("""
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
            agent_type VARCHAR(50) DEFAULT 'regular'
        )
    """)

    # Settings
    op.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            id VARCHAR(255) PRIMARY KEY,
            key VARCHAR(255) UNIQUE NOT NULL,
            value JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Audit logs
    op.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id VARCHAR(255) NOT NULL,
            action VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            metadata JSONB,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Call summaries
    op.execute("""
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
        )
    """)

    # Environment variables
    op.execute("""
        CREATE TABLE IF NOT EXISTS env_vars (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            value TEXT NOT NULL,
            description TEXT,
            is_secret BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Knowledge bases
    op.execute("""
        CREATE TABLE IF NOT EXISTS knowledge_bases (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) UNIQUE NOT NULL,
            description TEXT,
            created_by VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            settings JSONB DEFAULT '{}',
            stats JSONB DEFAULT '{}'
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS agent_knowledge_bases (
            agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
            knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
            attached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            attached_by VARCHAR(255),
            config JSONB DEFAULT '{}',
            PRIMARY KEY (agent_id, knowledge_base_id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS kb_collections (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            settings JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS kb_documents (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            collection_id UUID NOT NULL REFERENCES kb_collections(id) ON DELETE CASCADE,
            filename VARCHAR(255) NOT NULL,
            file_path VARCHAR(512) NOT NULL,
            file_type VARCHAR(50),
            file_size INTEGER,
            file_hash VARCHAR(64) UNIQUE,
            uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP WITH TIME ZONE,
            processing_started_at TIMESTAMP WITH TIME ZONE,
            status VARCHAR(50) DEFAULT 'pending',
            error_message TEXT,
            chunk_count INTEGER DEFAULT 0,
            chunks_processed INTEGER DEFAULT 0,
            document_metadata JSONB DEFAULT '{}'
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS kb_chunks (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            embedding vector(384),
            document_metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Media library
    op.execute("""
        CREATE TABLE IF NOT EXISTS media_files (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            filename VARCHAR(255) UNIQUE NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            file_type VARCHAR(20) NOT NULL,
            mime_type VARCHAR(100) NOT NULL,
            category VARCHAR(50),
            file_size BIGINT NOT NULL,
            duration_seconds FLOAT,
            file_path VARCHAR(500) NOT NULL,
            metadata JSONB DEFAULT '{}',
            description TEXT,
            tags TEXT[],
            uploaded_by VARCHAR(255),
            source_type VARCHAR(20) DEFAULT 'uploaded',
            external_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_accessed_at TIMESTAMP WITH TIME ZONE,
            file_hash VARCHAR(64)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS media_usage (
            media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
            agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
            parameter_name VARCHAR(50) NOT NULL,
            attached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (media_file_id, agent_id, parameter_name)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS system_settings (
            category VARCHAR(100) PRIMARY KEY,
            settings JSONB DEFAULT '{}',
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Indexes
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_agents_updated_at ON agents(updated_at)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_call_summaries_agent ON call_summaries(agent_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_call_summaries_call ON call_summaries(call_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_call_summaries_created ON call_summaries(created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_env_vars_name ON env_vars(name)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON kb_chunks(document_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_kb_documents_collection ON kb_documents(collection_id)")

    # Default token
    op.execute("""
        INSERT INTO tokens (id, token, name, role, expires_at, created_by)
        SELECT 'default-admin-token', 'admin-token-changeme', 'Default Admin Token', 'admin',
               NOW() + INTERVAL '100 years', 'system'
        WHERE NOT EXISTS (SELECT 1 FROM tokens WHERE id = 'default-admin-token')
    """)

    # Default settings
    op.execute("""
        INSERT INTO settings (id, key, value)
        SELECT 'default-languages', 'languages', '[]'::jsonb
        WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'languages')
    """)

    # Updated_at triggers
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql'
    """)

    for table in ['agents', 'settings', 'knowledge_bases', 'kb_documents', 'env_vars', 'media_files']:
        op.execute(f"DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table}")
        op.execute(f"""
            CREATE TRIGGER update_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
        """)


def downgrade() -> None:
    """Drop all tables. Destructive — only for development."""
    for table in [
        'media_usage', 'media_files', 'system_settings',
        'kb_chunks', 'kb_documents', 'kb_collections',
        'agent_knowledge_bases', 'knowledge_bases',
        'call_summaries', 'env_vars', 'audit_logs',
        'settings', 'agents', 'tokens', 'users',
    ]:
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
