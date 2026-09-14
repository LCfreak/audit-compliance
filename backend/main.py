
import asyncio
import json
import re
import traceback
from typing import Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Header
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions

from engine import LocalLlamaEngine
from mcp_server import chatbot_mcp, agentic_mcp

app = FastAPI()

MODEL_PATH = "./models/qwen2.5-0.5B-instruct-q4_k_m.gguf"
DB_DIR = "./chroma_db"

engine = LocalLlamaEngine(model_path=MODEL_PATH, n_ctx=4096, n_gpu_layers=0)
chroma_client = chromadb.PersistentClient(path=DB_DIR)
embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="BAAI/bge-small-en-v1.5")

inference_lock = asyncio.Lock()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: str):
        await websocket.accept()
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = []
        self.active_connections[tenant_id].append(websocket)

    def disconnect(self, websocket: WebSocket, tenant_id: str):
        if tenant_id in self.active_connections:
            self.active_connections[tenant_id].remove(websocket)

    async def send_event(self, websocket: WebSocket, event_type: str, payload: dict):
        await websocket.send_text(json.dumps({"type": event_type, "payload": payload}))

ws_manager = ConnectionManager()

def get_tenant_collection(tenant_id: str):
    collection_name = f"legal_compliance_{tenant_id}"
    try:
        return chroma_client.get_collection(name=collection_name, embedding_function=embedding_fn)
    except Exception:
        return chroma_client.get_or_create_collection(name=collection_name, embedding_function=embedding_fn)

@app.websocket("/ws/audit/{tenant_id}")
async def websocket_audit_endpoint(websocket: WebSocket, tenant_id: str):
    await ws_manager.connect(websocket, tenant_id)
    try:
        while True:
            raw_data = await websocket.receive_text()
            message = json.loads(raw_data)
            
            pipeline_mode = message.get("mode", "agent")
            user_query = message.get("query", "")
            emp_id = message.get("employee_id", "EMP-1001")

            await ws_manager.send_event(websocket, "STATUS", {"stage": "INIT", "message": "Pipeline initialized"})

            collection = get_tenant_collection(tenant_id)

            if pipeline_mode == "chat":
                await ws_manager.send_event(websocket, "STATUS", {"stage": "MCP_FETCH", "message": "Fetching tenant employee data"})
                emp_data_json = chatbot_mcp.execute_tool("fetch_employee_records", {"employee_id": emp_id})

                await ws_manager.send_event(websocket, "STATUS", {"stage": "RAG_QUERY", "message": "Searching tenant vector store"})
                results = collection.query(query_texts=[user_query], n_results=3)
                retrieved_docs = results["documents"][0] if results["documents"] else []
                
                legal_context = "\n\n".join(retrieved_docs)
                system_prompt = (
                    "You are an enterprise compliance auditor.\n"
                    f"=== EMPLOYEE DATA ===\n{emp_data_json}\n\n"
                    f"=== LEGAL CLAUSES ===\n{legal_context}"
                )

                await ws_manager.send_event(websocket, "STATUS", {"stage": "INFERENCE_QUEUED", "message": "Waiting for model slot"})
                
                async with inference_lock:
                    await ws_manager.send_event(websocket, "STATUS", {"stage": "INFERENCE_RUNNING", "message": "Generating response"})
                    response_text = engine.generate(system_prompt=system_prompt, user_query=user_query)
                    
                    await ws_manager.send_event(websocket, "CHAT_RESPONSE", {
                        "response": response_text,
                        "telemetry": engine.get_telemetry()
                    })

            elif pipeline_mode == "agent":
                await ws_manager.send_event(websocket, "STATUS", {"stage": "MCP_FETCH", "message": "Accessing tenant state"})
                emp_data_json = agentic_mcp.execute_tool("fetch_employee_records", {"employee_id": emp_id})

                await ws_manager.send_event(websocket, "STATUS", {"stage": "RAG_QUERY", "message": "Cross-referencing tenant legal database"})
                results = collection.query(query_texts=[user_query], n_results=3)
                legal_context = "\n".join(results["documents"][0]) if results["documents"] else ""

                system_prompt = (
                    "You are EMMA, an Executional AI. You must output strictly valid JSON matching this schema:\n"
                    "{\n"
                    '  "is_compliant": boolean,\n'
                    '  "violation_details": "string or null",\n'
                    '  "required_action": "flag_payroll_anomaly" or "none"\n'
                    "}\n"
                    f"DATA:\n{emp_data_json}\n"
                    f"LAWS:\n{legal_context}"
                )

                async with inference_lock:
                    await ws_manager.send_event(websocket, "STATUS", {"stage": "INFERENCE_RUNNING", "message": "Evaluating compliance state machine"})
                    raw_llm_json = engine.generate(system_prompt=system_prompt, user_query=user_query)

                try:
                    decision = json.loads(raw_llm_json)
                except json.JSONDecodeError:
                    decision = {"is_compliant": False, "violation_details": "Malformed LLM structural output", "required_action": "none"}

                action_receipt = None
                if decision.get("required_action") == "flag_payroll_anomaly":
                    await ws_manager.send_event(websocket, "STATUS", {"stage": "EXECUTION", "message": "Executing database state modification"})
                    raw_receipt = agentic_mcp.execute_tool(
                        "flag_payroll_anomaly",
                        {
                            "employee_id": emp_id,
                            "reason": decision.get("violation_details", "Detected compliance anomaly"),
                            "severity": "HIGH"
                        }
                    )
                    action_receipt = json.loads(raw_receipt)

                await ws_manager.send_event(websocket, "AGENT_RECEIPT", {
                    "decision_payload": decision,
                    "automated_action_taken": action_receipt,
                    "telemetry": engine.get_telemetry()
                })

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, tenant_id)
    except Exception as err:
        traceback.print_exc()
        await ws_manager.send_event(websocket, "ERROR", {"message": str(err)})
        ws_manager.disconnect(websocket, tenant_id)
