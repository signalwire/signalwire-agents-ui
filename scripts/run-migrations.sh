#!/bin/bash
set -e

# Database connection parameters
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-agent_builder}"
DB_USER="${DB_USER:-agent_builder}"
DB_PASSWORD="${DB_PASSWORD:-changeme}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PostgreSQL connection string
export PGPASSWORD="$DB_PASSWORD"
PSQL="psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

echo "Starting database migration runner..."

# Function to check if a migration has been applied
migration_applied() {
    local version=$1
    local result=$($PSQL -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" 2>/dev/null || echo "0")
    [ "$result" -gt 0 ]
}

# Function to calculate file checksum
calculate_checksum() {
    local file=$1
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file" | cut -d' ' -f1
    else
        # Fallback for systems without sha256sum
        openssl dgst -sha256 "$file" | cut -d' ' -f2
    fi
}

# Function to apply a migration
apply_migration() {
    local version=$1
    local file=$2
    local description=$3
    
    # Skip if already applied
    if migration_applied "$version"; then
        echo -e "${YELLOW}[SKIP]${NC} Migration '$version' already applied"
        return 0
    fi
    
    echo -e "${GREEN}[RUN]${NC} Applying migration: $version"
    
    # Calculate checksum
    local checksum=$(calculate_checksum "$file")
    
    # Begin transaction
    $PSQL <<EOF
BEGIN;

-- Apply the migration
\i $file

-- Record the migration
INSERT INTO schema_migrations (version, checksum, description) 
VALUES ('$version', '$checksum', '$description');

COMMIT;
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK]${NC} Migration '$version' applied successfully"
    else
        echo -e "${RED}[ERROR]${NC} Failed to apply migration '$version'"
        exit 1
    fi
}

# Wait for database to be ready
echo "Waiting for database to be ready..."
until $PSQL -c '\q' 2>/dev/null; do
    echo "Database is not ready yet. Waiting..."
    sleep 2
done

echo "Database is ready. Starting migrations..."

# First, ensure migration tracking table exists
echo "Setting up migration tracking..."
$PSQL -f /app/backend/migrations/00-migration-tracking.sql >/dev/null 2>&1 || true

# Define migrations in order
# Format: version|filename|description
MIGRATIONS=(
    "base-schema|/app/backend/schema.sql|Initial database schema"
    "add-env-vars-table|/app/backend/migrations/add-env-vars-table.sql|Add environment variables table"
    "add-media-library|/app/backend/migrations/add-media-library.sql|Add media library tables"
    "add-pgvector-knowledge-base|/app/backend/migrations/add-pgvector-knowledge-base.sql|Add vector knowledge base support"
    "add-agent-type|/app/backend/migrations/add-agent-type.sql|Add Bedrock agent type support"
)

# Apply each migration
for migration in "${MIGRATIONS[@]}"; do
    IFS='|' read -r version file description <<< "$migration"
    apply_migration "$version" "$file" "$description"
done

echo -e "${GREEN}All migrations completed successfully!${NC}"

# Show migration status
echo -e "\nMigration Status:"
$PSQL -c "SELECT version, applied_at, description FROM schema_migrations ORDER BY applied_at;"