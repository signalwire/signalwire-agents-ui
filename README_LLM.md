# SignalWire Agent Builder - LLM Developer Guide

This document provides a comprehensive overview of the SignalWire Agent Builder codebase for Large Language Models (LLMs) working on this project. It details the architecture, file structure, key components, and development workflow.

## Project Overview

SignalWire Agent Builder is a production web application for creating and managing AI agents that handle voice calls using SignalWire's telephony infrastructure. The application features:

- **Agent Management**: Create, edit, and configure AI voice agents
- **SWML Generation**: Generates SignalWire Markup Language configurations for agents
- **Media Library**: Upload and manage audio/video files for agent responses
- **Knowledge Base**: Vector-based document search for agent context
- **Call Summaries**: Recording and analysis of agent conversations
- **Real-time Updates**: SSE-based live updates across users
- **Auto-reload**: Automatic frontend refresh on backend updates

## Technology Stack

### Backend
- **FastAPI** (Python 3.11): Async web framework
- **PostgreSQL + pgvector**: Database with vector search capabilities
- **SQLAlchemy**: Async ORM
- **Alembic**: Database migrations
- **SignalWire SDK**: Custom SDK for agent functionality
- **SSE (Server-Sent Events)**: Real-time updates
- **Docker**: Containerization

### Frontend
- **React 18** with TypeScript
- **Vite**: Build tool and dev server
- **TanStack Query**: Data fetching and caching
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library
- **React Router**: Client-side routing

## Directory Structure

```
/usr/local/home/devuser/src/signalwire-agent-builder/signalwire-agents-ui/
├── backend/                    # FastAPI backend application
│   ├── api/                   # API endpoint routers
│   │   ├── admin.py          # Admin panel endpoints
│   │   ├── agents.py         # Agent CRUD operations
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── call_summaries.py # Call recording management
│   │   ├── changes.py        # SSE real-time updates
│   │   ├── env_vars.py       # Environment variable management
│   │   ├── knowledge_bases.py # Knowledge base CRUD
│   │   ├── media.py          # Media library endpoints
│   │   ├── skills.py         # Agent skills management
│   │   ├── swaig.py          # SWAIG webhook handlers
│   │   └── swml.py           # SWML generation endpoints
│   ├── core/                  # Core utilities
│   │   ├── audit.py          # Audit logging
│   │   ├── config.py         # Settings management
│   │   ├── database.py       # Database connection
│   │   └── security.py       # JWT and auth utilities
│   ├── migrations/            # Database schema migrations
│   ├── services/              # Business logic services
│   │   ├── document_processor.py # Document parsing for KB
│   │   ├── embedding_service.py  # Vector embeddings
│   │   └── websearch_service.py  # Web search integration
│   ├── skills/               # Custom agent skills
│   ├── auth.py              # Authentication logic
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # SQLAlchemy models
│   └── requirements.txt     # Python dependencies
│
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── api/             # API client modules
│   │   │   ├── client.ts    # Axios configuration
│   │   │   ├── agents.ts    # Agent API calls
│   │   │   ├── media.ts     # Media API calls
│   │   │   └── ...
│   │   ├── components/      # Reusable UI components
│   │   │   ├── admin/       # Admin panel components
│   │   │   ├── agents/      # Agent-related components
│   │   │   ├── layout/      # Layout components
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── contexts/        # React context providers
│   │   │   ├── AuthContext.tsx    # Authentication state
│   │   │   └── BackendContext.tsx # Backend connection state
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── useAgentChanges.tsx # SSE updates hook
│   │   ├── pages/           # Page components
│   │   │   ├── Agents.tsx   # Agent listing page
│   │   │   ├── AgentEditor.tsx # Agent configuration
│   │   │   ├── MediaLibrary.tsx # Media management
│   │   │   └── Admin.tsx    # Admin panel
│   │   ├── lib/             # Utility functions
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # React entry point
│   ├── public/              # Static assets
│   ├── package.json         # Node dependencies
│   └── vite.config.ts       # Vite configuration
│
├── docker/                    # Docker configuration
│   ├── Dockerfile           # Multi-stage build
│   ├── nginx.conf           # Nginx reverse proxy
│   └── supervisord.conf     # Process management
│
├── scripts/                   # Utility scripts
│   ├── init-db.sql          # Database initialization
│   ├── start-backend.sh     # Backend startup script
│   └── test-*.sh            # Various test scripts
│
├── tools/                     # Development tools
│   ├── api_tool.py          # Interactive API testing tool
│   └── api_tool_usage.md    # API tool documentation
│
├── signalwire-agents/        # Local SDK (if present)
│   └── signalwire_agents/   # SDK Python package
│       └── skills/          # Available agent skills
│
├── certs/                    # SSL certificates
├── docker-compose.yml        # Container orchestration
├── rebuild.sh               # Quick rebuild script
├── .env.example             # Environment template
└── CLAUDE.md                # Project-specific instructions
```

## Key Files and Their Purpose

### Backend Core Files

**backend/main.py**
- FastAPI application setup
- Router registration
- Middleware configuration
- Health check endpoint with build version

**backend/models.py**
- SQLAlchemy ORM models
- Database schema definitions
- Relationships between entities

**backend/auth.py**
- JWT token validation
- User authentication logic
- Token generation and verification

**backend/core/config.py**
- Pydantic settings management
- Environment variable handling
- Build version tracking

### Frontend Core Files

