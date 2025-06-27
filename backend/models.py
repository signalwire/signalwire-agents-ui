"""Database models for the application."""
from sqlalchemy import Column, String, Boolean, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from .core.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class Token(Base):
    __tablename__ = "tokens"
    
    id = Column(String, primary_key=True)
    token = Column(Text, unique=True, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    last_used_at = Column(DateTime)
    created_by = Column(String)
    is_active = Column(Boolean, default=True)


class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text)
    config = Column(JSON, nullable=False, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Setting(Base):
    __tablename__ = "settings"
    
    id = Column(String, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    metadata = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)