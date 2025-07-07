#!/bin/bash
set -e

echo "Starting SignalWire Agent Builder Backend..."

# Run migrations once before starting workers
echo "Running database migrations..."
python3.11 -c "
import asyncio
import sys
sys.path.insert(0, '/app')
from backend.core.migrations import run_migrations_on_startup

async def run():
    try:
        await run_migrations_on_startup()
        print('Migrations completed successfully')
    except Exception as e:
        print(f'Migration failed: {e}')
        sys.exit(1)

asyncio.run(run())
"

# Start the backend with uvicorn
echo "Starting API server with 4 workers..."
exec python3.11 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4