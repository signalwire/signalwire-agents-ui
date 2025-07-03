"""Embedding service singleton for generating text embeddings."""
import logging
from typing import Optional, List, Union
import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Singleton service for managing sentence transformer model."""
    
    _instance = None
    _model = None
    _model_name = 'all-MiniLM-L6-v2'  # 384 dimensions, fast and efficient
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def get_model(self):
        """Get or initialize the sentence transformer model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading embedding model: {self._model_name}")
                self._model = SentenceTransformer(self._model_name)
                logger.info("Embedding model loaded successfully")
            except ImportError:
                logger.error("sentence-transformers not installed. Install with: pip install signalwire-agents[search-all]")
                raise
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise
        return self._model
    
    def encode(self, texts: Union[str, List[str]], batch_size: int = 32) -> np.ndarray:
        """
        Encode text(s) into embeddings.
        
        Args:
            texts: Single text or list of texts to encode
            batch_size: Batch size for encoding multiple texts
            
        Returns:
            Numpy array of embeddings
        """
        model = self.get_model()
        
        if isinstance(texts, str):
            texts = [texts]
        
        try:
            # Convert to embeddings
            embeddings = model.encode(
                texts,
                batch_size=batch_size,
                show_progress_bar=False,
                convert_to_numpy=True
            )
            return embeddings
        except Exception as e:
            logger.error(f"Failed to encode texts: {e}")
            raise
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by the model."""
        model = self.get_model()
        # Get a sample embedding to determine dimension
        sample_embedding = model.encode("sample", convert_to_numpy=True)
        return sample_embedding.shape[0]