#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."

# Wait for postgres to be ready and have the base schema
until PGPASSWORD=$DB_PASSWORD psql -h db -U agent_builder -d agent_builder -c "SELECT 1 FROM agents LIMIT 1;" > /dev/null 2>&1; do
  echo "PostgreSQL is unavailable or schema not ready - sleeping"
  sleep 2
done

echo "PostgreSQL is ready with schema!"

# Run Alembic migrations
echo "Running Alembic migrations..."
cd /app

# Check if alembic_version table exists with data (has Alembic run before?)
ALEMBIC_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h db -U agent_builder -d agent_builder -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='alembic_version';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$ALEMBIC_COUNT" = "0" ]; then
  # First time — stamp current schema so Alembic doesn't try to recreate everything
  echo "First Alembic run — stamping current schema as head..."
  python3.11 -m alembic stamp head || echo "WARNING: alembic stamp failed"
else
  # Check if there's actually a version recorded
  VER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h db -U agent_builder -d agent_builder -t -c \
    "SELECT COUNT(*) FROM alembic_version;" 2>/dev/null | tr -d ' ' || echo "0")
  if [ "$VER_COUNT" = "0" ]; then
    echo "Alembic table exists but empty — stamping head..."
    python3.11 -m alembic stamp head || echo "WARNING: alembic stamp failed"
  else
    echo "Applying pending migrations..."
    python3.11 -m alembic upgrade head || echo "WARNING: alembic upgrade failed"
  fi
fi

echo "Migrations complete."

# Start the application using supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
