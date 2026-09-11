# Global Compliance Audit Agent

**System Architecture & Documentation**

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)
![React](https://img.shields.io/badge/React-18.3-61DAFB.svg)
![Offline](https://img.shields.io/badge/llama.cpp-Offline-success.svg)
![WebSocket](https://img.shields.io/badge/Transport-WebSocket-orange.svg)

A modular, low-level architecture for reasoning over highly sensitive enterprise data. By strictly decoupling secure relational database queries (PII lookup) from semantic legal retrieval (RAG), this system prevents data leakage into the LLM's context window until explicitly required. It emphasizes low-level memory management, using quantized GGUF models running natively on CPUs to eliminate the need for expensive GPU clusters — making it highly scalable for enterprise compliance teams.

---

## Table of Contents

- [Features](#features)
- [Dual-Agent Architecture](#dual-agent-architecture)
- [Real-Time Pipeline (WebSocket)](#real-time-pipeline-websocket)
- [Hybrid Architecture: SQLite + ChromaDB](#hybrid-architecture-sqlite--chromadb)
- [RAG Pipeline: Ingestion & Storage](#rag-pipeline-ingestion--storage)
- [A Note on LangChain](#a-note-on-langchain)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Quick Start for New Developers](#quick-start-for-new-developers)
- [Running the Project](#running-the-project)
- [Example Usage](#example-usage)
- [Troubleshooting](#troubleshooting)
- [Known Limitations / Roadmap](#known-limitations--roadmap)
- [Security & Contributing](#security--contributing)

---

## Features

- **Zero-Cloud Footprint** — 100% offline inference using `llama.cpp` and local vector storage.
- **Dual-Tier MCP Agents** — a read-only conversational tier and a read/write autonomous execution tier, sharing the same tool registry with Pydantic-validated schemas.
- **Structural Legal RAG** — custom recursive text chunking designed specifically for legal documents to prevent conditional clauses from being split.
- **Multi-Tenant Vector Isolation** — each tenant gets its own ChromaDB collection, mounted dynamically per WebSocket connection.
- **Streaming Pipeline Telemetry** — real-time `STATUS` events over WebSocket as the request moves through MCP fetch → RAG query → inference → (optional) execution.

---

## Dual-Agent Architecture

The backend exposes two operating modes over the same WebSocket connection, each backed by a different MCP tier:

| Mode | MCP Tier | Behavior |
|---|---|---|
| `chat` | `ChatbotMcp` (read-only) | Fetches employee data, retrieves relevant legal clauses, and returns a natural-language answer. Cannot mutate any state. |
| `agent` | `AgenticMcp` (read/write, inherits `ChatbotMcp`) | Same retrieval steps, but the LLM is constrained to emit structured JSON (`is_compliant`, `violation_details`, `required_action`). If a violation is detected, the backend autonomously invokes `flag_payroll_anomaly`, mutating system state and generating an audit trail ID — without a human in the loop. |

Both tiers share one `BaseMcpServer` tool registry and Pydantic schema validation layer, so adding a new tool to either tier means registering a function + schema once, not duplicating request-parsing logic.

---

## Real-Time Pipeline (WebSocket)

Requests are handled over a persistent `/ws/audit/{tenant_id}` connection rather than a single request/response call, since a full audit involves multiple latency-heavy stages (DB fetch → vector search → LLM generation → possible state mutation). The server streams discrete `STATUS` events as it moves through each stage, followed by a final `CHAT_RESPONSE` (chat mode) or `AGENT_RECEIPT` (agent mode) event.

Because local inference is CPU-bound and memory-heavy, all generation calls are serialized behind a single `asyncio.Lock()` — this guarantees no two tenants can force a simultaneous OOM by triggering concurrent inference, at the cost of queuing requests one at a time rather than batching them (see [Roadmap](#known-limitations--roadmap)).

---

## Hybrid Architecture: SQLite + ChromaDB

This application avoids mixing structured and unstructured data into a single datastore:

- **Tabular Data (SQLite)** — handles deterministic employee metrics (department, working hours, salary) via strict MCP tool calls. This prevents LLM numeric hallucinations.
- **Textual Data (ChromaDB)** — handles dense, multi-page statutory text (labor codes, Fair Labor Standards Act) via semantic vector search, partitioned per tenant.

---

## RAG Pipeline: Ingestion & Storage

**Ingestion Flow:**

1. **Document Loader** — `fitz` (PyMuPDF) extracts raw text and page-level metadata from PDFs in `backend/data/legal_docs/`.
2. **Structural Chunking** — the custom recursive splitter breaks text primarily on `\n\nArticle` and `\n\nSection` markers to preserve semantic boundaries, instead of blind character counts.
3. **Embedding** — chunks are embedded using `BAAI/bge-small-en-v1.5`, optimized for CPU.
4. **Persistence** — vectors are written to disk via ChromaDB into per-tenant collections (`legal_compliance_{tenant_id}`) under `backend/chroma_db/`.

*(Implemented in `backend/rag_ingest.py`)*

---

## A Note on LangChain

This repository intentionally bypasses LangChain and LlamaIndex. To demonstrate systems-level ML engineering and low-level KV cache awareness, it uses raw `llama-cpp-python` and native ChromaDB APIs — prompts are manually constructed string templates, so there's no hidden abstraction between what's sent to the model and what you can read in the code.

---

## Project Structure

| Path | Purpose |
|---|---|
| `backend/main.py` | FastAPI app, WebSocket connection manager, per-tenant collection routing, dual-mode pipeline orchestration |
| `backend/engine.py` | Local `llama-cpp-python` inference wrapper and telemetry |
| `backend/rag_ingest.py` | Legal PDF ingestion, structural chunking, and vector embedding |
| `backend/mcp_server.py` | `BaseMcpServer` / `ChatbotMcp` / `AgenticMcp` tool registry with Pydantic-validated schemas |
| `backend/seed_dataset.py` | Downloads open-source HR dataset and initializes `enterprise_hr.db` |
| `backend/models/` | Storage for quantized `.gguf` weights |
| `backend/chroma_db/` | Persisted per-tenant vector collections |
| `frontend/src/` | React chat/dashboard UI |

---

## Technology Stack

| Technology | Role |
|---|---|
| Python 3.10+ | Core application language |
| FastAPI / Uvicorn | Async WebSocket gateway |
| SQLite & Pandas | Relational structured employee database |
| llama-cpp-python | Local, CPU-bound LLM execution |
| ChromaDB | Persistent, per-tenant semantic vector search |
| Sentence-Transformers | Dense vector embedding generation |
| React / Vite | Chat/dashboard frontend |

---

## Quick Start for New Developers

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
Download a quantized GGUF model (e.g., `qwen2.5-0.5B-instruct-q4_k_m.gguf`) into `backend/models/`. Update `MODEL_PATH` in `backend/main.py` if the filename differs.

### 4. Initialize Database & Build RAG Index
```bash
python seed_dataset.py   # Downloads dataset and builds enterprise_hr.db
python rag_ingest.py     # Embeds legal PDFs into per-tenant ChromaDB collections
```

### 5. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## Running the Project

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

Open [http://localhost:3000](http://localhost:3000) to interact with the dashboard.

---

## Example Usage

The audit pipeline is WebSocket-only — there is currently no REST endpoint. A minimal Python client:

```python
import asyncio, json, websockets

async def run_audit():
    uri = "ws://localhost:8000/ws/audit/tenant_alpha"
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({
            "mode": "agent",
            "query": "Check compliance for employee EMP-1001 regarding overtime limits.",
            "employee_id": "EMP-1001"
        }))
        async for message in ws:
            event = json.loads(message)
            print(event["type"], "->", event["payload"])
            if event["type"] in ("AGENT_RECEIPT", "CHAT_RESPONSE", "ERROR"):
                break

asyncio.run(run_audit())
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Every response contains `{"error": "Unknown tool"}` | Ensure the tool name strings passed to `execute_tool(...)` in `main.py` exactly match the names used in `register_tool(...)` in `mcp_server.py` (this repo previously had a mismatch on `fetch_employee` vs `fetch_employee_records`, and a typo on `flag_payroll_anamoly` vs `flag_payroll_anomaly` — fixed). |
| `AttributeError: 'LocalLlamaEngine' object has no attribute 'get_telemetry'` | Make sure `get_telemetry()` is defined (not commented out) in `engine.py`. |
| `500`/crash on model load | Verify your GGUF file matches the exact `MODEL_PATH` string in `main.py`. |
| Sentence Transformers import error | Run `pip install sentence-transformers` inside your virtual environment. |
| Vector DB not initialized | Run `python rag_ingest.py` to build the per-tenant `chroma_db/` collections. |
| SQLite record not found | Run `python seed_dataset.py` to populate `enterprise_hr.db`. |

---

## Known Limitations / Roadmap

Documented honestly rather than overstated:

- **Single-shot decisioning, not yet multi-agent orchestration.** The `agent` mode's compliance verdict and its execution decision come from one LLM call — there's no separate verifier/critic step checking the verdict against the retrieved clauses before `flag_payroll_anomaly` fires.
- **No human-in-the-loop gate** before autonomous state mutation.
- **Global inference lock** fully serializes generation across all tenants rather than batching concurrent requests.
- **No authentication** on the WebSocket endpoint — `tenant_id` is taken from the URL path with no verification.
- **Employee lookup uses a two-sided `LIKE` match**, which can over-match similar IDs (e.g. `EMP-100` matching `EMP-1001`).
- **Not exposed as an MCP server itself** — the system currently only *consumes* MCP tools internally; it doesn't yet expose its own audit/read tools for external agents to call.

Planned next: split the single reasoning call into retrieval → verdict → verification agents, add an escalation gate before any state mutation, add per-tenant API-key auth, and expose `check_compliance` / `get_audit_receipt` as MCP tools so external agents can call this system directly.

---

## Security & Contributing

- **API Key Handling** — never place real credentials or sensitive PII in public repositories.
- **Git Rules** — never commit `backend/models/`, `backend/chroma_db/`, or SQLite databases to version control. Ensure `.gitignore` includes `*.gguf`, `chroma_db/`, `*.db`, `.env`, and `node_modules/`.

---

## License

This project is licensed under the MIT License.
