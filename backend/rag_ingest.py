

import os
import glob
import fitz  # PyMuPDF
import chromadb
from chromadb.utils import embedding_functions

PDF_DIR = "./data/legal_docs"
DB_DIR = "./chroma_db"

def extract_text_from_pdfs(pdf_dir: str) -> list[dict]:
    """Extracts raw text and page numbers from PDFs."""
    documents = []
    pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
    
    for file_path in pdf_files:
        doc = fitz.open(file_path)
        filename = os.path.basename(file_path)
        for page_num, page in enumerate(doc):
            text = page.get_text("text").strip()
            if text:
                documents.append({
                    "text": text,
                    "source": filename,
                    "page": page_num + 1
                })
    return documents

def split_text(text: str, chunk_size=1000, overlap=200) -> list[str]:
    """Custom light recursive splitter prioritizing legal structural breaks."""
    separators = ["\n\nArticle ", "\n\nSection ", "\n\n", "\n", ". "]
    
    # Simple chunker for demonstration
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end]
        
        # If not at the end, trying to snap to a clean breakpoint
        if end < text_len:
            for sep in separators:
                pos = chunk.rfind(sep)
                if pos > chunk_size // 2:
                    end = start + pos + len(sep)
                    chunk = text[start:end]
                    break
                    
        chunks.append(chunk.strip())
        start = end - overlap
        
    return chunks

def run_ingestion():
    print(f"[RAG] Scanning '{PDF_DIR}'...")
    os.makedirs(PDF_DIR, exist_ok=True)
    raw_docs = extract_text_from_pdfs(PDF_DIR)
    
    if not raw_docs:
        print("No PDFs found in ./data/legal_docs. Drop some files in there first.")
        return

    chunks = []
    metadatas = []
    ids = []
    
    counter = 0
    for doc in raw_docs:
        doc_chunks = split_text(doc["text"])
        for chunk in doc_chunks:
            if len(chunk) < 50:  # ignore tiny noise fragments
                continue
            chunks.append(chunk)
            metadatas.append({"source": doc["source"], "page": doc["page"]})
            ids.append(f"doc_{counter}")
            counter += 1

    print(f"[RAG] Generated {len(chunks)} chunks across {len(raw_docs)} pages.")

    # Native ChromaDB initialization with local sentence-transformers
    client = chromadb.PersistentClient(path=DB_DIR)
    
    # BAAI/bge-small-en-v1.5 
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="BAAI/bge-small-en-v1.5"
    )

    collection = client.get_or_create_collection(
        name="legal_compliance",
        embedding_function=embedding_fn
    )

    collection.add(
        documents=chunks,
        metadatas=metadatas,
        ids=ids
    )
    print(f"[RAG] Successfully ingested into '{DB_DIR}'.")

if __name__ == "__main__":
    run_ingestion()