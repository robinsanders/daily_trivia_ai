import logging
import tiktoken

logger = logging.getLogger(__name__)

class ArticleProcessor:
    def __init__(self):
        self.encoder = tiktoken.encoding_for_model("gpt-4")
        self.max_tokens = 30000
        self.chunks = []

    def process_text(self, text: str) -> None:
        """Split text into chunks that fit within token limits."""
        logger.info(f"Processing text of length {len(text)}")
        tokens = self.encoder.encode(text)
        self.chunks = [
            self.encoder.decode(tokens[i:i + self.max_tokens])
            for i in range(0, len(tokens), self.max_tokens)
        ]
        logger.info(f"Split into {len(self.chunks)} chunks")

