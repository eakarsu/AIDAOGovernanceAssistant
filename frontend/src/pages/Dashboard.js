import React from 'react';

export default function Dashboard({ features, onNavigate }) {
  const dataFeatures = Object.entries(features).filter(([, f]) => f.type === 'data');
  const aiFeatures = Object.entries(features).filter(([, f]) => f.type === 'ai');

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>AI-Powered DAO Governance Intelligence Platform</p>
        </div>
      </div>

      <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
        Data Management
      </h3>
      <div className="dashboard-grid" style={{ marginBottom: 40 }}>
        {dataFeatures.map(([key, feature]) => (
          <div key={key} className="dashboard-card" style={{ '--card-color': feature.color }} onClick={() => onNavigate(key)}>
            <div className="card-icon" style={{ background: `${feature.color}20`, color: feature.color }}>
              {feature.icon}
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
            <span className="card-badge badge-data">CRUD</span>
          </div>
        ))}
      </div>

      <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
        AI-Powered Features
      </h3>
      <div className="dashboard-grid">
        {aiFeatures.map(([key, feature]) => (
          <div key={key} className="dashboard-card" style={{ '--card-color': feature.color }} onClick={() => onNavigate(key)}>
            <div className="card-icon" style={{ background: `${feature.color}20`, color: feature.color }}>
              {feature.icon}
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
            <span className="card-badge badge-ai">AI Powered</span>
          </div>
        ))}
      </div>
    </div>
  );
}
