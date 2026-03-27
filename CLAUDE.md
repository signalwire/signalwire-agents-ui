## IMPORTANT: This is a Production Application

This is the SignalWire Agent Builder - a real, production application for building and managing AI agents. Treat it with the respect and care of production code.

## Development Memories

- Run docker compose with build and detached mode: `docker-compose up --build -d`
- **IMPORTANT**: Everything runs in Docker containers. Code changes require rebuilding:
  - Use `./rebuild.sh` to apply code changes (both frontend and backend)
  - Simply restarting containers will NOT apply code changes
  - The UI runs in Docker, not directly on the host
  - Frontend is built during the Docker build process

## Database Connection Info
- **Database User**: agent_builder
- **Database Name**: agent_builder
- **Password**: changeme (or from DB_PASSWORD env var)
- **Connection**: `docker-compose exec db psql -U agent_builder -d agent_builder`

## API Testing
- **Default Auth Token**: admin-token-changeme
- **Test Script**: `./test-api.sh [agents|summaries|agent-summaries|create-agent|all]`
- **Python API Tool**: Interactive testing tool in `untracked/api_tool.py`
  ```bash
  # Interactive mode
  python3 untracked/api_tool.py
  
  # Direct commands
  python3 untracked/api_tool.py agents     # List agents
  python3 untracked/api_tool.py media      # List media
  python3 untracked/api_tool.py kb         # List knowledge bases
  python3 untracked/api_tool.py system     # Get system info
  ```
- **Manual Auth**: 
  ```bash
  curl -k -X POST https://localhost:8430/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"token": "admin-token-changeme"}'
  ```

## Project Directory Structure

**IMPORTANT**: The project root is `/usr/local/home/devuser/src/signalwire-agents-ui/`

### Main Project Structure:
```
/usr/local/home/devuser/src/signalwire-agents-ui/
├── ./          # Main Docker project (this is the git repo)
│   ├── backend/                   # FastAPI backend
│   │   ├── api/                   # API endpoints
│   │   ├── core/                  # Core utilities (auth, db, security, etc)
│   │   ├── migrations/            # Database migrations
│   │   ├── services/              # Business logic services
│   │   └── skills/                # Skills definitions
│   ├── frontend/                  # React frontend
│   │   ├── src/
│   │   │   ├── pages/            # Page components
│   │   │   ├── components/       # Reusable components
│   │   │   ├── api/              # API client code
│   │   │   └── lib/              # Utilities
│   │   └── public/
│   ├── docker/                    # Docker configuration files
│   ├── scripts/                   # Utility scripts
│   ├── signalwire-python/         # SignalWire Python SDK (submodule/subdirectory)
│   │   └── signalwire_agents/     # The actual SDK package
│   │       └── skills/            # SDK skills including native_vector_search.py
│   ├── docker-compose.yml
│   └── rebuild.sh                 # Script to rebuild Docker containers
```

### Key File Locations:
- Backend code: `/usr/local/home/devuser/src/signalwire-agents-ui/signalwire-agents-ui/backend/`
- Frontend code: `/usr/local/home/devuser/src/signalwire-agents-ui/signalwire-agents-ui/frontend/`
- SignalWire SDK: `/usr/local/home/devuser/src/signalwire-agents-ui/signalwire-agents-ui/signalwire-python/`
- Docker compose: `/usr/local/home/devuser/src/signalwire-agents-ui/signalwire-agents-ui/docker-compose.yml`

**DO NOT** get confused by similar directory names elsewhere in the src directory!

## UI Development Rules

- **NEVER use browser native dialogs**: Do not use `window.confirm()`, `window.alert()`, or `window.prompt()`
- **Always use UI components**: Use the ConfirmationDialog component for confirmations, toast for notifications
- **Mobile-first design**: Ensure all UI components are responsive and work well on mobile devices
