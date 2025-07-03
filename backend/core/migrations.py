"""Database migration runner."""
import asyncio
import logging
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

# List of migration files to run in order
MIGRATIONS = [
    "add-post-prompt-columns.sql",
    "add-env-vars-table.sql",
    "add-pgvector-knowledge-base.sql",
    # Add new migrations here
]


async def run_migrations(db: AsyncSession):
    """Run all pending database migrations."""
    # Try multiple paths for migrations
    possible_dirs = [
        Path(__file__).parent.parent / "migrations",  # backend/migrations
        Path("/app/backend/migrations"),  # Absolute path in container
        Path(__file__).parent.parent.parent / "scripts",  # Legacy scripts path
        Path("/app/scripts"),  # Legacy mounted scripts directory
    ]
    
    for migration_file in MIGRATIONS:
        migration_path = None
        for dir_path in possible_dirs:
            candidate = dir_path / migration_file
            if candidate.exists():
                migration_path = candidate
                break
        
        if not migration_path.exists():
            logger.warning(f"Migration file not found: {migration_file}")
            continue
            
        try:
            logger.info(f"Running migration: {migration_file}")
            
            # Read the SQL file
            with open(migration_path, 'r') as f:
                sql_content = f.read()
            
            # Execute the migration
            # Split by semicolon and execute each statement
            statements = [s.strip() for s in sql_content.split(';') if s.strip()]
            
            for statement in statements:
                if statement:
                    await db.execute(text(statement))
            
            await db.commit()
            logger.info(f"Successfully ran migration: {migration_file}")
            
        except Exception as e:
            # Log but don't fail - migrations use IF NOT EXISTS
            logger.warning(f"Migration {migration_file} had issues (this is usually OK): {e}")
            await db.rollback()


async def run_migrations_on_startup():
    """Run migrations using a new database connection."""
    from .database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        await run_migrations(db)