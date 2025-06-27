"""Database models."""
from sqlalchemy import Column, String, Boolean, DateTime, JSON, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from .database import Base


class Token(Base):
    """Authentication tokens."""
    __tablename__ = "tokens"
    
    id = Column(Integer, primary_key=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Agent(Base):
    """Agent configurations."""
    __tablename__ = "agents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    config = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Setting(Base):
    """System settings."""
    __tablename__ = "settings"
    
    key = Column(String(255), primary_key=True)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    """Audit log for tracking changes."""
    __tablename__ = "audit_log"
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, server_default=func.now())
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, DELETE
    entity_type = Column(String(50), nullable=False)  # agent, setting, token
    entity_id = Column(String(255), nullable=False)
    changes = Column(JSON, nullable=True)
    metadata = Column(JSON, nullable=True)  # IP, user agent, etc.
    auth_token = Column(String(255), nullable=True)