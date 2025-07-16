-- Create migration tracking table
-- This must be the first migration to run
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    description TEXT
);

-- Import existing Alembic migrations if they exist
-- This ensures compatibility with existing databases
DO $$
BEGIN
    -- Check if alembic_version table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'alembic_version') THEN
        
        -- Get the current alembic version
        DECLARE current_version VARCHAR(255);
        BEGIN
            SELECT version_num INTO current_version FROM alembic_version LIMIT 1;
            
            -- Map known alembic versions to our migrations
            -- These would need to be updated based on actual alembic history
            IF current_version IS NOT NULL THEN
                -- Mark base schema as applied
                INSERT INTO schema_migrations (version, description) 
                VALUES ('base-schema', 'Initial database schema')
                ON CONFLICT (version) DO NOTHING;
                
                -- Map specific alembic versions to migrations
                -- Example mappings (would need real version numbers):
                -- IF current_version >= 'abc123' THEN
                --     INSERT INTO schema_migrations (version, description)
                --     VALUES ('add-env-vars-table', 'Add environment variables table')
                --     ON CONFLICT (version) DO NOTHING;
                -- END IF;
            END IF;
        END;
    END IF;
END $$;