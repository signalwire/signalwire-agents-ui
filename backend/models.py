"""Database models for the application."""
from sqlalchemy import Column, String, Boolean, DateTime, JSON, Text, Float, Integer, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
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
    updated_by = Column(String)  # User ID who last updated
    version = Column(Integer, default=1)  # For optimistic locking
    
    # Post-prompt fields
    post_prompt_enabled = Column(Boolean, default=False)
    post_prompt_mode = Column(String, default="builtin")  # "builtin" or "custom"
    post_prompt_text = Column(Text, default="Summarize the conversation including key points and action items")
    post_prompt_url = Column(String)  # For custom mode
    
    # Relationships
    call_summaries = relationship("CallSummary", back_populates="agent", cascade="all, delete-orphan")


class Setting(Base):
    __tablename__ = "settings"
    
    id = Column(String, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CallSummary(Base):
    __tablename__ = "call_summaries"
    
    id = Column(String, primary_key=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=False)
    call_id = Column(String, unique=True, index=True)
    ai_session_id = Column(String)
    
    # Timestamps (Unix timestamp in microseconds from SignalWire)
    call_start_date = Column(BigInteger)
    call_end_date = Column(BigInteger)
    created_at = Column(DateTime, server_default=func.now())
    
    # Caller info
    caller_id_name = Column(String)
    caller_id_number = Column(String)
    
    # Summary data
    post_prompt_summary = Column(Text)  # The AI-generated summary
    call_log = Column(JSON)  # Full conversation history
    swaig_log = Column(JSON)  # Function call history
    
    # Metrics
    total_minutes = Column(Float)
    total_input_tokens = Column(Integer)
    total_output_tokens = Column(Integer)
    total_cost = Column(Float)  # Calculated from usage
    
    # Full raw data for reference
    raw_data = Column(JSON)  # Complete post data
    
    # Relationships
    agent = relationship("Agent", back_populates="call_summaries")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)