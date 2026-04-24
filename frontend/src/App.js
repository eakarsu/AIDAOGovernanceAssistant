import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataPage from './pages/DataPage';
import DetailView from './pages/DetailView';
import AIFeaturePage from './pages/AIFeaturePage';

const FEATURES = {
  // Non-AI Features
  proposals: { title: 'Proposals', icon: '📋', desc: 'Manage governance proposals across DAOs', type: 'data', color: '#6366f1', endpoint: '/proposals', fields: ['title', 'description', 'dao_name', 'proposal_type', 'status', 'votes_for', 'votes_against', 'quorum_required', 'proposer'], tableFields: ['title', 'dao_name', 'proposal_type', 'status', 'votes_for', 'votes_against'] },
  delegates: { title: 'Delegates Directory', icon: '👥', desc: 'Browse and manage DAO delegates', type: 'data', color: '#3b82f6', endpoint: '/delegates', fields: ['name', 'address', 'dao_name', 'voting_power', 'participation_rate', 'delegators_count', 'proposals_voted', 'proposals_created', 'reputation_score'], tableFields: ['name', 'dao_name', 'voting_power', 'participation_rate', 'reputation_score'] },
  treasury: { title: 'Treasury Management', icon: '💰', desc: 'Track treasury transactions and balances', type: 'data', color: '#10b981', endpoint: '/treasury', fields: ['dao_name', 'transaction_type', 'amount', 'token_symbol', 'description', 'from_address', 'to_address', 'status'], tableFields: ['dao_name', 'transaction_type', 'amount', 'token_symbol', 'status'] },
  voting: { title: 'Voting Records', icon: '🗳️', desc: 'View and manage voting history', type: 'data', color: '#f59e0b', endpoint: '/voting', fields: ['proposal_title', 'voter_name', 'voter_address', 'dao_name', 'vote_choice', 'voting_power', 'reason'], tableFields: ['proposal_title', 'voter_name', 'dao_name', 'vote_choice', 'voting_power'] },
  daos: { title: 'DAO Registry', icon: '🏛️', desc: 'Manage registered DAOs and their details', type: 'data', color: '#8b5cf6', endpoint: '/daos', fields: ['name', 'description', 'blockchain', 'governance_token', 'total_members', 'treasury_value', 'active_proposals', 'website_url'], tableFields: ['name', 'blockchain', 'governance_token', 'total_members', 'treasury_value'] },
  events: { title: 'Governance Events', icon: '📅', desc: 'Track upcoming governance events', type: 'data', color: '#ec4899', endpoint: '/events', fields: ['title', 'description', 'dao_name', 'event_type', 'event_date', 'impact_level', 'status'], tableFields: ['title', 'dao_name', 'event_type', 'impact_level', 'status'] },
  // AI Features
  'proposal-impact': { title: 'Proposal Impact Analysis', icon: '🔍', desc: 'AI-powered analysis of proposal impacts on DAO ecosystem', type: 'ai', color: '#8b5cf6', aiEndpoint: '/ai/proposal-impact', dataEndpoint: '/proposals', selectField: 'title', selectLabel: 'Select a Proposal' },
  'voting-prediction': { title: 'Voting Pattern Prediction', icon: '📊', desc: 'AI prediction of voting outcomes and patterns', type: 'ai', color: '#a855f7', aiEndpoint: '/ai/voting-prediction', noSelect: true },
  'treasury-risk': { title: 'Treasury Risk Assessment', icon: '⚠️', desc: 'AI analysis of treasury risks and health', type: 'ai', color: '#ef4444', aiEndpoint: '/ai/treasury-risk', noSelect: true },
  'delegate-recommendations': { title: 'Delegate Recommendations', icon: '🎯', desc: 'AI-powered delegate recommendations and scoring', type: 'ai', color: '#06b6d4', aiEndpoint: '/ai/delegate-recommendations', noSelect: true },
  'governance-health': { title: 'Governance Health Score', icon: '❤️', desc: 'AI scoring of overall DAO governance health', type: 'ai', color: '#22c55e', aiEndpoint: '/ai/governance-health', noSelect: true },
  'sentiment-analysis': { title: 'Sentiment Analysis', icon: '💬', desc: 'AI analysis of community sentiment on proposals', type: 'ai', color: '#f97316', aiEndpoint: '/ai/sentiment-analysis', dataEndpoint: '/proposals', selectField: 'title', selectLabel: 'Select a Proposal' },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const handleLogin = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentPage('dashboard');
    setSelectedItem(null);
  };

  const navigateTo = (page, item = null) => {
    setCurrentPage(page);
    setSelectedItem(item);
  };

  if (!user || !token) {
    return <Login onLogin={handleLogin} />;
  }

  const feature = FEATURES[currentPage];

  const renderPage = () => {
    if (currentPage === 'dashboard') {
      return <Dashboard features={FEATURES} onNavigate={navigateTo} />;
    }
    if (feature?.type === 'ai') {
      return <AIFeaturePage feature={feature} featureKey={currentPage} onBack={() => navigateTo('dashboard')} />;
    }
    if (feature?.type === 'data' && selectedItem) {
      return <DetailView feature={feature} featureKey={currentPage} itemId={selectedItem} onBack={() => navigateTo(currentPage)} onNavigate={navigateTo} />;
    }
    if (feature?.type === 'data') {
      return <DataPage feature={feature} featureKey={currentPage} onSelectItem={(id) => navigateTo(currentPage, id)} onBack={() => navigateTo('dashboard')} />;
    }
    return <Dashboard features={FEATURES} onNavigate={navigateTo} />;
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>AI DAO Governance</h1>
          <span>Assistant Platform</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-item" style={{ cursor: 'pointer' }} onClick={() => navigateTo('dashboard')}>
            <span className="icon">🏠</span> Dashboard
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">Data Management</div>
          {Object.entries(FEATURES).filter(([, f]) => f.type === 'data').map(([key, f]) => (
            <div key={key} className={`sidebar-item ${currentPage === key ? 'active' : ''}`} onClick={() => navigateTo(key)}>
              <span className="icon">{f.icon}</span> {f.title}
            </div>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">AI Features</div>
          {Object.entries(FEATURES).filter(([, f]) => f.type === 'ai').map(([key, f]) => (
            <div key={key} className={`sidebar-item ${currentPage === key ? 'active' : ''}`} onClick={() => navigateTo(key)}>
              <span className="icon">{f.icon}</span> {f.title}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user.name?.charAt(0) || 'U'}</div>
            <div className="user-details">
              <h4>{user.name}</h4>
              <p>{user.email}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}
