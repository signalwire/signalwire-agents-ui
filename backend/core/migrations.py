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
    # Add new migrations here
]


async def run_migrations(db: AsyncSession):
    """Run all pending database migrations."""
    scripts_dir = Path(__file__).parent.parent.parent / "scripts"
    # Also try the mounted scripts directory
    if not scripts_dir.exists():
        scripts_dir = Path("/app/scripts")
    
    for migration_file in MIGRATIONS:
        migration_path = scripts_dir / migration_file
        
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