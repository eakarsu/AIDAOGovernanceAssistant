import React, { useEffect, useState } from 'react';
import api from '../api';

export default function ProposalTurnoutChart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get('/custom-views/proposal-turnout')
      .then(res => { if (mounted) { setData(res.data); setLoading(false); } })
      .catch(err => { if (mounted) { setError(err.response?.data?.error || err.message); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 16, color: '#94a3b8' }}>Loading turnout data...</div>;
  if (error) return <div style={{ padding: 16, color: '#ef4444' }}>Error: {error}</div>;
  if (!data || !data.proposals || data.proposals.length === 0) return <div style={{ padding: 16, color: '#94a3b8' }}>No proposal data.</div>;

  const maxTotal = Math.max(...data.proposals.map(p => p.votes_for + p.votes_against), 1);

  return (
    <div style={{ background: 'rgba(15,23,42,0.7)', padding: 20, borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)' }}>
      <h3 style={{ color: '#e2e8f0', marginBottom: 6 }}>Proposal Turnout & Results</h3>
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
        Stacked bar of votes for/against. Total: {data.summary.total_proposals} | Passing: {data.summary.passing_count} | Avg turnout: {data.summary.avg_turnout}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.proposals.map((p, i) => {
          const total = p.votes_for + p.votes_against;
          const wFor = (p.votes_for / maxTotal) * 100;
          const wAgainst = (p.votes_against / maxTotal) * 100;
          return (
            <div key={i} data-testid="turnout-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                <span style={{ maxWidth: '60%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
                <span>{p.dao_name} | {total} votes | {p.passing ? 'PASS' : 'FAIL'}</span>
              </div>
              <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', background: 'rgba(30,41,59,0.6)' }}>
                <div title={`For: ${p.votes_for}`} style={{ width: `${wFor}%`, background: 'linear-gradient(90deg,#10b981,#22c55e)' }} />
                <div title={`Against: ${p.votes_against}`} style={{ width: `${wAgainst}%`, background: 'linear-gradient(90deg,#ef4444,#f97316)' }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 18, fontSize: 12, color: '#94a3b8' }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#10b981', marginRight: 6, verticalAlign: 'middle' }} />Votes For</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#ef4444', marginRight: 6, verticalAlign: 'middle' }} />Votes Against</span>
      </div>
    </div>
  );
}
