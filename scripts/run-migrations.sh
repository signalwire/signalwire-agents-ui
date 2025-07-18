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

# Function to verify table exists
table_exists() {
    local table_name=$1
    local result=$($PSQL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$table_name';" 2>/dev/null || echo "0")
    [ "$result" -gt 0 ]
}

# Function to verify migration results
verify_migration() {
    local version=$1
    
    case "$version" in
        "add-env-vars-table")
            if ! table_exists "env_vars"; then
                echo -e "${RED}[VERIFY FAILED]${NC} Table 'env_vars' not found after migration"
                return 1
            fi
            ;;
        "add-media-library")
            if ! table_exists "media_files" || ! table_exists "media_usage" || ! table_exists "system_settings"; then
                echo -e "${RED}[VERIFY FAILED]${NC} Media library tables not found after migration"
                echo "Expected tables: media_files, media_usage, system_settings"
                echo "Checking individual tables:"
                table_exists "media_files" && echo "  ✓ media_files exists" || echo "  ✗ media_files missing"
                table_exists "media_usage" && echo "  ✓ media_usage exists" || echo "  ✗ media_usage missing"
                table_exists "system_settings" && echo "  ✓ system_settings exists" || echo "  ✗ system_settings missing"
                return 1
            fi
            ;;
        "add-pgvector-knowledge-base")
            if ! table_exists "knowledge_bases" || ! table_exists "kb_chunks"; then
                echo -e "${RED}[VERIFY FAILED]${NC} Knowledge base tables not found after migration"
                return 1
            fi
            ;;
        "add-agent-type")
            # Verify agent_type column exists
            local result=$($PSQL -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='agents' AND column_name='agent_type';" 2>/dev/null || echo "0")
            if [ "$result" -eq 0 ]; then
                echo -e "${RED}[VERIFY FAILED]${NC} Column 'agent_type' not found in agents table"
                return 1
            fi
            ;;
        "test-migration-system")
            if ! table_exists "migration_test"; then
                echo -e "${RED}[VERIFY FAILED]${NC} Table 'migration_test' not found after migration"
                return 1
            fi
            # Verify test data was inserted
            local result=$($PSQL -t -c "SELECT COUNT(*) FROM migration_test WHERE test_value='system_verified';" 2>/dev/null || echo "0")
            if [ "$result" -eq 0 ]; then
                echo -e "${RED}[VERIFY FAILED]${NC} Test data not found in migration_test table"
                return 1
            fi
            ;;
    esac
    
    echo -e "${GREEN}[VERIFY OK]${NC} Migration '$version' verification passed"
    return 0
}

# Function to apply a migration
apply_migration() {
    local version=$1
    local file=$2
    local description=$3
    
    # Skip if already applied and verification passes
    if migration_applied "$version"; then
        echo -e "${YELLOW}[SKIP]${NC} Migration '$version' already applied"
        # Verify the migration actually worked
        if verify_migration "$version"; then
            return 0
        else
            echo -e "${YELLOW}[RETRY]${NC} Migration '$version' was marked applied but verification failed. Re-applying..."
            # Remove the failed migration record
            $PSQL -c "DELETE FROM schema_migrations WHERE version = '$version';" >/dev/null 2>&1
        fi
    fi
    
    echo -e "${GREEN}[RUN]${NC} Applying migration: $version"
    
    # Calculate checksum
    local checksum=$(calculate_checksum "$file")
    
    # Apply the migration in a transaction
    if $PSQL <<EOF
BEGIN;

-- Apply the migration
\i $file

COMMIT;
EOF
    then
        # Verify the migration worked
        if verify_migration "$version"; then
            # Record the successful migration
            $PSQL -c "INSERT INTO schema_migrations (version, checksum, description) VALUES ('$version', '$checksum', '$description');" >/dev/null 2>&1
            echo -e "${GREEN}[OK]${NC} Migration '$version' applied and verified successfully"
        else
            echo -e "${RED}[ERROR]${NC} Migration '$version' applied but verification failed"
            exit 1
        fi
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