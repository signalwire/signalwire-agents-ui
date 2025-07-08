# API Tool Usage

A simple Python tool for testing the SignalWire Agent Builder API.

## Quick Start

```bash
# Run interactively
python3 tools/api_tool.py

# Direct commands
python3 tools/api_tool.py agents     # List all agents
python3 tools/api_tool.py media      # List media files
python3 tools/api_tool.py kb         # List knowledge bases
python3 tools/api_tool.py system     # Get system info
```

## Environment Variables

```bash
# Set custom API URL (default: https://localhost:8430)
export API_BASE_URL=https://your-domain.com:8430

# Set auth token (default: admin-token-changeme)
export API_AUTH_TOKEN=your-token
```

## Features

- Automatic JWT authentication
- Stores JWT in environment variable for reuse
- Interactive menu for common operations
- Direct command mode for scripting
- Handles self-signed certificates
- Pretty-prints JSON responses

## Interactive Commands

1. List agents
2. Get agent details
3. Create test agent
4. List media files
5. List knowledge bases
6. Get call summaries
7. Get system info
8. Custom GET request
9. Custom POST request

## Python Usage

```python
from api_tool import AgentBuilderAPI

# Initialize and login
api = AgentBuilderAPI()
api.login()

# List agents
agents = api.list_agents()

# Create agent
agent = api.create_agent("Test Agent", {
    "voice": {"engine": "elevenlabs", "voice": "rachel"},
    "prompt": {"sections": [{"title": "Role", "body": "You are helpful"}]}
})

# Custom requests
result = api.get('/api/agents/123')
result = api.post('/api/media/import', {'url': 'https://example.com/audio.mp3'})
```