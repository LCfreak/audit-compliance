

import React, { useState } from 'react';

export default function AuditDashboard() {
  const [query, setQuery] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [metrics, setMetrics] = useState({ vram_usage_mb: 4250, memory_saved_percent: 34.2 });
  const [loading, setLoading] = useState(false);

  const handleAudit = async () => {
    if (!query.trim()) return;
    
    const currentQuery = query;
    setQuery('');
    setChatLog(prev => [...prev, { role: 'user', text: currentQuery }]);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery }) // Backend extracts employee ID automatically now!
      });
      
      if (!res.ok) throw new Error(`Server status ${res.status}`);

      const data = await res.json();
      setChatLog(prev => [...prev, { role: 'assistant', text: data.response }]);
      if (data.telemetry) setMetrics(data.telemetry);
    } catch (err) {
      console.error("API Error:", err);
      setChatLog(prev => [...prev, { 
        role: 'assistant', 
        text: 'Error: Failed to connect to backend. Make sure Uvicorn is running on port 8000.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8f9fa', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* Main Chat Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem 3rem' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 5px 0', color: '#212529' }}>Global Compliance Auditor</h2>
          <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem' }}>Hybrid RAG + MCP Autonomous Agent</p>
        </div>

        {/* Chat Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '10px', marginBottom: '1.5rem' }}>
          {chatLog.length === 0 && (
            <div style={{ textAlign: 'center', color: '#adb5bd', marginTop: '20vh' }}>
              <h3>How can I help you audit today?</h3>
              <p style={{ fontSize: '0.85rem' }}>Example: "Check compliance for employee EMP-1001 regarding overtime limits."</p>
            </div>
          )}
          
          {chatLog.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ 
                maxWidth: '75%', 
                padding: '12px 16px', 
                borderRadius: '12px', 
                background: msg.role === 'user' ? '#007bff' : '#ffffff', 
                color: msg.role === 'user' ? '#ffffff' : '#212529',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                border: msg.role === 'assistant' ? '1px solid #dee2e6' : 'none',
                lineHeight: '1.5',
                fontSize: '0.95rem'
              }}>
                {msg.text}
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#ffffff', border: '1px solid #dee2e6', color: '#6c757d', fontStyle: 'italic' }}>
                Analyzing database record & cross-referencing labor laws...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '12px', background: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #ced4da', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
            placeholder="Ask a compliance question (e.g., 'Audit EMP-1001 for overtime rules')..."
            style={{ flex: 1, border: 'none', outline: 'none', padding: '0.5rem', fontSize: '1rem', background: 'transparent' }}
          />
          <button 
            onClick={handleAudit} 
            style={{ padding: '0.6rem 1.4rem', background: '#007bff', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Send
          </button>
        </div>
      </div>

      {/* Right Telemetry Pane */}
      <div style={{ width: '320px', background: '#ffffff', borderLeft: '1px solid #dee2e6', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ margin: 0, color: '#343a40' }}>Engine Telemetry</h3>
        
        <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 'bold' }}>ACTIVE VRAM / RAM</span>
          <h2 style={{ margin: '5px 0 0 0', color: '#d9534f' }}>{metrics.vram_usage_mb} <span style={{ fontSize: '1rem' }}>MB</span></h2>
        </div>
        
        <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 'bold' }}>KV CACHE SAVED</span>
          <h2 style={{ margin: '5px 0 0 0', color: '#28a745' }}>{metrics.memory_saved_percent}%</h2>
        </div>
      </div>

    </div>
  );
}