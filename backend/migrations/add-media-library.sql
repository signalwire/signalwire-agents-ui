-- Media Library Tables

-- Media files table
CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) UNIQUE NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('audio', 'video', 'image')),
    mime_type VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    file_size BIGINT NOT NULL,
    duration_seconds FLOAT,
    file_path VARCHAR(500) NOT NULL,
    metadata JSONB DEFAULT '{}',
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    uploaded_by VARCHAR(255),
    source_type VARCHAR(20) DEFAULT 'uploaded' CHECK (source_type IN ('uploaded', 'imported')),
    external_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_media_files_type ON media_files(file_type);
CREATE INDEX idx_media_files_category ON media_files(category);
CREATE INDEX idx_media_files_created_at ON media_files(created_at);
CREATE INDEX idx_media_files_tags ON media_files USING GIN(tags);

-- Media usage tracking
CREATE TABLE IF NOT EXISTS media_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    parameter_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(media_file_id, agent_id, parameter_name)
);

-- Indexes for usage tracking
CREATE INDEX idx_media_usage_media ON media_usage(media_file_id);
CREATE INDEX idx_media_usage_agent ON media_usage(agent_id);

-- Media settings (for admin configuration)
CREATE TABLE IF NOT EXISTS system_settings (
    category VARCHAR(100) PRIMARY KEY,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default media settings
INSERT INTO system_settings (category, settings) 
VALUES ('media_library', '{
    "max_audio_size_mb": 50,
    "max_video_size_mb": 200,
    "max_uploads_per_hour": 10,
    "max_imports_per_hour": 20,
    "allowed_audio_types": ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"],
    "allowed_video_types": ["video/mp4", "video/webm"],
    "auto_cleanup_days": 90,
    "enable_virus_scan": false,
    "max_total_storage_gb": 50
}'::jsonb)
ON CONFLICT (category) DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON media_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();