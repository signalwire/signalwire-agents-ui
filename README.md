# SignalWire Agent Builder UI

A mobile-first, web-based interface for building and managing SignalWire AI agents without writing code.

## Features

### Core Features
- Visual agent configuration with drag-and-drop skills
- Mobile-first responsive design with desktop optimization
- Token-based authentication with admin panel
- Real-time SWML preview
- Multi-language support with voice configuration
- Knowledge base integration with pgvector search
- Media library for audio/video file management
- Call summary tracking and analytics
- Environment variable management
- Advanced AI parameter configuration

### Agent Configuration
- **Prompt Builder**: Visual prompt sections with drag-and-drop ordering
- **Skills Selector**: Browse and configure built-in and custom skills
- **Voice & Language**: Support for multiple TTS engines and languages
- **AI Parameters**: Fine-tune LLM behavior with temperature, token limits, etc.
- **Knowledge Bases**: Attach multiple knowledge bases with custom configurations
- **Media Library**: Upload and manage audio/video files for agent responses
- **Recording**: Configure call recording with format options
- **Post-Prompt**: Set up conversation summaries and webhooks
- **Contexts & Steps**: Define conversation flow and data collection
- **Native Functions**: Enable built-in SignalWire functions
- **Custom Pronunciations**: Define how specific words should be pronounced
- **Global Data**: Set data available throughout conversations
- **Hints**: Configure simple and pattern-based recognition hints

### Administrative Features
- Token management with role-based access
- System information and health monitoring
- Global settings configuration
- Environment variable management
- Media library settings and quotas
- Audit logging for all actions

## Quick Start

1. Copy the environment file and configure:
```bash
cp .env.example .env
# Edit .env with your settings
```

2. Ensure certificates are in place:
```bash
# The system expects /certs/server.pem to exist
# For development, a self-signed certificate is included
```

3. Start the application:
```bash
docker-compose up -d
```

4. Access the application at:
```
https://your-domain.com:8430
```

Default login token: `admin-token-changeme`

## Environment Configuration

The application uses environment variables for configuration. Copy `.env.example` to `.env` and configure:

```bash
# Database
DB_PASSWORD=your-secure-database-password

# Security  
JWT_SECRET=your-long-random-jwt-secret-key-here
SIGNALWIRE_JWT_SECRET=your-signalwire-jwt-secret-key-here

# Server Configuration
HOSTNAME=your-domain.example.com
PORT=8430
API_PORT=8000

# Rate Limiting
RATE_LIMIT_API=100
RATE_LIMIT_SWML=1000

# Development
NODE_ENV=production
```

## Persistent Storage

The application uses Docker named volumes for persistent storage:

1. **Media Storage** (`media_storage`): 
   - Path: `/app/data/media`
   - Contains uploaded audio/video files
   - Organized in `/audio` and `/video` subdirectories

2. **Knowledge Base Storage** (`kb_storage`):
   - Path: `/app/data/knowledge_base`
   - Contains uploaded documents for vector search
   - Organized by knowledge base UUID

3. **PostgreSQL Database** (`postgres_data`):
   - Path: `/var/lib/postgresql/data`
   - Contains all application data

4. **Application Logs** (`app_logs`):
   - Path: `/app/logs`
   - Contains application log files

### Backing Up Data

To backup media files:
```bash
docker run --rm -v signalwire-agents-ui_media_storage:/data -v $(pwd):/backup busybox tar czf /backup/media-backup.tar.gz /data
```

To backup the database:
```bash
docker-compose exec db pg_dump -U agent_builder agent_builder > backup.sql
```

## Development

### Prerequisites

- Docker and Docker Compose
- Node.js 20.x (for local development)
- Python 3.11
- PostgreSQL client tools

### Project Structure

