# Global Compliance Audit Agent

**System Architecture & Documentation**

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)
![Offline](https://img.shields.io/badge/llama.cpp-Offline-success.svg)

A modular, low-level architecture for reasoning over highly sensitive enterprise data. By strictly decoupling secure relational database queries (PII lookup) from semantic legal retrieval (RAG), this system prevents data leakage into the LLM's context window until explicitly required. It emphasizes low-level memory management, using quantized GGUF models running natively on CPUs to eliminate the need for expensive GPU clusters — making it highly scalable for enterprise compliance teams.

---

## Table of Contents

- [Features](#features)
- [Request Processing Pipeline](#request-processing-pipeline)
- [Hybrid Architecture: SQLite + ChromaDB](#hybrid-architecture-sqlite--chromadb)
- [RAG Pipeline: Ingestion & Storage](#rag-pipeline-ingestion--storage)
- [A Note on LangChain](#a-note-on-langchain)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Quick Start for New Developers](#quick-start-for-new-developers)
- [Running the Project](#running-the-project)
- [Example Usage](#example-usage)
- [Troubleshooting](#troubleshooting)
- [Security & Contributing](#security--contributing)

---

## Features

- **Zero-Cloud Footprint** — 100% offline inference using `llama.cpp` and local vector storage.
- **Strict Data Isolation (MCP)** — Uses a Model Context Protocol (PII tool-calling framework) to fetch structured employee profiles dynamically from a local SQLite database.
- **Structural Legal RAG** — Custom recursive text chunking designed specifically for legal documents to prevent conditional clauses from being split.
- **Server-Side Telemetry** — Headless tracking of token generation, KV cache utilization, and memory optimization executed safely on the server side.

---

## Request Processing Pipeline

The core of this application is a hybrid synchronous pipeline that intercepts a user query, fetches exact structured records from a local database, cross-references them against unstructured legal clauses via vector search, and performs grounded reasoning.

### 1. Application Entry Point
- **Enters:** User query (e.g., *"Is employee EMP-1001 compliant with overtime laws?"*).
- **Process:** The React frontend sends a `POST` request to the FastAPI backend. Employee IDs are parsed automatically from natural language queries or submitted cleanly.
- **File:** `backend/main.py` (`/api/audit` endpoint).

### 2. MCP Structured Data Resolution (SQLite Database)
- **Enters:** Target Employee ID (e.g., `EMP-1001`).
- **Process:** The backend invokes the `fetch_employee_contract` tool via the MCP server. This securely queries the local SQLite database (`enterprise_hr.db`), populated from real open-source corporate datasets, returning exact numeric facts (salary, hours, department, country).
- **Tech:** SQLite, Pandas, Pydantic schema validation.
- **Files:** `backend/mcp_server.py` & `backend/seed_dataset.py`.

### 3. Unstructured Knowledge Retrieval (RAG Vector Search)
- **Enters:** User query string.
- **Process:** The query is embedded into a dense vector space and compared against pre-indexed legal PDFs using cosine similarity.
- **Tech:** ChromaDB (vector store) and Sentence-Transformers (`BAAI/bge-small-en-v1.5`).
- **File:** `backend/main.py` (via ChromaDB API).

### 4. Context Construction & Cross-Comparison
- **Enters:** Structured SQLite JSON payload + Top-3 relevant legal PDF clauses + user query.
- **Process:** The FastAPI server dynamically constructs a unified system prompt, injecting both datasets into a strict compliance auditor persona. The LLM compares worker attributes against statutory limits.
- **File:** `backend/main.py`.

### 5. Local Inference Engine
- **Enters:** Unified system prompt.
- **Process:** The model tokenizes the prompt, allocates context memory dynamically, and autoregressively generates a compliance verdict strictly based on the provided constraints.
- **Tech:** `llama-cpp-python` serving quantized GGUF weights.
- **File:** `backend/engine.py`.

### 6. Final Response
The backend returns the generated audit report and exact PDF source citations back to the React dashboard.

---

## Hybrid Architecture: SQLite + ChromaDB

This application avoids mixing structured and unstructured data into a single datastore:

- **Tabular Data (SQLite)** — Handles deterministic employee metrics (department, working hours, salary) via strict MCP tool calls. This prevents LLM numeric hallucinations.
- **Textual Data (ChromaDB)** — Handles dense, multi-page statutory text (labor codes, Fair Labor Standards Act) via semantic vector search.

---

## RAG Pipeline: Ingestion & Storage

This project implements a specialized Retrieval-Augmented Generation (RAG) pipeline tailored for dense legal text.

**Ingestion Flow:**

1. **Document Loader** — `fitz` (PyMuPDF) extracts raw text and page-level metadata from PDFs in `backend/data/legal_docs/`.
2. **Structural Chunking** — Instead of blind character counts, the custom recursive splitter breaks text primarily on `\n\nArticle` and `\n\nSection` markers to preserve semantic boundaries.
3. **Embedding** — Chunks are embedded using `BAAI/bge-small-en-v1.5`, optimized for CPU.
4. **Persistence** — Vectors are written to disk via ChromaDB into the `backend/chroma_db/` directory.

*(Implemented in `backend/rag_ingest.py`)*

---

## A Note on LangChain

This repository intentionally bypasses LangChain and LlamaIndex.

To demonstrate systems-level ML engineering, strict memory management, and low-level KV cache awareness, this project utilizes raw `llama-cpp-python` and native ChromaDB APIs.

- **No Abstraction Overhead** — Prompts are manually constructed string templates, ensuring zero hidden prompt injections.
- **Direct Telemetry** — Token counts and memory bounds are tracked safely on the server side.

---

## Project Structure

| Path | Purpose |
|---|---|
| `backend/main.py` | Application entry point, CORS configuration, and API orchestration |
| `backend/engine.py` | Local inference execution and server-side telemetry |
| `backend/rag_ingest.py` | Legal PDF document ingestion, chunking, and vector embedding |
| `backend/mcp_server.py` | Pydantic-validated MCP server and tool registry |
| `backend/seed_dataset.py` | Script to pull open-source HR datasets and initialize SQLite |
| `backend/models/` | Storage for quantized `.gguf` weights |
| `backend/chroma_db/` | Persisted vector database |
| `frontend/src/` | React frontend application and clean chat UI |

---

## Technology Stack

| Technology | Role |
|---|---|
| Python 3.10+ | Core application language |
| FastAPI / Uvicorn | Asynchronous API gateway with CORS middleware |
| SQLite & Pandas | Relational structured employee database |
| llama-cpp-python | Local, CPU-bound LLM execution |
| ChromaDB | Persistent local semantic vector search |
| Sentence-Transformers | Dense vector embedding generation |
| React / Vite | Clean conversational chat interface |

---

## Quick Start for New Developers

Follow these steps to get a local instance of the audit agent running from a clean clone.

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/global-compliance-audit.git
cd global-compliance-audit
```

### 2. Backend Setup & Dependency Installation
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Download the LLM
Download a quantized GGUF model (e.g., `qwen2.5-0.5B-instruct-q4_k_m.gguf`) from Hugging Face and place it in the `backend/models/` directory. Update the `MODEL_PATH` variable in `backend/main.py` if filename differs.

### 4. Initialize Database & Build RAG Index
```bash
python seed_dataset.py   # Downloads dataset and builds enterprise_hr.db
python rag_ingest.py     # Embeds legal PDFs into ChromaDB
```

### 5. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## Running the Project

You need two active terminal sessions to run the application.

**Terminal 1 — Backend Server**
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend Server**
```bash
cd frontend
npm run dev
```

Open your browser to [http://localhost:3000](http://localhost:3000) to interact with the dashboard.

---

## Example Usage

**Via cURL:**
```bash
curl -X POST http://localhost:8000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"query": "Check compliance for employee EMP-1001 regarding overtime limits."}'
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `500 Internal Server Error` | Check your terminal traceback; verify your GGUF file matches the exact `MODEL_PATH` string in `backend/main.py`. |
| Sentence Transformers Error | Run `pip install sentence-transformers` inside your virtual environment. |
| Vector DB Not Initialized | Run `python rag_ingest.py` to index the documents and create the `chroma_db/` folder. |
| SQLite Record Not Found | Run `python seed_dataset.py` to populate `enterprise_hr.db`. |

---

## Security & Contributing

- **API Key Handling** — Never place real credentials or sensitive PII in public repositories.
- **Git Rules** — Never commit the `backend/models/`, `backend/chroma_db/`, or SQLite databases to version control. Ensure your `.gitignore` includes `*.gguf`, `chroma_db/`, `*.db`, `.env`, and `node_modules/`.

---

## License

This project is licensed under the MIT License.