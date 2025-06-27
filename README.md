# SignalWire Agent Builder UI

A mobile-first, web-based interface for building and managing SignalWire AI agents without writing code.

## Features

- Visual agent configuration with drag-and-drop skills
- Mobile-first responsive design
- Token-based authentication
- Real-time SWML preview
- Admin panel for system configuration

## Quick Start

1. Copy the environment file and configure:
```bash
cp .env.example .env
# Edit .env with your settings
```

2. Ensure certificates are in place:
```bash
# The system expects /certs/server.pem to exist
```

3. Start the application:
```bash
docker-compose up -d
```

4. Access the application at:
```
https://tatooine.cantina.cloud:8430
```

## Development

### Prerequisites

- Docker and Docker Compose
- Node.js 20.x (installed via setup script)
- Python 3.11
- PostgreSQL client tools

### Project Structure

- `backend/` - FastAPI backend application
- `frontend/` - React frontend with Tailwind CSS
- `docker/` - Docker configuration files
- `scripts/` - Setup and utility scripts

### API Endpoints

- `POST /api/auth/login` - Authenticate with token
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create new agent
- `PUT /api/agents/{id}` - Update agent
- `DELETE /api/agents/{id}` - Delete agent
- `GET /agents/{id}/swml` - Get SWML document (public)

## Security

- All API endpoints require token authentication
- HTTPS only with TLS 1.2+
- Rate limiting configured per endpoint
- CORS configured for frontend origin only

## Database Management

Access the database:
```bash
docker-compose exec db psql -U agent_builder
```

Backup database:
```bash
docker-compose exec db pg_dump -U agent_builder agent_builder > backup.sql
```

Restore database:
```bash
docker-compose exec db psql -U agent_builder agent_builder < backup.sql
```

## License

Proprietary - SignalWire