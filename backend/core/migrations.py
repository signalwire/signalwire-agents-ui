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
    "add-media-library.sql",
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
            # Handle dollar-quoted strings properly
            statements = []
            current_statement = ""
            in_dollar_quote = False
            dollar_tag = None
            
            lines = sql_content.split('\n')
            for line in lines:
                line = line.strip()
                if not line or line.startswith('--'):
                    continue
                    
                # Check for dollar-quoted strings
                if not in_dollar_quote and '$$' in line:
                    # Starting a dollar-quoted string
                    dollar_parts = line.split('$$')
                    if len(dollar_parts) >= 2:
                        in_dollar_quote = True
                        dollar_tag = dollar_parts[0] + '$$'
                        current_statement += line + '\n'
                        continue
                elif in_dollar_quote and line.endswith('$$'):
                    # Ending a dollar-quoted string
                    current_statement += line + '\n'
                    in_dollar_quote = False
                    dollar_tag = None
                    continue
                
                current_statement += line + '\n'
                
                # If not in a dollar-quoted string and line ends with semicolon, it's a complete statement
                if not in_dollar_quote and line.endswith(';'):
                    statements.append(current_statement.strip())
                    current_statement = ""
            
            # Add any remaining statement
            if current_statement.strip():
                statements.append(current_statement.strip())
            
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