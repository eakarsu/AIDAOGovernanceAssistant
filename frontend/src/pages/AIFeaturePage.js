import React, { useState, useEffect } from 'react';
import api from '../api';

function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^---$/gm, '<hr style="border-color: rgba(139,92,246,0.2); margin: 16px 0;">')
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    .replace(/^\* (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>');

  // Wrap consecutive <li> tags in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  // Wrap remaining text in paragraphs
  html = html.split('\n\n').map(block => {
    if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<hr') || block.startsWith('<ol')) return block;
    if (block.trim() === '') return '';
    return `<p>${block}</p>`;
  }).join('');

  return html;
}

export default function AIFeaturePage({ feature, featureKey, onBack }) {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState('');

  useEffect(() => {
    if (feature.dataEndpoint) {
      api.get(feature.dataEndpoint).then(res => setItems(res.data)).catch(console.error);
    }
  }, [feature.dataEndpoint]);

  const runAnalysis = async () => {
    setLoading(true);
    setAiResult(null);
    try {
      const payload = {};
      if (feature.dataEndpoint && selectedId) {
        payload.proposal_id = parseInt(selectedId);
      }
      if (featureKey === 'delegate-recommendations' && preferences) {
        payload.preferences = preferences;
      }
      const res = await api.post(feature.aiEndpoint, payload);
      setAiResult(res.data);
    } catch (err) {
      setAiResult({ error: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const getAiContent = () => {
    if (!aiResult) return null;
    return aiResult.analysis || aiResult.prediction || aiResult.risk_assessment || aiResult.recommendations || aiResult.health_score || aiResult.sentiment;
  };

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h2>{feature.icon} {feature.title}</h2>
          <p>{feature.desc}</p>
        </div>
      </div>

      <div className="detail-card">
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', marginBottom: 20 }}>
          Configure Analysis
        </h3>

        {feature.dataEndpoint && !feature.noSelect && (
          <div className="form-group">
            <label>{feature.selectLabel || 'Select Item'}</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">-- Select an item --</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item[feature.selectField] || item.name || item.title} ({item.dao_name})
                </option>
              ))}
            </select>
          </div>
        )}

        {featureKey === 'delegate-recommendations' && (
          <div className="form-group">
            <label>Preferences (Optional)</label>
            <textarea
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="E.g., high participation rate, focus on DeFi protocols, prefer decentralization..."
            />
          </div>
        )}

        <button
          className="btn btn-ai"
          onClick={runAnalysis}
          disabled={loading || (feature.dataEndpoint && !feature.noSelect && !selectedId)}
        >
          {loading ? 'Analyzing...' : `Run ${feature.title}`}
        </button>
      </div>

      {loading && (
        <div className="ai-output">
          <div className="ai-loading">
            <div className="spinner"></div>
            <p>AI is analyzing your data...</p>
            <p style={{ fontSize: 12, color: '#64748b' }}>This may take a few seconds</p>
          </div>
        </div>
      )}

      {aiResult && !loading && (
        <div className="ai-output">
          <div className="ai-output-header">
            <div className="ai-icon">🤖</div>
            <div>
              <h3>{feature.title} Results</h3>
              {aiResult.usage && (
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Tokens: {aiResult.usage.prompt_tokens} in / {aiResult.usage.completion_tokens} out
                </p>
              )}
            </div>
            {aiResult.model && <span className="model-tag">{aiResult.model}</span>}
          </div>

          {aiResult.error ? (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 20, color: '#f87171' }}>
              <strong>Error:</strong> {aiResult.error}
            </div>
          ) : (
            <div className="ai-output-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(getAiContent()) }} />
          )}
        </div>
      )}
    </div>
  );
}
