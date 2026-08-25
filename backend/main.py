

import traceback
import re
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions
from fastapi.middleware.cors import CORSMiddleware

from engine import LocalLlamaEngine
from mcp_server import mcp_client

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from Vite/React frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, OPTIONS)
    allow_headers=["*"],  # Allows all headers
)

# 1. Local llm engine intialization
MODEL_PATH = "./models/qwen2.5-0.5B-instruct-q4_k_m.gguf"

engine = None
try:
    #  n_gpu_layers=0 for CPU inference; change to >0 if compiled with Metal/CUDA
    engine = LocalLlamaEngine(model_path=MODEL_PATH, n_ctx=4096, n_gpu_layers=0)
    print("[INIT] Llama engine loaded successfully.")
except Exception as e:
    print(f"[ERROR] Failed to load Llama model from {MODEL_PATH}: {e}")

# Native chroma db connection
DB_DIR = "./chroma_db"
collection = None
try:
    chroma_client = chromadb.PersistentClient(path=DB_DIR)
    embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="BAAI/bge-small-en-v1.5"
    )
    collection = chroma_client.get_collection(
        name="legal_compliance", 
        embedding_function=embedding_fn
    )
    print("[INIT] ChromaDB collection 'legal_compliance' connected.")
except Exception as e:
    print(f"[ERROR] Failed to load ChromaDB collection: {e}")

class AuditRequest(BaseModel):
    query: str
    employee_id: str = None  # Optional: extracted automatically via regex if omitted
    top_k: int = 3

@app.post("/api/audit")
async def run_audit(req: AuditRequest):
    # Sanity checks with detailed HTTP 500 errors
    if engine is None:
        raise HTTPException(
            status_code=500, 
            detail=f"LLM engine not initialized. Check if GGUF file exists at '{MODEL_PATH}'."
        )
    if collection is None:
        raise HTTPException(
            status_code=500, 
            detail=f"ChromaDB collection not initialized. Did you run 'python rag_ingest.py'?"
        )

    try:
        # Determine Employee ID: Used explicit input or auto-extract via Regex from natural language query
        target_emp_id = req.employee_id
        if not target_emp_id:
            match = re.search(r'EMP-\d+', req.query, re.IGNORECASE)
            target_emp_id = match.group(0).upper() if match else "EMP-1001" # Default fallback safety identifier

        # 1:: Secure MCP tool call to fetch employee contract data from SQLite
        emp_data_json = mcp_client.execute_tool("fetch_employee_contract", {"employee_id": target_emp_id})
        print(f"[AUDIT] MCP tool executed for ID: {target_emp_id}")

        # 2:: Native ChromaDB vector retrieval for legal clauses
        results = collection.query(
            query_texts=[req.query],
            n_results=req.top_k
        )
        
        retrieved_docs = results["documents"][0] if results["documents"] else []
        metadatas = results["metadatas"][0] if results["metadatas"] else []

        # Format retrieved legal chunks
        legal_context = ""
        sources = []
        for doc, meta in zip(retrieved_docs, metadatas):
            legal_context += f"- [File: {meta.get('source', 'N/A')}, Page: {meta.get('page', 1)}]\n{doc}\n\n"
            sources.append({"source": meta.get("source", "N/A"), "page": meta.get("page", 1)})

        # 3:: Construct System Prompt combining MCP Structured Data & RAG Unstructured Context
        system_prompt = (
            "You are an enterprise compliance auditor analyzing employee contracts against local legal regulations.\n"
            "Be concise, direct, and ground your answer strictly in the provided metadata and legal clauses.\n\n"
            f"=== SECURE EMPLOYEE DATA (via MCP) ===\n{emp_data_json}\n\n"
            f"=== RETRIEVED LEGAL CLAUSES (via RAG) ===\n{legal_context}"
        )

        # 4:: Run local inference via llama.cpp
        answer = engine.generate(system_prompt=system_prompt, user_query=req.query)

        return {
            "response": answer,
            "sources": sources,
            "telemetry": engine.get_telemetry()
        }

    except Exception as err:
        print("\n--- [TRACEBACK DETECTED IN /api/audit] ---")
        traceback.print_exc()
        print("-------------------------------------------\n")
        raise HTTPException(status_code=500, detail=str(err))

@app.get("/api/telemetry")
async def get_telemetry():
    if not engine:
        return {"error": "Engine not initialized"}
    return engine.get_telemetry()