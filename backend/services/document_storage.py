"""Document storage service for managing uploaded files."""
import os
import hashlib
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional
import aiofiles
from fastapi import UploadFile
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)


class DocumentStorage:
    """Service for storing and managing uploaded documents."""
    
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path or os.getenv('KB_STORAGE_PATH', '/app/data/knowledge_base')
        Path(self.storage_path).mkdir(parents=True, exist_ok=True)
        logger.info(f"Document storage initialized at: {self.storage_path}")
    
    async def store_file(self, file: UploadFile, agent_id: str) -> tuple[str, str]:
        """
        Store uploaded file and return storage path and file hash.
        
        Args:
            file: FastAPI UploadFile object
            agent_id: Agent ID for organizing files
            
        Returns:
            Tuple of (file_path, file_hash)
        """
        # Create agent-specific directory
        agent_dir = Path(self.storage_path) / agent_id
        agent_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = secure_filename(file.filename)
        
        # Ensure filename is not empty after sanitization
        if not safe_filename:
            safe_filename = "document"
        
        filename = f"{timestamp}_{safe_filename}"
        file_path = agent_dir / filename
        
        # Calculate file hash while saving
        hasher = hashlib.sha256()
        
        try:
            async with aiofiles.open(file_path, 'wb') as f:
                while chunk := await file.read(1024 * 1024):  # 1MB chunks
                    await f.write(chunk)
                    hasher.update(chunk)
            
            file_hash = hasher.hexdigest()
            logger.info(f"Stored file: {file_path} (hash: {file_hash})")
            
            return str(file_path), file_hash
            
        except Exception as e:
            logger.error(f"Failed to store file: {e}")
            # Clean up partial file if it exists
            if file_path.exists():
                file_path.unlink()
            raise
    
    async def delete_file(self, file_path: str) -> bool:
        """
        Delete file from storage.
        
        Args:
            file_path: Path to the file to delete
            
        Returns:
            True if deleted, False if not found
        """
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                logger.info(f"Deleted file: {file_path}")
                
                # Clean up empty directories
                agent_dir = path.parent
                if agent_dir.exists() and not any(agent_dir.iterdir()):
                    agent_dir.rmdir()
                    logger.info(f"Removed empty directory: {agent_dir}")
                
                return True
            else:
                logger.warning(f"File not found for deletion: {file_path}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete file {file_path}: {e}")
            raise
    
    async def get_file_size(self, file_path: str) -> int:
        """Get file size in bytes."""
        try:
            return os.path.getsize(file_path)
        except Exception as e:
            logger.error(f"Failed to get file size for {file_path}: {e}")
            return 0
    
    async def file_exists(self, file_path: str) -> bool:
        """Check if file exists."""
        return Path(file_path).exists()
    
    def get_agent_storage_size(self, agent_id: str) -> int:
        """Get total storage size used by an agent in bytes."""
        agent_dir = Path(self.storage_path) / agent_id
        if not agent_dir.exists():
            return 0
        
        total_size = 0
        for file_path in agent_dir.rglob('*'):
            if file_path.is_file():
                total_size += file_path.stat().st_size
        
        return total_size
    
    def cleanup_agent_storage(self, agent_id: str) -> int:
        """
        Remove all files for an agent.
        
        Returns:
            Number of files deleted
        """
        agent_dir = Path(self.storage_path) / agent_id
        if not agent_dir.exists():
            return 0
        
        file_count = 0
        for file_path in agent_dir.rglob('*'):
            if file_path.is_file():
                file_path.unlink()
                file_count += 1
        
        # Remove the directory if empty
        try:
            agent_dir.rmdir()
        except:
            pass  # Directory might not be empty
        
        logger.info(f"Cleaned up {file_count} files for agent {agent_id}")
        return file_count