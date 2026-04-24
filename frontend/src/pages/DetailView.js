import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

export default function DetailView({ feature, featureKey, itemId, onBack, onNavigate }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [showDelete, setShowDelete] = useState(false);

  const fetchItem = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`${feature.endpoint}/${itemId}`);
      setItem(res.data);
      setFormData(res.data);
    } catch (err) {
      console.error('Error fetching item:', err);
    } finally {
      setLoading(false);
    }
  }, [feature.endpoint, itemId]);

  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`${feature.endpoint}/${itemId}`, formData);
      setItem(res.data);
      setEditing(false);
    } catch (err) {
      alert('Error updating: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`${feature.endpoint}/${itemId}`);
      onBack();
    } catch (err) {
      alert('Error deleting: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatFieldName = (field) => field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const formatValue = (value, field) => {
    if (value === null || value === undefined) return '—';
    if (field === 'created_at' || field === 'updated_at' || field === 'voted_at' || field === 'transaction_date' || field === 'event_date') {
      return new Date(value).toLocaleString();
    }
    if (field === 'treasury_value' || field === 'amount') return `$${Number(value).toLocaleString()}`;
    if (field === 'voting_power') return Number(value).toLocaleString();
    if (field === 'total_members') return Number(value).toLocaleString();
    if (field === 'participation_rate') return `${value}%`;
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

  if (loading) {
    return <div className="ai-loading"><div className="spinner"></div><p>Loading details...</p></div>;
  }

  if (!item) {
    return <div className="empty-state"><h3>Item not found</h3></div>;
  }

  const displayFields = feature.fields.filter(f => f !== 'id');
  const metaFields = ['created_at', 'updated_at', 'voted_at', 'transaction_date', 'event_date'].filter(f => item[f]);

  return (
    <div className="detail-container">
      <button className="back-btn" onClick={onBack}>← Back to {feature.title}</button>

      <div className="detail-card">
        <div className="detail-header">
          <div>
            <div className="detail-title">{item.title || item.name || item.proposal_title || `${feature.title} #${item.id}`}</div>
            {item.status && <span className={getStatusClass(item.status)} style={{ marginTop: 8, display: 'inline-block' }}>{item.status}</span>}
          </div>
          <div className="detail-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => { setFormData(item); setEditing(true); }}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => setShowDelete(true)}>Delete</button>
          </div>
        </div>

        <div className="detail-grid">
          {displayFields.map(f => (
            <div className="detail-field" key={f}>
              <label>{formatFieldName(f)}</label>
              <span>{(f === 'status' || f === 'impact_level' || f === 'vote_choice') ? (
                <span className={getStatusClass(item[f])}>{item[f] || '—'}</span>
              ) : formatValue(item[f], f)}</span>
            </div>
          ))}
          {metaFields.map(f => (
            <div className="detail-field" key={f}>
              <label>{formatFieldName(f)}</label>
              <span>{formatValue(item[f], f)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit {feature.title.replace(/s$/, '').replace(/ Directory| Management| Records| Registry| Events/g, '')}</h3>
            <form onSubmit={handleUpdate}>
              {feature.fields.map(f => (
                <div className="form-group" key={f}>
                  <label>{formatFieldName(f)}</label>
                  {f === 'description' || f === 'reason' ? (
                    <textarea value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })} />
                  ) : f === 'status' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="passed">Passed</option>
                      <option value="rejected">Rejected</option>
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                      <option value="upcoming">Upcoming</option>
                    </select>
                  ) : f === 'vote_choice' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="for">For</option>
                      <option value="against">Against</option>
                      <option value="abstain">Abstain</option>
                    </select>
                  ) : f === 'proposal_type' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="governance">Governance</option>
                      <option value="protocol">Protocol</option>
                      <option value="treasury">Treasury</option>
                      <option value="social">Social</option>
                    </select>
                  ) : f === 'transaction_type' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="transfer">Transfer</option>
                      <option value="grant">Grant</option>
                      <option value="swap">Swap</option>
                      <option value="investment">Investment</option>
                      <option value="staking">Staking</option>
                      <option value="buyback">Buyback</option>
                    </select>
                  ) : f === 'event_type' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="vote">Vote</option>
                      <option value="forum">Forum</option>
                      <option value="launch">Launch</option>
                      <option value="review">Review</option>
                      <option value="call">Call</option>
                      <option value="nomination">Nomination</option>
                    </select>
                  ) : f === 'impact_level' ? (
                    <select value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  ) : f === 'event_date' ? (
                    <input type="datetime-local" value={formData[f] ? formData[f].substring(0, 16) : ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })} />
                  ) : (
                    <input type={['votes_for', 'votes_against', 'quorum_required', 'voting_power', 'participation_rate', 'delegators_count', 'proposals_voted', 'proposals_created', 'reputation_score', 'amount', 'total_members', 'treasury_value', 'active_proposals'].includes(f) ? 'number' : 'text'} value={formData[f] || ''} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })} />
                  )}
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDelete && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog">
              <h3 style={{ marginBottom: 16 }}>Confirm Delete</h3>
              <p>Are you sure you want to delete this item? This action cannot be undone.</p>
              <div className="btn-group">
                <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
