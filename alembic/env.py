"""Alembic environment configuration."""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Add the project root to sys.path so we can import backend modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.core.database import Base
from backend import models  # noqa: F401 — registers all models with Base.metadata

# Alembic Config object
config = context.config

# Set up logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata from our models
target_metadata = Base.metadata

# Get database URL from environment (sync driver for Alembic)
database_url = os.getenv(
    "DATABASE_URL",
    "postgresql://agent_builder:changeme@localhost:5432/agent_builder"
)
# Alembic uses sync psycopg2, not asyncpg
if "+asyncpg" in database_url:
    database_url = database_url.replace("+asyncpg", "")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — generates SQL without connecting."""
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode — connects to the database."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = database_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
