-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tokens table for authentication
CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create settings table for admin configuration
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
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
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE
    entity_type VARCHAR(50) NOT NULL, -- agent, setting, token
    entity_id VARCHAR(255) NOT NULL,
    changes JSONB,
    metadata JSONB, -- IP address, user agent, etc.
    auth_token VARCHAR(255) -- Which token was used
);

-- Create triggers for updated_at
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for audit log queries
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_token ON audit_log(auth_token);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
    ('available_engines', '["rime", "elevenlabs", "azure", "openai", "google"]'),
    ('available_languages', '["en-US", "es-ES", "fr-FR", "de-DE", "it-IT", "pt-BR", "ja-JP", "ko-KR", "zh-CN"]'),
    ('rate_limits', '{"api": 100, "swml": 1000}'),
    ('rime_voices', '["nova", "terrence", "allison", "serena", "tom", "ava", "andrew", "emma", "brian", "jenny"]'),
    ('elevenlabs_voices', '[]'),
    ('azure_voices', '[]'),
    ('openai_voices', '["alloy", "echo", "fable", "onyx", "nova", "shimmer"]'),
    ('google_voices', '[]')
ON CONFLICT (key) DO NOTHING;

-- Create default admin token (CHANGE THIS IN PRODUCTION!)
INSERT INTO tokens (token, name) VALUES 
    ('admin-token-changeme', 'Default Admin Token')
ON CONFLICT (token) DO NOTHING;