```
signalwire-agents-ui/
├── backend/              # FastAPI backend application
│   ├── api/             # API endpoints
│   ├── core/            # Core utilities
│   ├── services/        # Business logic
│   └── migrations/      # Database migrations
├── frontend/            # React frontend with TypeScript
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable components
│   │   └── api/        # API client
│   └── public/         # Static assets
├── docker/              # Docker configuration
├── scripts/             # Utility scripts
└── signalwire-agents/   # SignalWire SDK (submodule)
```

### Rebuilding the Application

To rebuild after making changes:
```bash
./rebuild.sh
```

This script handles:
- Detecting SDK changes and cache busting
- Building frontend assets
- Rebuilding Docker images
- Restarting containers

### API Endpoints

#### Authentication
- `POST /api/auth/login` - Login with token
- `POST /api/auth/refresh` - Refresh JWT token

#### Agents
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create new agent
- `GET /api/agents/{id}` - Get agent details
- `PUT /api/agents/{id}` - Update agent
- `DELETE /api/agents/{id}` - Delete agent
- `GET /agents/{id}/swml` - Get SWML document (public)

#### Knowledge Bases
- `GET /api/knowledge-bases` - List knowledge bases
- `POST /api/knowledge-bases` - Create knowledge base
- `GET /api/knowledge-bases/{id}` - Get knowledge base details
- `POST /api/knowledge-bases/{id}/documents` - Upload documents
- `POST /api/agents/{agent_id}/knowledge-bases` - Attach knowledge base to agent

#### Media Library
- `GET /api/media` - List media files
- `POST /api/media/upload` - Upload media file
- `POST /api/media/import` - Import from URL
- `DELETE /api/media/{id}` - Delete media file
- `GET /api/media/{id}/usage` - Get usage information

#### Call Summaries
- `GET /api/agents/{agent_id}/summaries` - Get agent call summaries
- `GET /api/agents/{agent_id}/summaries/{id}` - Get detailed summary
- `GET /api/call-summaries` - Get all call summaries
- `POST /api/call-summaries` - Create call summary (webhook)

#### Administration
- `GET /api/admin/tokens` - List tokens
- `POST /api/admin/tokens` - Create token
- `DELETE /api/admin/tokens/{id}` - Delete token
- `GET /api/admin/settings` - Get global settings
- `PUT /api/admin/settings` - Update settings
- `GET /api/admin/system` - Get system information

## Security

- All API endpoints require JWT authentication (except SWML endpoints)
- HTTPS only with TLS 1.2+ enforced
- Rate limiting configured per endpoint type
- CORS configured for security
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- XSS protection headers
- CSRF protection for state-changing operations

## Testing

Run the API test suite:
```bash
./test-api.sh all
```

Test specific components:
```bash
./test-api.sh agents
./test-api.sh summaries
./test-api.sh media
```

## Database Management

Access the database:
```bash
docker-compose exec db psql -U agent_builder -d agent_builder
```

Run migrations:
```bash
docker-compose exec app python -m backend.core.migrations
```

## Monitoring

View application logs:
```bash
docker-compose logs -f app
```

View nginx access logs:
```bash
docker-compose exec app tail -f /var/log/nginx/access.log
```

View nginx error logs:
```bash
docker-compose exec app tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Common Issues

1. **Cannot access the application**
   - Check that Docker containers are running: `docker-compose ps`
   - Verify the hostname and port in your `.env` file
   - Check firewall rules for port 8430

2. **Authentication failures**
   - Ensure JWT_SECRET is set in `.env`
   - Check token expiration (default 1 hour)
   - Verify the token format in the Authorization header

3. **Media upload failures**
   - Check file size limits (50MB audio, 200MB video)
   - Verify allowed file types (MP3, WAV, OGG, MP4, WebM)
   - Ensure media storage volume has sufficient space

4. **Database connection errors**
   - Verify DB_PASSWORD matches in `.env` and docker-compose.yml
   - Check that the database container is healthy
   - Ensure migrations have been run

### Debug Mode

To enable debug logging, set in your `.env`:
```bash
DEBUG=true
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Proprietary - SignalWire

## Support

For issues and feature requests, please contact the SignalWire support team or open an issue in the project repository.