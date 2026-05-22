import React, { useEffect, useState } from 'react';
import api from '../api';

export default function ProposalSummaryPDF() {
  const [proposals, setProposals] = useState([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/proposals?limit=50').then(res => {
      const list = res.data?.data || [];
      setProposals(list);
      if (list.length > 0) setSelected(list[0].id);
    }).catch(() => {});
  }, []);

  const generate = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/custom-views/proposal-summary-pdf?proposal_id=${selected}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const openPrintable = () => {
    if (!data?.html) return;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(data.html);
      w.document.close();
    }
  };

  return (
    <div style={{ background: 'rgba(15,23,42,0.7)', padding: 20, borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)' }}>
      <h3 style={{ color: '#e2e8f0', marginBottom: 12 }}>Proposal Summary PDF</h3>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          data-testid="pdf-select"
          style={{ padding: '10px 12px', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, minWidth: 280 }}>
          {proposals.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={loading || !selected}
          data-testid="pdf-generate"
          style={{ padding: '10px 16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          {loading ? 'Generating...' : 'Generate Summary'}
        </button>
        {data && (
          <button
            onClick={openPrintable}
            data-testid="pdf-open"
            style={{ padding: '10px 16px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 8, cursor: 'pointer' }}>
            Open Printable
          </button>
        )}
      </div>
      {error && <div style={{ marginTop: 12, color: '#ef4444' }}>{error}</div>}
      {data && (
        <div style={{ marginTop: 16, color: '#cbd5e1', fontSize: 14 }}>
          <div style={{ marginBottom: 8 }}><strong>{data.title}</strong></div>
          <div>Outcome: <span style={{ color: data.summary.outcome === 'PASSING' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{data.summary.outcome}</span></div>
          <div>For: {data.summary.votes_for} ({data.summary.pct_for}%) | Against: {data.summary.votes_against} ({data.summary.pct_against}%) | Quorum: {data.summary.quorum_required}</div>
          <div>Voters listed: {data.voters_count}</div>
        </div>
      )}
    </div>
  );
}
