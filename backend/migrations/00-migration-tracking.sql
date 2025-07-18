-- Create migration tracking table
-- This must be the first migration to run
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    description TEXT
);

-- Migration tracking is now handled by the migration runner script
-- No automatic schema insertion needed