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

  const [textInput, setTextInput] = useState('');
  const [multiSelect, setMultiSelect] = useState([]);
  const [extraField, setExtraField] = useState('');

  useEffect(() => {
    if (feature.dataEndpoint) {
      api.get(feature.dataEndpoint, { params: { limit: 100 } })
        .then(res => {
          const data = res.data?.data && Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
          setItems(data);
        })
        .catch(console.error);
    }
  }, [feature.dataEndpoint]);

  const runAnalysis = async () => {
    setLoading(true);
    setAiResult(null);
    try {
      const payload = {};
      if (feature.dataEndpoint && selectedId && !feature.idField) {
        payload.proposal_id = parseInt(selectedId);
      }
      if (feature.idField && selectedId) {
        payload[feature.idField] = parseInt(selectedId);
      }
      if (featureKey === 'delegate-recommendations' && preferences) {
        payload.preferences = preferences;
      }
      if (featureKey === 'proposal-similarity' && textInput) {
        payload.proposal_text = textInput;
      }
      if (featureKey === 'multi-dao-comparison' && multiSelect.length >= 2) {
        payload.dao_ids = multiSelect.map(id => parseInt(id));
      }
      if (featureKey === 'treasury-rebalancer' && extraField) {
        payload.target_risk = extraField;
      }
      if (featureKey === 'voting-alerts' && extraField) {
        payload.sensitivity = extraField;
      }
      if (featureKey === 'compliance-check' && extraField) {
        payload.jurisdiction = extraField;
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
    return aiResult.analysis || aiResult.prediction || aiResult.risk_assessment ||
      aiResult.recommendations || aiResult.health_score || aiResult.sentiment ||
      aiResult.timeline || aiResult.network_analysis || aiResult.similarity_analysis ||
      aiResult.education || aiResult.comparison || aiResult.rebalancing_plan ||
      aiResult.alerts || aiResult.compliance_report;
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

        {featureKey === 'proposal-similarity' && (
          <div className="form-group">
            <label>Proposal Text</label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste the new proposal text to compare against historical proposals..."
              rows={6}
            />
          </div>
        )}

        {featureKey === 'multi-dao-comparison' && (
          <div className="form-group">
            <label>Select DAOs to Compare (hold Ctrl/Cmd for multi-select; choose at least 2)</label>
            <select
              multiple
              value={multiSelect}
              onChange={(e) => setMultiSelect(Array.from(e.target.selectedOptions, o => o.value))}
              style={{ minHeight: 120 }}
            >
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name} ({item.blockchain})</option>
              ))}
            </select>
          </div>
        )}

        {featureKey === 'treasury-rebalancer' && (
          <div className="form-group">
            <label>Target Risk Profile</label>
            <select value={extraField} onChange={(e) => setExtraField(e.target.value)}>
              <option value="">-- Default (balanced) --</option>
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="growth">Growth</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
        )}

        {featureKey === 'voting-alerts' && (
          <div className="form-group">
            <label>Alert Sensitivity</label>
            <select value={extraField} onChange={(e) => setExtraField(e.target.value)}>
              <option value="">-- Default (medium) --</option>
              <option value="low">Low (only critical)</option>
              <option value="medium">Medium</option>
              <option value="high">High (all signals)</option>
            </select>
          </div>
        )}

        {featureKey === 'compliance-check' && (
          <div className="form-group">
            <label>Jurisdiction</label>
            <select value={extraField} onChange={(e) => setExtraField(e.target.value)}>
              <option value="">-- Default (US) --</option>
              <option value="US">United States</option>
              <option value="EU">European Union</option>
              <option value="UK">United Kingdom</option>
              <option value="Singapore">Singapore</option>
              <option value="Switzerland">Switzerland</option>
              <option value="Cayman">Cayman Islands</option>
            </select>
          </div>
        )}

        <button
          className="btn btn-ai"
          onClick={runAnalysis}
          disabled={
            loading ||
            (feature.dataEndpoint && !feature.noSelect && !selectedId && !['multi-dao-comparison', 'proposal-similarity'].includes(featureKey)) ||
            (featureKey === 'proposal-similarity' && !textInput) ||
            (featureKey === 'multi-dao-comparison' && multiSelect.length < 2)
          }
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
            {aiResult.cached && (
              <span className="model-tag" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', marginRight: 8 }}>CACHED</span>
            )}
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
