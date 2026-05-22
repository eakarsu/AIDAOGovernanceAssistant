import React, { useEffect, useState } from 'react';

export default function QuorumRescuePlanner({ onBack }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/quorum-rescue-planner').then((res) => res.json()).then(setData).catch(() => setData(null));
  }, []);
  return (
    <div className="page">
      <button className="btn-secondary" onClick={onBack}>Back</button>
      <h1>Quorum Rescue Planner</h1>
      <p>Identify live DAO votes at quorum risk and plan neutral delegate outreach.</p>
      <div className="features-grid">
        {data && Object.entries(data.summary).map(([key, value]) => <div className="feature-card" key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{value}</strong></div>)}
      </div>
      <div className="card">
        {(data?.proposals || []).map((item) => <div key={item.proposal} style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}><strong>{item.proposal}</strong><div>Gap {item.quorum_gap} - {item.delegates_needed} delegates - {item.action}</div></div>)}
      </div>
    </div>
  );
}
