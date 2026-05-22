import React, { useEffect, useState } from 'react';
import api from '../api';

const emptyForm = { dao_name: '', quorum: 50, threshold: 50, delegation_enabled: true, max_delegation: 0, notes: '' };

export default function GovernanceRulesEditor() {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/custom-views/governance-rules')
      .then(res => { setRules(res.data.rules || []); setLoading(false); })
      .catch(err => { setError(err.response?.data?.error || err.message); setLoading(false); });
  };

  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/custom-views/governance-rules/${editingId}`, form);
      } else {
        await api.post('/custom-views/governance-rules', form);
      }
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const edit = (rule) => {
    setEditingId(rule.id);
    setForm({
      dao_name: rule.dao_name,
      quorum: rule.quorum,
      threshold: rule.threshold,
      delegation_enabled: rule.delegation_enabled,
      max_delegation: rule.max_delegation,
      notes: rule.notes || '',
    });
  };

  const remove = async (id) => {
    setError('');
    try {
      await api.delete(`/custom-views/governance-rules/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const cancel = () => { setForm(emptyForm); setEditingId(null); };

  const inputStyle = { padding: '8px 10px', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6, fontSize: 13 };

  return (
    <div style={{ background: 'rgba(15,23,42,0.7)', padding: 20, borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)' }}>
      <h3 style={{ color: '#e2e8f0', marginBottom: 12 }}>Governance Rules Editor</h3>
      <form onSubmit={submit} data-testid="rules-form" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8, marginBottom: 16 }}>
        <input placeholder="DAO Name" value={form.dao_name} onChange={(e) => setForm({ ...form, dao_name: e.target.value })} required style={inputStyle} />
        <input type="number" placeholder="Quorum %" value={form.quorum} onChange={(e) => setForm({ ...form, quorum: e.target.value })} min="0" max="100" style={inputStyle} />
        <input type="number" placeholder="Threshold %" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} min="0" max="100" style={inputStyle} />
        <input type="number" placeholder="Max Delegation" value={form.max_delegation} onChange={(e) => setForm({ ...form, max_delegation: e.target.value })} min="0" style={inputStyle} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1', fontSize: 13 }}>
          <input type="checkbox" checked={!!form.delegation_enabled} onChange={(e) => setForm({ ...form, delegation_enabled: e.target.checked })} /> Delegation
        </label>
        <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inputStyle} />
        <button type="submit" style={{ padding: '8px 14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {editingId ? 'Update' : 'Add'}
        </button>
        {editingId && (
          <button type="button" onClick={cancel} style={{ padding: '8px 14px', background: 'rgba(148,163,184,0.2)', color: '#cbd5e1', border: '1px solid rgba(148,163,184,0.3)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
        )}
      </form>
      {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}
      {loading ? <div style={{ color: '#94a3b8' }}>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: '#94a3b8', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>DAO</th>
              <th style={{ padding: 8 }}>Quorum %</th>
              <th style={{ padding: 8 }}>Threshold %</th>
              <th style={{ padding: 8 }}>Delegation</th>
              <th style={{ padding: 8 }}>Max Delegation</th>
              <th style={{ padding: 8 }}>Notes</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} data-testid="rule-row" style={{ color: '#e2e8f0', borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                <td style={{ padding: 8 }}>{r.dao_name}</td>
                <td style={{ padding: 8 }}>{r.quorum}</td>
                <td style={{ padding: 8 }}>{r.threshold}</td>
                <td style={{ padding: 8 }}>{r.delegation_enabled ? 'Yes' : 'No'}</td>
                <td style={{ padding: 8 }}>{r.max_delegation}</td>
                <td style={{ padding: 8, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => edit(r)} style={{ marginRight: 6, padding: '4px 10px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 4, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => remove(r.id)} style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
