#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."

# Wait for postgres to be ready and have the schema
until PGPASSWORD=$DB_PASSWORD psql -h db -U agent_builder -d agent_builder -c "SELECT 1 FROM agents LIMIT 1;" > /dev/null 2>&1; do
  echo "PostgreSQL is unavailable or schema not ready - sleeping"
  sleep 2
done

echo "PostgreSQL is ready with schema!"

# Start the application using supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf