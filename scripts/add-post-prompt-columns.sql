-- Add post-prompt fields to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS post_prompt_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS post_prompt_mode VARCHAR(50) DEFAULT 'builtin',
ADD COLUMN IF NOT EXISTS post_prompt_text TEXT DEFAULT 'Summarize the conversation including key points and action items',
ADD COLUMN IF NOT EXISTS post_prompt_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create call_summaries table
CREATE TABLE IF NOT EXISTS call_summaries (
    id VARCHAR(255) PRIMARY KEY,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    ai_session_id VARCHAR(255),
    
    -- Timestamps (Unix timestamp in microseconds from SignalWire)
    call_start_date BIGINT,
    call_end_date BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Caller info
    caller_id_name VARCHAR(255),
    caller_id_number VARCHAR(255),
    
    -- Summary data
    post_prompt_summary TEXT,
    call_log JSONB,
    swaig_log JSONB,
    
    -- Metrics
    total_minutes FLOAT,
    total_input_tokens INTEGER,
    total_output_tokens INTEGER,
    total_cost FLOAT,
    
    -- Full raw data for reference
    raw_data JSONB
);

-- Create indexes for call_summaries
CREATE INDEX IF NOT EXISTS idx_call_summaries_agent_id ON call_summaries(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_summaries_created_at ON call_summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_summaries_caller ON call_summaries(caller_id_number);

-- Create index for change detection
CREATE INDEX IF NOT EXISTS idx_agents_updated_at ON agents(updated_at);