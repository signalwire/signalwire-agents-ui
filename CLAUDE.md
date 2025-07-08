## IMPORTANT: This is a Production Application

This is the SignalWire Agent Builder - a real, production application for building and managing AI agents. Treat it with the respect and care of production code.

## Development Memories

- **ALWAYS use `./rebuild.sh` to rebuild and restart the application**
- **NEVER run `docker-compose` commands directly without explicit user permission**
- **IMPORTANT**: Everything runs in Docker containers. Code changes require rebuilding:
  - Use `./rebuild.sh` to apply code changes (both frontend and backend)
  - Simply restarting containers will NOT apply code changes
  - The UI runs in Docker, not directly on the host
  - Frontend is built during the Docker build process
  - DO NOT use `docker-compose up`, `docker-compose build`, or `docker-compose restart` without asking the user first

## Database Connection Info
- **Database User**: agent_builder
- **Database Name**: agent_builder
- **Password**: changeme (or from DB_PASSWORD env var)
- **Connection**: `docker-compose exec db psql -U agent_builder -d agent_builder`
  - Note: This read-only command is safe to use without permission

## API Testing
- **Default Auth Token**: admin-token-changeme
- **Test Script**: `./test-api.sh [agents|summaries|agent-summaries|create-agent|all]`
- **Python API Tool**: Interactive testing tool in `tools/api_tool.py`
  ```bash
  # Interactive mode
  python3 tools/api_tool.py
  
  # Direct commands
  python3 tools/api_tool.py agents     # List agents
  python3 tools/api_tool.py media      # List media
  python3 tools/api_tool.py kb         # List knowledge bases
  python3 tools/api_tool.py system     # Get system info
  ```
- **Manual Auth**: 
  ```bash
  curl -k -X POST https://localhost:8430/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"token": "admin-token-changeme"}'
  ```

## Project Directory Structure

### Main Project Structure:
```
.                                  # Git root (signalwire-agents-ui)
├── backend/                       # FastAPI backend
│   ├── api/                       # API endpoints
│   ├── core/                      # Core utilities (auth, db, security, etc)
│   ├── migrations/                # Database migrations
│   ├── services/                  # Business logic services
│   └── skills/                    # Skills definitions
├── frontend/                      # React frontend
│   ├── src/
│   │   ├── pages/                # Page components
│   │   ├── components/           # Reusable components
│   │   ├── api/                  # API client code
│   │   └── lib/                  # Utilities
│   └── public/
├── docker/                        # Docker configuration files
├── scripts/                       # Utility scripts
├── tools/                         # Development tools
│   ├── api_tool.py               # Interactive API testing tool
│   └── api_tool_usage.md         # API tool documentation
├── signalwire-agents/             # SignalWire Agents SDK (submodule/subdirectory)
│   └── signalwire_agents/         # The actual SDK package
│       └── skills/                # SDK skills including native_vector_search.py
├── docker-compose.yml
└── rebuild.sh                     # Script to rebuild Docker containers
```

### Key File Locations:
- Backend code: `./backend/`
- Frontend code: `./frontend/`
- SignalWire SDK: `./signalwire-agents/`
- Docker compose: `./docker-compose.yml`
- Development tools: `./tools/`

## UI Development Rules

- **NEVER use browser native dialogs**: Do not use `window.confirm()`, `window.alert()`, or `window.prompt()`
- **Always use UI components**: Use the ConfirmationDialog component for confirmations, toast for notifications
- **Mobile-first design**: Ensure all UI components are responsive and work well on mobile devices

## Docker Management Rules

- **ALWAYS use `./rebuild.sh`** for any changes that require rebuilding
- **NEVER run these commands without explicit permission:**
  - `docker-compose build`
  - `docker-compose up`
  - `docker-compose down`
  - `docker-compose restart`
  - `docker build`
  - Any other Docker commands that modify containers or images
- **NEVER use blocking commands** in the normal Bash tool:
  - `docker-compose logs -f` (follows logs indefinitely)
  - `tail -f` (follows files indefinitely)
  - `watch` commands
  - Any other commands that block the terminal
  - **If you need blocking commands, use the shell MCP tool instead**
- **Safe commands** (can use without permission):
  - `docker-compose ps` (view status)
  - `docker-compose logs` (view logs WITHOUT -f flag)
  - `docker-compose exec db psql ...` (database access)
  - `tail -n 50 file.log` (view last lines WITHOUT -f)
  - Any other read-only, non-blocking Docker commands