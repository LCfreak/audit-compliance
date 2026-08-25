
import sqlite3
import json
import os
from pydantic import BaseModel, ValidationError
from typing import Callable, Dict, Any
from seed_dataset import download_and_init_db, DB_PATH

# Automatically download dataset and build SQLite database on startup if missing
if not os.path.exists(DB_PATH):
    download_and_init_db()

class FetchEmployeeSchema(BaseModel):
    employee_id: str

class EnterpriseMCPServer:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._schemas: Dict[str, Any] = {}
        self.register_tool("fetch_employee_contract", self.query_employee_record, FetchEmployeeSchema)

    def register_tool(self, name: str, func: Callable, schema: Any):
        self._tools[name] = func
        self._schemas[name] = schema

    def query_employee_record(self, employee_id: str) -> dict:
        """Queries the real SQLite database using secure parameterized wildcards."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Look up by exact ID or partial substring match
        cursor.execute("SELECT * FROM employees WHERE employee_id LIKE ? LIMIT 1", (f"%{employee_id}%",))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            record = dict(row)
            print(f"[MCP Server] Successfully fetched record for: {employee_id}")
            return record
        
        return {"error": f"Employee identifier '{employee_id}' not found in the live enterprise database."}

    def execute_tool(self, tool_name: str, args: dict) -> str:
        if tool_name not in self._tools:
            return json.dumps({"error": f"Tool '{tool_name}' is unregistered."})
        try:
            schema = self._schemas[tool_name]
            validated_args = schema(**args)
            result = self._tools[tool_name](**validated_args.model_dump())
            return json.dumps(result)
        except ValidationError as e:
            return json.dumps({"error": "Invalid arguments supplied to MCP tool.", "details": e.errors()})
        except Exception as e:
            return json.dumps({"error": str(e)})

mcp_client = EnterpriseMCPServer()