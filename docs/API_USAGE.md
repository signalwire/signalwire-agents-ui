# API Usage Guide

## Fetching Agents

When fetching agents from the API, the response includes an `agent_type` field that indicates whether an agent is a "regular" (SignalWire Native) or "bedrock" (Amazon Bedrock) agent.

### Example Response

```json
GET /api/agents

[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Support Agent",
    "description": "Customer support agent",
    "agent_type": "regular",
    "config": {
      "agent_type": "regular",
      "voice": "nova",
      "language": "en-US",
      "engine": "elevenlabs",
      "languages": [...],
      "prompt_sections": [...],
      "skills": [...]
    },
    "created_at": "2025-01-14T12:00:00Z",
    "updated_at": "2025-01-14T12:00:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Bedrock Voice Agent",
    "description": "Voice-to-voice agent",
    "agent_type": "bedrock",
    "config": {
      "agent_type": "bedrock",
      "voice_id": "tiffany",
      "voice": "tiffany",
      "language": "en-US",
      "engine": "bedrock",
      "prompt_sections": [...],
      "skills": [...]
    },
    "created_at": "2025-01-14T12:30:00Z",
    "updated_at": "2025-01-14T12:30:00Z"
  }
]
```

## Key Differences Between Agent Types

### SignalWire Native Agents (agent_type: "regular")
- Support multiple languages configuration
- Support hints and pronunciations
- Support custom LLM parameters
- Use various TTS engines (elevenlabs, rime, etc.)

### Amazon Bedrock Agents (agent_type: "bedrock")
- Use voice-to-voice model with native voice handling
- Limited to specific voice models: tiffany, matthew, amy, lupe, carlos
- Do not support:
  - Multiple languages (handled natively by voice)
  - Hints (processed by voice model)
  - Pronunciations (handled by voice model)
  - Custom LLM parameters
- Use `voice_id` field for voice selection
- Can have custom parameters in the config

## Creating a Bedrock Agent

```json
POST /api/agents
{
  "name": "My Bedrock Agent",
  "description": "Voice-to-voice agent",
  "config": {
    "agent_type": "bedrock",
    "voice_id": "tiffany",
    "prompt_sections": [
      {
        "title": "Main Instructions",
        "body": "You are a helpful assistant."
      }
    ],
    "skills": [],
    "params": {
      "custom_param": "value"
    }
  }
}
```

## Frontend Integration

When displaying agents in the frontend:

1. Always check the `agent_type` field from the API response
2. Display appropriate UI based on agent type:
   - "regular" → Show as "SignalWire Native Agent"
   - "bedrock" → Show as "Amazon Bedrock Agent"
3. Hide incompatible configuration sections for Bedrock agents

Example TypeScript usage:

```typescript
const agents = await agentsApi.list()

agents.forEach(agent => {
  const agentType = agent.agent_type || 'regular' // Default to regular if not specified
  
  if (agentType === 'bedrock') {
    // Show Bedrock-specific UI
    // Hide languages, hints, pronunciations
  } else {
    // Show full configuration UI
  }
})
```