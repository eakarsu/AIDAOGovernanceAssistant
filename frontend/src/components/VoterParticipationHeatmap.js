import React, { useEffect, useState } from 'react';
import api from '../api';

export default function VoterParticipationHeatmap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get('/custom-views/voter-heatmap')
      .then(res => { if (mounted) { setData(res.data); setLoading(false); } })
      .catch(err => { if (mounted) { setError(err.response?.data?.error || err.message); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{ padding: 16, color: '#94a3b8' }}>Loading heatmap...</div>;
  if (error) return <div style={{ padding: 16, color: '#ef4444' }}>Error: {error}</div>;
  if (!data) return null;

  const max = Math.max(data.max || 0, 1);
  const colorFor = (n) => {
    const intensity = n / max;
    const r = Math.round(99 + intensity * 100);
    const g = Math.round(102 - intensity * 60);
    const b = Math.round(241 - intensity * 80);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div style={{ background: 'rgba(15,23,42,0.7)', padding: 20, borderRadius: 12, border: '1px solid rgba(99,102,241,0.2)' }}>
      <h3 style={{ color: '#e2e8f0', marginBottom: 6 }}>Voter Participation Heatmap</h3>
      <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
        Voter count by proposal × cohort (max in cell: {data.max})
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', color: '#94a3b8', fontSize: 12, padding: 6 }}>Proposal</th>
              {data.cohorts.map(c => (
                <th key={c} style={{ color: '#94a3b8', fontSize: 12, padding: 6 }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row, i) => (
              <tr key={i} data-testid="heatmap-row">
                <td style={{ color: '#cbd5e1', fontSize: 12, padding: 6, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.proposal}</td>
                {data.cohorts.map(c => (
                  <td key={c} style={{ padding: 4 }}>
                    <div title={`${c}: ${row[c]}`} style={{
                      background: colorFor(row[c]),
                      color: '#fff',
                      textAlign: 'center',
                      padding: '6px 10px',
                      borderRadius: 4,
                      fontSize: 12,
                      minWidth: 36,
                    }}>{row[c]}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
