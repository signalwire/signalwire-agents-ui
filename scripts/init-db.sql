-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tokens table for authentication
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

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    version INTEGER DEFAULT 1
);

-- Create settings table for admin configuration
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for admin authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create triggers for updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for audit log queries
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Create index for change detection
CREATE INDEX IF NOT EXISTS idx_agents_updated_at ON agents(updated_at);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
    ('available_engines', '["rime", "elevenlabs", "azure", "openai", "google"]'),
    ('available_languages', '["en-US", "es-ES", "fr-FR", "de-DE", "it-IT", "pt-BR", "ja-JP", "ko-KR", "zh-CN"]'),
    ('rate_limits', '{"api": 100, "swml": 1000}'),
    ('rime_voices', '["nova", "terrence", "allison", "serena", "tom", "ava", "andrew", "emma", "brian", "jenny"]'),
    ('elevenlabs_voices', '[]'),
    ('azure_voices', '[]'),
    ('openai_voices', '["alloy", "echo", "fable", "onyx", "nova", "shimmer"]'),
    ('google_voices', '[]'),
    ('global_basic_auth', '{"enabled": false, "username": "", "password": ""}')
ON CONFLICT (key) DO NOTHING;

-- Create default admin user
INSERT INTO users (id, username, email) VALUES 
    ('admin-user-id', 'admin', 'admin@example.com')
ON CONFLICT (id) DO NOTHING;

-- Create default admin token (CHANGE THIS IN PRODUCTION!)
INSERT INTO tokens (id, token, name, expires_at, created_by) VALUES 
    ('default-token-id', 'admin-token-changeme', 'Default Admin Token', 
     CURRENT_TIMESTAMP + INTERVAL '365 days', 'admin-user-id')
ON CONFLICT (id) DO NOTHING;