"""Database models for the application."""
from sqlalchemy import Column, String, Boolean, DateTime, JSON, Text, Float, Integer, BigInteger, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid
from pgvector.sqlalchemy import Vector

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
    agent_type = Column(String, default="regular")  # "regular" or "bedrock"
    
    # Post-prompt fields
    post_prompt_enabled = Column(Boolean, default=False)
    post_prompt_mode = Column(String, default="builtin")  # "builtin" or "custom"
    post_prompt_text = Column(Text, default="Summarize the conversation including key points and action items")
    post_prompt_url = Column(String)  # For custom mode
    
    # Relationships
    call_summaries = relationship("CallSummary", back_populates="agent", cascade="all, delete-orphan")
    knowledge_bases = relationship("AgentKnowledgeBase", back_populates="agent", cascade="all, delete-orphan")


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


class EnvVar(Base):
    """User-defined environment variable."""
    
    __tablename__ = "env_vars"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(Text)
    is_secret = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def to_dict(self, reveal_secret=False):
        """Convert to dictionary, optionally masking secret values."""
        return {
            "id": self.id,
            "name": self.name,
            "value": self.value if not self.is_secret or reveal_secret else "••••••••",
            "description": self.description,
            "is_secret": self.is_secret,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class KnowledgeBase(Base):
    """Standalone knowledge base that can be shared across agents."""
    
    __tablename__ = "knowledge_bases"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    created_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
    settings = Column(JSON, default={})
    stats = Column(JSON, default={})
    
    # Relationships
    agents = relationship("AgentKnowledgeBase", back_populates="knowledge_base")
    collections = relationship("KBCollection", back_populates="knowledge_base", cascade="all, delete-orphan")


class AgentKnowledgeBase(Base):
    """Many-to-many relationship between agents and knowledge bases."""
    
    __tablename__ = "agent_knowledge_bases"
    
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True)
    knowledge_base_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), primary_key=True)
    attached_at = Column(DateTime(timezone=True), server_default=func.now())
    attached_by = Column(String)
    config = Column(JSON, default={})
    
    # Relationships
    agent = relationship("Agent", back_populates="knowledge_bases")
    knowledge_base = relationship("KnowledgeBase", back_populates="agents")


class KBCollection(Base):
    """Knowledge base collection - container for documents."""
    
    __tablename__ = "kb_collections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    knowledge_base_id = Column(UUID(as_uuid=True), ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    settings = Column(JSON, default={})
    
    # Relationships
    knowledge_base = relationship("KnowledgeBase", back_populates="collections")
    documents = relationship("KBDocument", back_populates="collection", cascade="all, delete-orphan")


class KBDocument(Base):
    """Uploaded document with processing status."""
    
    __tablename__ = "kb_documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    collection_id = Column(UUID(as_uuid=True), ForeignKey("kb_collections.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(50))
    file_size = Column(Integer)
    file_hash = Column(String(64), unique=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))
    processing_started_at = Column(DateTime(timezone=True))
    status = Column(String(50), default='pending')  # pending, processing, completed, failed
    error_message = Column(Text)
    chunk_count = Column(Integer, default=0)
    chunks_processed = Column(Integer, default=0)
    document_metadata = Column(JSON, default={})
    
    # Relationships
    collection = relationship("KBCollection", back_populates="documents")
    chunks = relationship("KBChunk", back_populates="document", cascade="all, delete-orphan")


class KBChunk(Base):
    """Document chunk with vector embedding."""
    
    __tablename__ = "kb_chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("kb_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(384))  # 384 dimensions for all-MiniLM-L6-v2
    document_metadata = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("KBDocument", back_populates="chunks")


class MediaFile(Base):
    """Uploaded media file (audio/video) for agent configurations."""
    
    __tablename__ = "media_files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), unique=True, nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # 'audio', 'video', 'image'
    mime_type = Column(String(100), nullable=False)
    category = Column(String(50))
    file_size = Column(BigInteger, nullable=False)
    duration_seconds = Column(Float)  # Duration in seconds for audio/video
    file_path = Column(String(500), nullable=False)
    file_metadata = Column("metadata", JSON, default={})
    description = Column(Text)
    tags = Column(ARRAY(String), default=[])
    uploaded_by = Column(String)
    source_type = Column(String(20), default='uploaded')
    external_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed_at = Column(DateTime(timezone=True))
    file_hash = Column(String(64))
    
    # Relationships
    usages = relationship("MediaUsage", back_populates="media_file", cascade="all, delete-orphan")


class MediaUsage(Base):
    """Track which agents use which media files."""
    
    __tablename__ = "media_usage"
    
    media_file_id = Column(UUID(as_uuid=True), ForeignKey("media_files.id", ondelete="CASCADE"), primary_key=True)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True)
    parameter_name = Column(String(50), primary_key=True)  # e.g., 'background_file', 'hold_music'
    attached_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    media_file = relationship("MediaFile", back_populates="usages")
    agent = relationship("Agent")