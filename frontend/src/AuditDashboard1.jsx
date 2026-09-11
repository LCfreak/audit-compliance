

// import React, { useState } from 'react';

// export default function AuditDashboard() {
//   const [query, setQuery] = useState('');
//   const [chatLog, setChatLog] = useState([]);
//   const [metrics, setMetrics] = useState({ vram_usage_mb: 4250, memory_saved_percent: 34.2 });
//   const [loading, setLoading] = useState(false);

//   const handleAudit = async () => {
//     if (!query.trim()) return;
    
//     const currentQuery = query;
//     setQuery('');
//     setChatLog(prev => [...prev, { role: 'user', text: currentQuery }]);
//     setLoading(true);

//     try {
//       const res = await fetch('http://localhost:8000/api/audit', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ query: currentQuery }) // Backend extracts employee ID automatically now!
//       });
      
//       if (!res.ok) throw new Error(`Server status ${res.status}`);

//       const data = await res.json();
//       setChatLog(prev => [...prev, { role: 'assistant', text: data.response }]);
//       if (data.telemetry) setMetrics(data.telemetry);
//     } catch (err) {
//       console.error("API Error:", err);
//       setChatLog(prev => [...prev, { 
//         role: 'assistant', 
//         text: 'Error: Failed to connect to backend. Make sure Uvicorn is running on port 8000.' 
//       }]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8f9fa', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
//       {/* Main Chat Panel */}
//       <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem 3rem' }}>
        
//         {/* Header */}
//         <div style={{ marginBottom: '1.5rem' }}>
//           <h2 style={{ margin: '0 0 5px 0', color: '#212529' }}>Global Compliance Auditor</h2>
//           <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem' }}>Hybrid RAG + MCP Autonomous Agent</p>
//         </div>

//         {/* Chat Scroll Area */}
//         <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '10px', marginBottom: '1.5rem' }}>
//           {chatLog.length === 0 && (
//             <div style={{ textAlign: 'center', color: '#adb5bd', marginTop: '20vh' }}>
//               <h3>How can I help you audit today?</h3>
//               <p style={{ fontSize: '0.85rem' }}>Example: "Check compliance for employee EMP-1001 regarding overtime limits."</p>
//             </div>
//           )}
          
//           {chatLog.map((msg, idx) => (
//             <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
//               <div style={{ 
//                 maxWidth: '75%', 
//                 padding: '12px 16px', 
//                 borderRadius: '12px', 
//                 background: msg.role === 'user' ? '#007bff' : '#ffffff', 
//                 color: msg.role === 'user' ? '#ffffff' : '#212529',
//                 boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
//                 border: msg.role === 'assistant' ? '1px solid #dee2e6' : 'none',
//                 lineHeight: '1.5',
//                 fontSize: '0.95rem'
//               }}>
//                 {msg.text}
//               </div>
//             </div>
//           ))}
          
//           {loading && (
//             <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
//               <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#ffffff', border: '1px solid #dee2e6', color: '#6c757d', fontStyle: 'italic' }}>
//                 Analyzing database record & cross-referencing labor laws...
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Input Bar */}
//         <div style={{ display: 'flex', gap: '12px', background: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #ced4da', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
//           <input 
//             value={query} 
//             onChange={(e) => setQuery(e.target.value)} 
//             onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
//             placeholder="Ask a compliance question (e.g., 'Audit EMP-1001 for overtime rules')..."
//             style={{ flex: 1, border: 'none', outline: 'none', padding: '0.5rem', fontSize: '1rem', background: 'transparent' }}
//           />
//           <button 
//             onClick={handleAudit} 
//             style={{ padding: '0.6rem 1.4rem', background: '#007bff', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
//           >
//             Send
//           </button>
//         </div>
//       </div>

//       {/* Right Telemetry Pane */}
//       <div style={{ width: '320px', background: '#ffffff', borderLeft: '1px solid #dee2e6', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
//         <h3 style={{ margin: 0, color: '#343a40' }}>Engine Telemetry</h3>
        
//         <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
//           <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 'bold' }}>ACTIVE VRAM / RAM</span>
//           <h2 style={{ margin: '5px 0 0 0', color: '#d9534f' }}>{metrics.vram_usage_mb} <span style={{ fontSize: '1rem' }}>MB</span></h2>
//         </div>
        
//         <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
//           <span style={{ fontSize: '0.8rem', color: '#6c757d', fontWeight: 'bold' }}>KV CACHE SAVED</span>
//           <h2 style={{ margin: '5px 0 0 0', color: '#28a745' }}>{metrics.memory_saved_percent}%</h2>
//         </div>
//       </div>

//     </div>
//   );
// }

import React, { useState } from 'react';

