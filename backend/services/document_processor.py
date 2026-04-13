"""Document processor service for chunking and embedding documents."""
import logging
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import mimetypes
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update, select
import numpy as np

from .embedding_service import EmbeddingService
from ..models import KBDocument, KBChunk

logger = logging.getLogger(__name__)

# Try to import the SignalWire document processor for advanced chunking
try:
    from signalwire.search.document_processor import DocumentProcessor as SWDocumentProcessor
    ADVANCED_CHUNKING_AVAILABLE = True
except ImportError:
    ADVANCED_CHUNKING_AVAILABLE = False
    logger.info("Advanced chunking strategies not available. Install signalwire-sdk[search] for full support.")


_processing_locks: Dict[str, asyncio.Lock] = {}


class DocumentProcessor:
    """Service for processing documents into searchable chunks."""

    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.embedding_service = EmbeddingService()
        
        # Strategy-specific parameters
        self.chunking_strategy = 'sentence'
        self.max_sentences_per_chunk = 5
        self.split_newlines = 0
        self.semantic_threshold = 0.5
        self.topic_threshold = 0.3
        
        # Initialize supported file loaders
        self._init_loaders()
    
    def _init_loaders(self):
        """Initialize file loaders based on available packages."""
        self.loaders = {}
        
        # Text files
        self.loaders['.txt'] = self._load_text_file
        self.loaders['.md'] = self._load_text_file
        
        # Try to load optional document processors
        try:
            import pdfplumber
            self.loaders['.pdf'] = self._load_pdf_file
        except ImportError:
            logger.warning("pdfplumber not available. PDF support disabled.")
        
        try:
            import docx
            self.loaders['.docx'] = self._load_docx_file
        except ImportError:
            logger.warning("python-docx not available. DOCX support disabled.")
        
        # HTML
        try:
            from bs4 import BeautifulSoup
            self.loaders['.html'] = self._load_html_file
            self.loaders['.htm'] = self._load_html_file
        except ImportError:
            logger.warning("BeautifulSoup not available. HTML support disabled.")
    
    async def process_document(
        self,
        file_path: str,
        document_id: str,
        agent_id: str,
        db: AsyncSession,
        sse_callback: Optional[callable] = None
    ):
        """
        Process uploaded document into chunks with embeddings.

        Args:
            file_path: Path to the uploaded file
            document_id: Document ID in database
            agent_id: Agent ID for SSE updates
            db: Database session
            sse_callback: Optional callback for SSE updates
        """
        # Per-document lock to prevent concurrent processing of the same document
        if document_id not in _processing_locks:
            _processing_locks[document_id] = asyncio.Lock()
        lock = _processing_locks[document_id]

        async with lock:
            await self._process_document_locked(
                file_path, document_id, agent_id, db, sse_callback
            )

        # Clean up the lock entry
        _processing_locks.pop(document_id, None)

    async def _process_document_locked(
        self,
        file_path: str,
        document_id: str,
        agent_id: str,
        db: AsyncSession,
        sse_callback: Optional[callable] = None
    ):
        """Internal method that runs under the per-document lock."""
        try:
            # Update status to 'processing'
            await db.execute(
                update(KBDocument)
                .where(KBDocument.id == document_id)
                .values(
                    status='processing',
                    processing_started_at=datetime.utcnow()
                )
            )
            await db.commit()
            
            # Load document content
            content = await self._load_document(file_path)
            if not content:
                raise ValueError("No content extracted from document")
            
            # Split into chunks
            chunks = self._split_into_chunks(content)
            chunk_count = len(chunks)
            
            # Update chunk count
            await db.execute(
                update(KBDocument)
                .where(KBDocument.id == document_id)
                .values(chunk_count=chunk_count)
            )
            await db.commit()
            
            # Process chunks in batches
            batch_size = 10
            for i in range(0, chunk_count, batch_size):
                batch = chunks[i:i + batch_size]
                
                # Generate embeddings for batch
                texts = [chunk['content'] for chunk in batch]
                embeddings = self.embedding_service.encode(texts)
                
                # Store chunks with embeddings
                for j, (chunk, embedding) in enumerate(zip(batch, embeddings)):
                    kb_chunk = KBChunk(
                        document_id=document_id,
                        chunk_index=i + j,
                        content=chunk['content'],
                        embedding=embedding.tolist(),  # Convert numpy array to list
                        document_metadata=chunk.get('metadata', {})
                    )
                    db.add(kb_chunk)
                
                # Update progress
                chunks_processed = min(i + batch_size, chunk_count)
                await db.execute(
                    update(KBDocument)
                    .where(KBDocument.id == document_id)
                    .values(chunks_processed=chunks_processed)
                )
                await db.commit()
                
                # Send SSE update if callback provided
                if sse_callback:
                    progress = int((chunks_processed / chunk_count) * 100)
                    await sse_callback(agent_id, document_id, "processing", progress)
            
            # Mark as completed
            await db.execute(
                update(KBDocument)
                .where(KBDocument.id == document_id)
                .values(
                    status='completed',
                    processed_at=datetime.utcnow(),
                    chunks_processed=chunk_count
                )
            )
            await db.commit()
            
            # Send completion SSE
            if sse_callback:
                await sse_callback(agent_id, document_id, "completed", 100)
            
            logger.info(f"Successfully processed document {document_id} with {chunk_count} chunks")
            
        except Exception as e:
            logger.error(f"Failed to process document {document_id}: {e}")
            
            # Mark as failed
            await db.execute(
                update(KBDocument)
                .where(KBDocument.id == document_id)
                .values(
                    status='failed',
                    error_message=str(e)
                )
            )
            await db.commit()
            
            # Send failure SSE
            if sse_callback:
                await sse_callback(agent_id, document_id, "failed", 0)
    
    async def _load_document(self, file_path: str) -> str:
        """Load document content based on file type."""
        path = Path(file_path)
        suffix = path.suffix.lower()
        
        if suffix not in self.loaders:
            # Try to detect MIME type
            mime_type, _ = mimetypes.guess_type(file_path)
            if mime_type and mime_type.startswith('text/'):
                return await self._load_text_file(file_path)
            else:
                raise ValueError(f"Unsupported file type: {suffix}")
        
        loader = self.loaders[suffix]
        return await loader(file_path)
    
    async def _load_text_file(self, file_path: str) -> str:
        """Load plain text file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # Try with different encoding
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.read()
    
    async def _load_pdf_file(self, file_path: str) -> str:
        """Load PDF file content."""
        import pdfplumber
        
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
        
        return '\n\n'.join(text_parts)
    
    async def _load_docx_file(self, file_path: str) -> str:
        """Load Word document content."""
        import docx
        
        doc = docx.Document(file_path)
        text_parts = []
        
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text)
        
        return '\n\n'.join(text_parts)
    
    async def _load_html_file(self, file_path: str) -> str:
        """Load HTML file content."""
        from bs4 import BeautifulSoup
        
        with open(file_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get text
        text = soup.get_text()
        
        # Break into lines and remove leading/trailing space
        lines = (line.strip() for line in text.splitlines())
        # Break multi-headlines into a line each
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        # Drop blank lines
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text
    
    def _split_into_chunks(self, text: str) -> List[Dict[str, Any]]:
        """Split text into chunks using the configured strategy."""
        
        # Try to use advanced chunking if available
        if ADVANCED_CHUNKING_AVAILABLE and self.chunking_strategy != 'sliding':
            try:
                # Create SW document processor with our settings
                sw_processor = SWDocumentProcessor(
                    chunking_strategy=self.chunking_strategy,
                    max_sentences_per_chunk=self.max_sentences_per_chunk,
                    chunk_size=self.chunk_size,
                    chunk_overlap=self.chunk_overlap,
                    split_newlines=self.split_newlines if self.split_newlines > 0 else None,
                    semantic_threshold=self.semantic_threshold,
                    topic_threshold=self.topic_threshold,
                    verbose=False
                )
                
                # Process text and get chunks
                sw_chunks = sw_processor.process_text(
                    text,
                    metadata={},
                    source_file="document"
                )
                
                # Convert to our format
                chunks = []
                for idx, sw_chunk in enumerate(sw_chunks):
                    chunks.append({
                        'content': sw_chunk['content'],
                        'metadata': {
                            'chunk_index': idx,
                            'start_char': sw_chunk.get('metadata', {}).get('start_char', 0),
                            **sw_chunk.get('metadata', {})
                        }
                    })
                
                return chunks
                
            except Exception as e:
                logger.warning(f"Failed to use advanced chunking: {e}. Falling back to simple chunking.")
        
        # Fallback to simple chunking
        if self.chunking_strategy == 'sentence' or self.chunking_strategy == 'sliding':
            return self._simple_sentence_chunking(text)
        elif self.chunking_strategy == 'paragraph':
            return self._paragraph_chunking(text)
        else:
            # Default to simple sentence chunking for unsupported strategies
            logger.warning(f"Chunking strategy '{self.chunking_strategy}' not supported without signalwire-sdk[search]. Using sentence chunking.")
            return self._simple_sentence_chunking(text)
    
    def _simple_sentence_chunking(self, text: str) -> List[Dict[str, Any]]:
        """Simple sentence-based chunking (fallback)."""
        chunks = []
        
        # Simple sentence-based splitting
        sentences = text.replace('\n', ' ').split('. ')
        
        current_chunk = []
        current_length = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            sentence_length = len(sentence)
            
            # If adding this sentence exceeds chunk size, save current chunk
            if current_length + sentence_length > self.chunk_size and current_chunk:
                chunk_text = '. '.join(current_chunk) + '.'
                chunks.append({
                    'content': chunk_text,
                    'metadata': {
                        'chunk_index': len(chunks),
                        'start_char': sum(len(c['content']) for c in chunks)
                    }
                })
                
                # Keep some overlap
                overlap_sentences = []
                overlap_length = 0
                for sent in reversed(current_chunk):
                    overlap_length += len(sent)
                    if overlap_length >= self.chunk_overlap:
                        break
                    overlap_sentences.insert(0, sent)
                
                current_chunk = overlap_sentences
                current_length = overlap_length
            
            current_chunk.append(sentence)
            current_length += sentence_length
        
        # Add final chunk
        if current_chunk:
            chunk_text = '. '.join(current_chunk) + '.'
            chunks.append({
                'content': chunk_text,
                'metadata': {
                    'chunk_index': len(chunks),
                    'start_char': sum(len(c['content']) for c in chunks)
                }
            })
        
        return chunks
    
    def _paragraph_chunking(self, text: str) -> List[Dict[str, Any]]:
        """Simple paragraph-based chunking."""
        chunks = []
        
        # Split by double newlines (paragraphs)
        paragraphs = text.split('\n\n')
        
        current_chunk = []
        current_length = 0
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            para_length = len(para)
            
            # If adding this paragraph exceeds chunk size, save current chunk
            if current_length + para_length > self.chunk_size and current_chunk:
                chunk_text = '\n\n'.join(current_chunk)
                chunks.append({
                    'content': chunk_text,
                    'metadata': {
                        'chunk_index': len(chunks),
                        'start_char': sum(len(c['content']) for c in chunks)
                    }
                })
                
                # No overlap for paragraph chunking
                current_chunk = []
                current_length = 0
            
            current_chunk.append(para)
            current_length += para_length
        
        # Add final chunk
        if current_chunk:
            chunk_text = '\n\n'.join(current_chunk)
            chunks.append({
                'content': chunk_text,
                'metadata': {
                    'chunk_index': len(chunks),
                    'start_char': sum(len(c['content']) for c in chunks)
                }
            })
        
        return chunks
    
    async def delete_document(self, document_id: str, db: AsyncSession) -> bool:
        """
        Delete document and all associated data.
        
        Returns:
            True if deleted, False if not found
        """
        # Get document record
        result = await db.execute(
            select(KBDocument).where(KBDocument.id == document_id)
        )
        document = result.scalar_one_or_none()
        
        if not document:
            return False
        
        # Delete will cascade to chunks
        await db.delete(document)
        await db.commit()
        
        return True