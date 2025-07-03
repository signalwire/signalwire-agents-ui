-- Migration: add-env-vars-table
-- Description: Create table for user-defined environment variables

CREATE TABLE IF NOT EXISTS env_vars (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    is_secret BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_env_vars_name ON env_vars(name);

-- Add some example env vars for development
INSERT INTO env_vars (name, value, description, is_secret) VALUES
    ('EXAMPLE_API_KEY', 'demo-key-12345', 'Example API key for testing', true),
    ('EXAMPLE_ENDPOINT', 'https://api.example.com', 'Example API endpoint', false)
ON CONFLICT (name) DO NOTHING;