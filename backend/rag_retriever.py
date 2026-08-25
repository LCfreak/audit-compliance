import os
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

DB_DIR = "./chroma_db"

class LegalRetriever:
    def __init__(self, db_dir=DB_DIR):
        if not os.path.exists(db_dir):
            raise FileNotFoundError(f"ChromaDB not found at {db_dir}. Did you run rag_ingest.py first?")
            
        print("[RAG] Loading embedding model for retrieval...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="BAAI/bge-large-en-v1.5",
            model_kwargs={'device': 'cpu'} # for Gpu inference change to 'cuda'
        )
        
        print("[RAG] Connecting to persisted ChromaDB...")
        self.vectorstore = Chroma(
            persist_directory=db_dir,
            embedding_function=self.embeddings
        )

    def get_relevant_laws(self, query: str, k: int = 3) -> list[dict]:
        """
        Retrieves top-k relevant legal document chunks with metadata.
        """
        
        # Similarity search with relevance scores
        results = self.vectorstore.similarity_search_with_score(query, k=k)
        
        retrieved_docs = []
        for doc, score in results:
            retrieved_docs.append({
                "content": doc.page_content,
                "source": doc.metadata.get("source", "Unknown"),
                "page": doc.metadata.get("page", 0),
                "relevance_score": float(score)
            })
            
        return retrieved_docs