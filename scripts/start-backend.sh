#!/bin/bash
set -e

echo "Starting SignalWire Agent Builder Backend..."

# Database migrations are now handled by the database container during initialization
# The app-entrypoint.sh script ensures the database is ready before we start

# Start the backend with uvicorn
echo "Starting API server with 4 workers..."
exec python3.11 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4