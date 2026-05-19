import React from 'react';
import ProposalTurnoutChart from '../components/ProposalTurnoutChart';
import VoterParticipationHeatmap from '../components/VoterParticipationHeatmap';
import ProposalSummaryPDF from '../components/ProposalSummaryPDF';
import GovernanceRulesEditor from '../components/GovernanceRulesEditor';

export default function CustomViewsPage({ onBack }) {
  return (
    <div data-testid="custom-views-page" style={{ padding: 28, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: '#e2e8f0', fontSize: 28, marginBottom: 4 }}>DAO Views</h1>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Custom dashboards: turnout, voter cohorts, summary export, and governance rules.</p>
        </div>
        {onBack && (
          <button onClick={onBack} style={{ padding: '8px 16px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, cursor: 'pointer' }}>← Back</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(560px,1fr))', gap: 20 }}>
        <ProposalTurnoutChart />
        <VoterParticipationHeatmap />
        <ProposalSummaryPDF />
        <GovernanceRulesEditor />
      </div>
    </div>
  );
}
