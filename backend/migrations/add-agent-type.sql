-- Add agent_type column to agents table
-- Default to 'regular' for backward compatibility with existing agents

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50) DEFAULT 'regular' CHECK (agent_type IN ('regular', 'bedrock'));

-- Update existing agents to have explicit 'regular' type
UPDATE agents SET agent_type = 'regular' WHERE agent_type IS NULL;