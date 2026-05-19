import React, { useState } from 'react';
import api from '../api';

const tools = [
  {
    id: 'analyze-proposal-language',
    title: 'Proposal Language Analyzer',
    icon: '📝',
    desc: 'Score clarity, find ambiguity, and suggest edits to a DAO proposal.',
    endpoint: '/ai/analyze-proposal-language',
    fields: [
      { name: 'proposal_text', label: 'Proposal Text', type: 'textarea', required: true,
        placeholder: 'Paste full proposal text here...' },
      { name: 'proposal_type', label: 'Proposal Type (optional)', type: 'text',
        placeholder: 'e.g., funding, parameter change, governance' }
    ],
    resultKey: 'analysis',
  },
  {
    id: 'auto-generate-proposal',
    title: 'Auto-Generate Proposal Draft',
    icon: '✨',
    desc: 'Draft a full DAO proposal from a short brief.',
    endpoint: '/ai/auto-generate-proposal',
    fields: [
      { name: 'brief', label: 'Brief', type: 'textarea', required: true,
        placeholder: 'Short description of what the proposal should achieve...' },
      { name: 'dao_name', label: 'DAO Name (optional)', type: 'text', placeholder: 'e.g., Uniswap DAO' },
      { name: 'proposal_type', label: 'Proposal Type (optional)', type: 'text', placeholder: 'e.g., funding' },
      { name: 'budget', label: 'Budget (optional)', type: 'text', placeholder: 'e.g., 50000 USDC' },
      { name: 'timeline', label: 'Timeline (optional)', type: 'text', placeholder: 'e.g., Q3 2026' }
    ],
    resultKey: 'draft',
  },
  {
    id: 'dao-summary',
    title: 'DAO Health Snapshot',
    icon: '🏛️',
    desc: 'Concise governance health snapshot for a DAO.',
    endpoint: '/ai/dao-summary',
    fields: [
      { name: 'dao_id', label: 'DAO ID', type: 'text', required: true, placeholder: 'e.g., 1' }
    ],
    resultKey: 'summary',
  },
  {
    id: 'events-summary',
    title: 'Events Summary',
    icon: '🗒️',
    desc: 'Summarize recent DAO events and discussion threads.',
    endpoint: '/ai/events-summary',
    fields: [
      { name: 'dao_name', label: 'DAO Name (optional)', type: 'text', placeholder: 'e.g., Uniswap DAO' },
      { name: 'limit', label: 'Limit (optional, max 100)', type: 'text', placeholder: '25' }
    ],
    resultKey: 'summary',
  }
];

export default function AINewToolsPage({ onBack }) {
  const [activeId, setActiveId] = useState(tools[0].id);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const tool = tools.find(t => t.id === activeId);

  const switchTool = (id) => {
    setActiveId(id);
    setForm({});
    setResult(null);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    setResult(null);
    const missing = tool.fields.find(f => f.required && (!form[f.name] || !String(form[f.name]).trim()));
    if (missing) {
      setError(`${missing.label} is required`);
      return;
    }
    const payload = {};
    for (const f of tool.fields) {
      if (form[f.name] !== undefined && form[f.name] !== '') {
        payload[f.name] = form[f.name];
      }
    }
    setLoading(true);
    try {
      const { data } = await api.post(tool.endpoint, payload);
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
    setLoading(false);
  };

  return (
    <div className="ai-feature-page">
      <div className="page-header">
        {onBack && (
          <button onClick={onBack} className="back-btn">← Back</button>
        )}
        <h1>🆕 AI New Tools</h1>
        <p>Stateless DAO proposal language analysis and proposal draft generation.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 20 }}>
        {tools.map(t => (
          <button
            key={t.id}
            onClick={() => switchTool(t.id)}
            style={{
              padding: 14,
              borderRadius: 8,
              textAlign: 'left',
              border: activeId === t.id ? '2px solid #8b5cf6' : '2px solid #e5e7eb',
              background: activeId === t.id ? 'rgba(139,92,246,0.08)' : '#fff',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h2 style={{ marginBottom: 16 }}>{tool.icon} {tool.title}</h2>
          {tool.fields.map(f => (
            <div key={f.name} style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                {f.label}{f.required && <span style={{ color: 'red' }}> *</span>}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  rows={6}
                  placeholder={f.placeholder || ''}
                  value={form[f.name] || ''}
                  onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                  style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4, fontFamily: 'inherit' }}
                />
              ) : (
                <input
                  type="text"
                  placeholder={f.placeholder || ''}
                  value={form[f.name] || ''}
                  onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                  style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
                />
              )}
            </div>
          ))}
          <button
            onClick={submit}
            disabled={loading}
            style={{
              marginTop: 8,
              padding: '10px 20px',
              borderRadius: 6,
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Running...' : 'Run AI Tool'}
          </button>
          {error && (
            <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', color: '#991b1b', borderRadius: 4, fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }}>
          <h2 style={{ marginBottom: 16 }}>Result</h2>
          {loading && <div style={{ color: '#6b7280' }}>Running AI analysis...</div>}
          {!loading && !result && (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>No result yet. Run a tool to see output.</div>
          )}
          {result && (
            <div>
              {result.model && (
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
                  Model: {result.model} · Tokens: {result.usage?.total_tokens || 'n/a'}
                </div>
              )}
              <pre style={{
                background: '#f9fafb',
                padding: 12,
                borderRadius: 4,
                fontSize: 12,
                overflow: 'auto',
                maxHeight: 600,
                whiteSpace: 'pre-wrap'
              }}>
                {result[tool.resultKey] || JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
