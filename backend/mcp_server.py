
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

class FlagPayrollSchema(BaseModel):
    employee_id: str
    reason: str
    severity: str

class BaseMcpServer:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._schemas: Dict[str, Any] = {}

    def register_tool(self, name:str, func: Callable, schema:Any):
        self._tools[name] = func 
        self._schemas[name] = schema

    def execute_tool(self, tool_name: str, args: dict) -> str:
        if tool_name not in self._tools:
            return json.dumps({"error": "Unknown tool"})
        try:
            schema = self._schemas[tool_name]
            validated_args = schema(**args)
            result = self._tools[tool_name](**validated_args.model_dump())
            return json.dumps(result)

        except Exception as e:
            return json.dumps({"error": str(e)})


class ChatbotMcp (BaseMcpServer):
    def __init__ (self):
        super().__init__()
        self.register_tool("fetch_employee_records",self.query_employee_record, FetchEmployeeSchema)


    def query_employee_record(self, employee_id: str) -> dict:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM employees WHERE employee_id LIKE ? ", (f"%{employee_id}%",))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else {"error": "Not found"}
        
class AgenticMcp (ChatbotMcp):
    def __init__(self):
        super().__init__()
        self.register_tool("flag_payroll_anomaly", self.flag_payroll,FlagPayrollSchema )


    def flag_payroll(self, employee_id: str, reason:str, severity: str ) -> dict:
        return {
            "status": "success",
            "action": "payroll_halted",
            "employee_id": employee_id,
            "audit_trail_id": f"AUDIT-{employee_id}-994",
            "reason": reason,
            "severity": severity
        }

chatbot_mcp = ChatbotMcp()
agentic_mcp = AgenticMcp()
        
    

