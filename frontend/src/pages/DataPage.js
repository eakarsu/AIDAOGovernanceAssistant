import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

export default function DataPage({ feature, featureKey, onSelectItem, onBack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const limit = 25;

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(feature.endpoint, { params: { page, limit } });
      // Handle both paginated {data,pagination} and raw array responses
      if (res.data && Array.isArray(res.data.data)) {
        setItems(res.data.data);
        setPagination(res.data.pagination || null);
      } else {
        setItems(res.data || []);
        setPagination(null);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  }, [feature.endpoint, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post(feature.endpoint, formData);
      setShowModal(false);
      setFormData({});
      fetchItems();
    } catch (err) {
      alert('Error creating item: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatFieldName = (field) => field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const formatValue = (value, field) => {
    if (value === null || value === undefined) return '—';
    if (field === 'treasury_value' || field === 'amount') return `$${Number(value).toLocaleString()}`;
    if (field === 'voting_power') return Number(value).toLocaleString();
    if (field === 'participation_rate') return `${value}%`;
    if (field === 'total_members') return Number(value).toLocaleString();
    if (typeof value === 'string' && value.length > 50) return value.substring(0, 50) + '...';
    return String(value);
  };

  const getStatusClass = (value) => {
    const v = String(value).toLowerCase();
    if (['active', 'completed'].includes(v)) return `status-badge status-${v}`;
    if (['passed'].includes(v)) return 'status-badge status-passed';
    if (['rejected', 'failed'].includes(v)) return 'status-badge status-rejected';
    if (['pending'].includes(v)) return 'status-badge status-pending';
    if (['upcoming'].includes(v)) return 'status-badge status-upcoming';
    return '';
  };

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
      <div className="page-header">
        <div>
          <h2>{feature.icon} {feature.title}</h2>
          <p>{feature.desc}</p>
        </div>
        <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => { setFormData({}); setShowModal(true); }}>
          + New {feature.title.replace(/s$/, '').replace(/ Directory| Management| Records| Registry| Events/g, '')}
        </button>
      </div>

      {loading ? (
        <div className="ai-loading"><div className="spinner"></div><p>Loading data...</p></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="icon">{feature.icon}</div>
          <h3>No items found</h3>
          <p>Create your first item to get started</p>
        </div>
      ) : (
        <>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                {feature.tableFields.map(f => <th key={f}>{formatFieldName(f)}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} onClick={() => onSelectItem(item.id)}>
                  <td style={{ color: '#64748b' }}>{idx + 1}</td>
                  {feature.tableFields.map(f => (
                    <td key={f}>
                      {(f === 'status' || f === 'impact_level' || f === 'vote_choice') ? (
                        <span className={getStatusClass(item[f])}>{item[f]}</span>
                      ) : formatValue(item[f], f)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '20px 0' }}>
            <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Prev</button>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>Page {pagination.page} of {pagination.totalPages} • {pagination.total} total</span>
            <button className="btn btn-secondary" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New {feature.title.replace(/s$/, '').replace(/ Directory| Management| Records| Registry| Events/g, '')}</h3>
            <form onSubmit={handleCreate}>
              {feature.fields.map(f => (
                <div className="form-group" key={f}>
                  <label>{formatFieldName(f)}</label>
                  {f === 'description' || f === 'reason' ? (
                    <textarea value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })} placeholder={`Enter ${formatFieldName(f).toLowerCase()}`} />
                  ) : f === 'status' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="">Select status</option>
                      <option value="active">Active</option>
                      <option value="passed">Passed</option>
                      <option value="rejected">Rejected</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="upcoming">Upcoming</option>
                    </select>
                  ) : f === 'vote_choice' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="">Select vote</option>
                      <option value="for">For</option>
                      <option value="against">Against</option>
                      <option value="abstain">Abstain</option>
                    </select>
                  ) : f === 'proposal_type' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="">Select type</option>
                      <option value="governance">Governance</option>
                      <option value="protocol">Protocol</option>
                      <option value="treasury">Treasury</option>
                      <option value="social">Social</option>
                    </select>
                  ) : f === 'transaction_type' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="">Select type</option>
                      <option value="transfer">Transfer</option>
                      <option value="grant">Grant</option>
                      <option value="swap">Swap</option>
                      <option value="investment">Investment</option>
                      <option value="staking">Staking</option>
                      <option value="buyback">Buyback</option>
                    </select>
                  ) : f === 'event_type' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="">Select type</option>
                      <option value="vote">Vote</option>
                      <option value="forum">Forum</option>
                      <option value="launch">Launch</option>
                      <option value="review">Review</option>
                      <option value="call">Call</option>
                      <option value="nomination">Nomination</option>
                    </select>
                  ) : f === 'impact_level' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="">Select level</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  ) : f === 'event_date' ? (
                    <input type="datetime-local" value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })} />
                  ) : (
                    <input type={['votes_for', 'votes_against', 'quorum_required', 'voting_power', 'participation_rate', 'delegators_count', 'proposals_voted', 'proposals_created', 'reputation_score', 'amount', 'total_members', 'treasury_value', 'active_proposals'].includes(f) ? 'number' : 'text'} value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })} placeholder={`Enter ${formatFieldName(f).toLowerCase()}`} />
                  )}
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
