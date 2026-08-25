

import time
import os
from llama_cpp import Llama

class LocalLlamaEngine:
    def __init__(self, model_path: str = "./models/model.gguf", n_ctx: int = 4096, n_gpu_layers: int = 0):
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"GGUF model not found at {model_path}. "
                "Download a GGUF model (e.g., Qwen2.5 or Llama-3.2) and place it in ./models/"
            )

        print(f"[Engine] Loading GGUF model via llama.cpp from {model_path}...")
        self.llm = Llama(
            model_path=model_path,
            n_ctx=n_ctx,             # Context window size
            n_gpu_layers=n_gpu_layers, # Set > 0 if using Metal/CUDA acceleration
            verbose=False
        )
        
        # Internal telemetry metrics
        self.last_prompt_tokens = 0
        self.last_eval_tokens = 0
        self.last_vram_mb = 0.0

    def generate(self, system_prompt: str, user_query: str) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}
        ]
        
        start_time = time.time()
        
        output = self.llm.create_chat_completion(
            messages=messages,
            max_tokens=512,
            temperature=0.2 # low temp for strict legal context
        )
        
        elapsed = time.time() - start_time
        usage = output["usage"]
        
        self.last_prompt_tokens = usage["prompt_tokens"]
        self.last_eval_tokens = usage["completion_tokens"]
        
        # Here we can plug in custom KV Cache / Memory measurement logic
        # For now, calculating approximate context window usage
        ctx_usage = (self.last_prompt_tokens / self.llm.n_ctx()) * 100
        
        print(f"[Engine] Inferred in {elapsed:.2f}s | Prompt Tokens: {self.last_prompt_tokens} | Eval Tokens: {self.last_eval_tokens}")
        
        return output["choices"][0]["message"]["content"]

    def get_telemetry(self) -> dict:
        """Exposes context window and token statistics to the frontend dashboard."""
        return {
            "prompt_tokens": self.last_prompt_tokens,
            "completion_tokens": self.last_eval_tokens,
            "context_window_size": self.llm.n_ctx(),
            "context_utilization_pct": round((self.last_prompt_tokens / self.llm.n_ctx()) * 100, 1),

            # Benchmark metric placeholder for your RocketKV optimization research
            
            "active_kv_pages": max(1, self.last_prompt_tokens // 64),
            "evicted_kv_pages": max(0, (self.last_prompt_tokens // 64) // 3)
        }