export default function AuditDashboard() {
  const [query, setQuery] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [metrics, setMetrics] = useState({ vram_usage_mb: 0, memory_saved_percent: 0 });
  const [loading, setLoading] = useState(false);
  
  // The professional way to handle dual-pipelines: A mode toggle
  const [mode, setMode] = useState('agent'); // 'chat' or 'agent'

  const handleAudit = async () => {
    if (!query.trim()) return;
    
    const currentQuery = query;
    setQuery('');
    setChatLog(prev => [...prev, { role: 'user', text: currentQuery }]);
    setLoading(true);

    try {
      // Dynamically route to the correct backend pipeline based on the UI toggle
      const endpoint = mode === 'chat' ? '/api/audit/chat' : '/api/audit/agent';
      
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery, employee_id: "EMP-1001" }) 
      });
      
      if (!res.ok) throw new Error(`Server status ${res.status}`);

      const data = await res.json();
      
      // Push the entire payload to the chat log so the UI can decide how to render it
      setChatLog(prev => [...prev, { role: 'assistant', payload: data, modeUsed: mode }]);
      
      if (data.telemetry) setMetrics(data.telemetry);
    } catch (err) {
      console.error("API Error:", err);
      setChatLog(prev => [...prev, { role: 'assistant', error: 'Failed to connect to backend.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Helper component: The "Action Receipt" for autonomous execution
  const ActionReceiptCard = ({ payload }) => {
    const decision = payload.decision_payload || {};
    const action = payload.automated_action_taken;

    return (
      <div style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '8px', padding: '16px', marginTop: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#212529', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: decision.is_compliant ? '#28a745' : '#dc3545' }}></span>
          Compliance Decision: {decision.is_compliant ? "Passed" : "Failed"}
        </h4>
        
        {!decision.is_compliant && (
          <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#495057' }}>
            <strong>Violation:</strong> {decision.violation_details}
          </p>
        )}

        {action ? (
          <div style={{ background: '#fff3cd', border: '1px solid #ffe69c', padding: '12px', borderRadius: '6px' }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 'bold', color: '#856404' }}>SYSTEM ACTION EXECUTED</p>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#664d03' }}><strong>Status:</strong> {action.action}</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#664d03', fontFamily: 'monospace' }}><strong>Audit ID:</strong> {action.audit_trail_id}</p>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6c757d', fontStyle: 'italic' }}>No system actions required.</p>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8f9fa', fontFamily: 'sans-serif' }}>
      
      {/* Main Chat Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '2rem 3rem' }}>
        
        {/* Header with Professional Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: '#212529' }}>Enterprise Audit Engine</h2>
            <p style={{ margin: 0, color: '#6c757d', fontSize: '0.9rem' }}>Dual-Pipeline Architecture</p>
          </div>
          
          <div style={{ display: 'flex', background: '#e9ecef', borderRadius: '8px', padding: '4px' }}>
            <button 
              onClick={() => setMode('chat')}
              style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', background: mode === 'chat' ? '#fff' : 'transparent', color: mode === 'chat' ? '#007bff' : '#6c757d', boxShadow: mode === 'chat' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Conversational RAG
            </button>
            <button 
              onClick={() => setMode('agent')}
              style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', background: mode === 'agent' ? '#fff' : 'transparent', color: mode === 'agent' ? '#dc3545' : '#6c757d', boxShadow: mode === 'agent' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
            >
              Autonomous Execution
            </button>
          </div>
        </div>

        {/* Chat Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '10px', marginBottom: '1.5rem' }}>
          {chatLog.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              
              {/* User Bubble */}
              {msg.role === 'user' && (
                <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: '12px', background: '#007bff', color: '#fff', lineHeight: '1.5', fontSize: '0.95rem' }}>
                  {msg.text}
                </div>
              )}

              {/* Assistant Bubble - Dynamically renders text or Action Receipt */}
              {msg.role === 'assistant' && (
                <div style={{ maxWidth: '85%' }}>
                  {msg.error ? (
                    <div style={{ color: 'red' }}>{msg.error}</div>
                  ) : msg.modeUsed === 'chat' ? (
                    <div style={{ padding: '12px 16px', borderRadius: '12px', background: '#fff', border: '1px solid #dee2e6', lineHeight: '1.5', fontSize: '0.95rem' }}>
                      {msg.payload.response}
                    </div>
                  ) : (
                    <ActionReceiptCard payload={msg.payload} />
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && <div style={{ color: '#6c757d', fontStyle: 'italic' }}>Analyzing via {mode === 'chat' ? 'RAG' : 'Agentic Workflow'}...</div>}
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
            placeholder={mode === 'chat' ? "Ask a compliance question..." : "Initiate autonomous audit..."}
            style={{ flex: 1, padding: '1rem', borderRadius: '8px', border: '1px solid #ced4da', fontSize: '1rem' }}
          />
        </div>
      </div>
    </div>
  );
}