**frontend/src/App.tsx**
- Main application component
- Route definitions
- Context providers setup
- Backend status overlay

**frontend/src/contexts/BackendContext.tsx**
- Backend connection state management
- Health check monitoring
- Auto-reload on version change

**frontend/src/hooks/useAgentChanges.tsx**
- SSE connection management
- Real-time update handling
- Build version comparison for auto-reload

### API Endpoints

**Agent Management**
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create new agent
- `GET /api/agents/{id}` - Get agent details
- `PUT /api/agents/{id}` - Update agent
- `DELETE /api/agents/{id}` - Delete agent

**SWML Generation**
- `GET /agents/{id}/swml` - Get agent's SWML configuration
- `POST /api/swml/test` - Test SWML generation

**Media Library**
- `GET /api/media` - List media files
- `POST /api/media/upload` - Upload file
- `POST /api/media/import` - Import from URL
- `DELETE /api/media/{id}` - Delete file

**Knowledge Base**
- `GET /api/knowledge-bases` - List knowledge bases
- `POST /api/knowledge-bases` - Create KB
- `POST /api/knowledge-bases/{id}/documents` - Upload documents
- `POST /api/knowledge-bases/{id}/search` - Vector search

**Real-time Updates**
- `GET /api/changes/stream` - SSE endpoint for live updates

## Development Workflow

### Starting the Application
```bash
# Copy environment template
cp .env.example .env

# Start all services
docker-compose up -d

# Or rebuild and start
./rebuild.sh
```

### Making Changes

1. **Backend Changes**:
   - Edit Python files in `backend/`
   - Run `./rebuild.sh` to apply changes
   - Frontend will auto-reload due to version tracking

2. **Frontend Changes**:
   - Edit TypeScript/React files in `frontend/src/`
   - Run `./rebuild.sh` to apply changes
   - Changes require rebuild due to Docker setup

3. **Database Changes**:
   - Add migration files to `backend/migrations/`
   - Migrations run automatically on startup

### Key Features Implementation

**Agent Configuration**
- Agents are configured with parameters, functions, and prompts
- SWML is generated dynamically based on configuration
- Supports post-prompt responses and custom skills

**Media Library**
- Files stored in `/app/data/media/audio|video/`
- Supports upload and URL import
- Floating player for desktop, fullscreen for mobile

**Knowledge Base**
- Documents parsed and embedded using sentence-transformers
- Vector search using pgvector extension
- Supports multiple document types (PDF, DOCX, TXT, etc.)

**Real-time Updates**
- SSE connection established on app load
- Broadcasts agent changes to all connected clients
- Filters out own changes to reduce noise

**Authentication**
- JWT-based authentication
- Tokens stored in httpOnly cookies
- Admin tokens for API access

## Important Patterns

### API Client Pattern
```typescript
// All API calls go through configured axios client
import { apiClient } from '@/api/client'

const response = await apiClient.get('/agents')
```

### Error Handling
- Backend returns structured error responses
- Frontend displays errors via toast notifications
- Validation errors include field-specific messages

### State Management
- React Query for server state
- Context API for global client state
- No Redux/Zustand - keeping it simple

### File Organization
- Components grouped by feature
- Shared UI components in `components/ui/`
- API calls centralized in `api/` directory

## Docker Architecture

The application uses a multi-container setup:

1. **db**: PostgreSQL with pgvector extension
2. **app**: Combined frontend + backend container
   - Nginx serves frontend and proxies API calls
   - Uvicorn runs FastAPI backend
   - Supervisor manages both processes

## Security Considerations

- HTTPS enforced with self-signed certificates
- JWT tokens for authentication
- CORS configured for production use
- Rate limiting on API endpoints
- SQL injection prevention via SQLAlchemy
- XSS prevention via React

## Performance Optimizations

- Frontend code splitting and lazy loading
- API response caching with React Query
- Database connection pooling
- Embedding model preloaded on startup
- Docker layer caching for faster builds

## Troubleshooting

**Common Issues**:
1. "Backend not available" - Backend is restarting, wait a moment
2. Double `/api/api/` paths - Check frontend API client configuration
3. Media not playing on mobile - Known Safari codec limitations
4. Disk space errors - Run `docker system prune -af`

**Debugging**:
- Backend logs: `docker-compose logs -f app`
- Database queries: Enable SQLAlchemy echo
- Frontend: Browser DevTools console
- SSE connections: Network tab in DevTools

## Testing

- API tests: `./test-api.sh`
- Individual endpoints: `./scripts/test-*.sh`
- Interactive API tool: `python3 tools/api_tool.py`
- Frontend: No automated tests yet
- Manual testing recommended for UI changes

### API Testing Tool

The `tools/api_tool.py` provides an interactive way to test API endpoints:

```bash
# Run interactively
python3 tools/api_tool.py

# Direct commands
python3 tools/api_tool.py agents     # List all agents
python3 tools/api_tool.py media      # List media files
python3 tools/api_tool.py kb         # List knowledge bases
python3 tools/api_tool.py system     # Get system info
```

Features:
- Automatic JWT authentication
- Interactive menu for common operations
- Direct command mode for scripting
- Pretty-printed JSON responses
- Handles self-signed certificates

See `tools/api_tool_usage.md` for detailed usage instructions.

## Future Improvements

1. Add comprehensive test suite
2. Implement CI/CD pipeline
3. Add request/response logging
4. Improve error messages
5. Add user management UI
6. Implement proper video transcoding for mobile
7. Add Swagger/OpenAPI documentation