import React, { useState, useEffect, useRef } from 'react';

export default function AuditDashboard() {
  const [tenantId, setTenantId] = useState('tenant_alpha');
  const [mode, setMode] = useState('agent');
  const [query, setQuery] = useState('');
  const [empId, setEmpId] = useState('EMP-1001');
  const [chatLog, setChatLog] = useState([]);
  const [pipelineStage, setPipelineStage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket(`ws://localhost:8000/ws/audit/${tenantId}`);

    ws.current.onopen = () => setIsConnected(true);
    ws.current.onclose = () => setIsConnected(false);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'STATUS') {
        setPipelineStage(data.payload);
      } else if (data.type === 'CHAT_RESPONSE') {
        setPipelineStage(null);
        setChatLog(prev => [...prev, { role: 'assistant', type: 'chat', text: data.payload.response }]);
      } else if (data.type === 'AGENT_RECEIPT') {
        setPipelineStage(null);
        setChatLog(prev => [...prev, { role: 'assistant', type: 'agent', payload: data.payload }]);
      } else if (data.type === 'ERROR') {
        setPipelineStage(null);
        setChatLog(prev => [...prev, { role: 'assistant', type: 'error', text: data.payload.message }]);
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [tenantId]);

  const handleSend = () => {
    if (!query.trim() || !isConnected) return;

    const userMessage = { role: 'user', text: query };
    setChatLog(prev => [...prev, userMessage]);

    ws.current.send(JSON.stringify({
      mode: mode,
      query: query,
      employee_id: empId
    }));

    setQuery('');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8f9fa', fontFamily: 'sans-serif' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem 3rem', height: '100%' }}>
        
        {/* Header & Multi-Tenant Config Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <div>
            <h3 style={{ margin: 0, color: '#212529' }}>Multi-Tenant SaaS Audit Engine</h3>
            <span style={{ fontSize: '0.8rem', color: isConnected ? '#28a745' : '#dc3545', fontWeight: 'bold' }}>
              ● {isConnected ? `Connected (Tenant: ${tenantId})` : 'Disconnected'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#6c757d', marginRight: '6px' }}>Tenant Context:</label>
              <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ced4da' }}>
                <option value="tenant_alpha">Tenant Alpha (Acme Corp)</option>
                <option value="tenant_beta">Tenant Beta (Stark Ind)</option>
              </select>
            </div>

            <div style={{ display: 'flex', background: '#e9ecef', borderRadius: '6px', padding: '2px' }}>
              <button onClick={() => setMode('chat')} style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', background: mode === 'chat' ? '#fff' : 'transparent', fontWeight: 'bold', cursor: 'pointer' }}>Chat</button>
              <button onClick={() => setMode('agent')} style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', background: mode === 'agent' ? '#fff' : 'transparent', fontWeight: 'bold', cursor: 'pointer' }}>Agentic Execution</button>
            </div>
          </div>
        </div>

        {/* Real-time Message Stream */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '10px', marginBottom: '1rem' }}>
          {chatLog.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'user' ? (
                <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: '12px', background: '#007bff', color: '#fff' }}>{msg.text}</div>
              ) : msg.type === 'chat' ? (
                <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: '12px', background: '#fff', border: '1px solid #dee2e6' }}>{msg.text}</div>
              ) : msg.type === 'agent' ? (
                <div style={{ maxWidth: '80%', background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: msg.payload.decision_payload.is_compliant ? '#28a745' : '#dc3545' }}>
                    Compliance Status: {msg.payload.decision_payload.is_compliant ? "PASSED" : "FAILED"}
                  </h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>{msg.payload.decision_payload.violation_details}</p>
                  {msg.payload.automated_action_taken && (
                    <div style={{ background: '#fff3cd', border: '1px solid #ffe69c', padding: '10px', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <strong>Action Executed:</strong> {msg.payload.automated_action_taken.action} | <strong>Audit ID:</strong> {msg.payload.automated_action_taken.audit_trail_id}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'red' }}>Error: {msg.text}</div>
              )}
            </div>
          ))}

          {/* Live Pipeline Execution Ticker */}
          {pipelineStage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#e9ecef', padding: '10px 16px', borderRadius: '8px', width: 'fit-content' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#495057' }}>[{pipelineStage.stage}]</span>
              <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>{pipelineStage.message}...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '10px', background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #ced4da' }}>
          <input 
            value={empId} 
            onChange={(e) => setEmpId(e.target.value)} 
            placeholder="Employee ID" 
            style={{ width: '120px', padding: '8px', border: '1px solid #dee2e6', borderRadius: '4px' }}
          />
          <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
            placeholder="Enter query or command..." 
            style={{ flex: 1, border: 'none', outline: 'none', padding: '8px' }}
          />
          <button onClick={handleSend} style={{ padding: '8px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Send</button>
        </div>

      </div>
    </div>
  );
}