// ============================================================
// ComplaintQueue.jsx — Phase 2
// Authority-facing sortable, filterable complaint table
// ============================================================
import { useEffect, useState } from 'react';
import useAuthorityStore from '../store/authorityStore';
import AssignModal from './AssignModal';
import './ComplaintQueue.css';

const ISSUE_ICONS = {
  pothole: '🕳️', crack: '⚡', waterlogging: '💧',
  broken_divider: '🚧', missing_signage: '🔲',
  encroachment: '⛔', streetlight_failure: '💡', other: '📋',
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

export default function ComplaintQueue() {
  const {
    complaints, pagination, filters, loading,
    setFilters, fetchComplaints,
  } = useAuthorityStore();

  const [assignModal, setAssignModal] = useState(null); // { complaint, mode }
  const [toast, setToast]             = useState('');

  useEffect(() => {
    fetchComplaints(1);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSort = (col) => {
    const newOrder = filters.sort === col && filters.order === 'DESC' ? 'ASC' : 'DESC';
    setFilters({ sort: col, order: newOrder });
  };

  const sortIndicator = (col) => {
    if (filters.sort !== col) return '';
    return filters.order === 'DESC' ? ' ↓' : ' ↑';
  };

  return (
    <div className="complaint-queue">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', zIndex: 2000,
          background: 'var(--success)', color: '#fff', padding: '0.75rem 1.25rem',
          borderRadius: '0.75rem', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'modalSlideUp 0.25s ease',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* Filters */}
      <div className="queue-filters">
        <select
          className="queue-filter-select"
          value={filters.status}
          onChange={e => setFilters({ status: e.target.value })}
          id="queue-filter-status"
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          className="queue-filter-select"
          value={filters.severity}
          onChange={e => setFilters({ severity: e.target.value })}
          id="queue-filter-severity"
        >
          <option value="">All Severities</option>
          <option value="critical">🔴 Critical</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>

        <select
          className="queue-filter-select"
          value={filters.issue_type}
          onChange={e => setFilters({ issue_type: e.target.value })}
          id="queue-filter-type"
        >
          <option value="">All Types</option>
          <option value="pothole">Pothole</option>
          <option value="crack">Crack</option>
          <option value="waterlogging">Waterlogging</option>
          <option value="broken_divider">Broken Divider</option>
          <option value="streetlight_failure">Streetlight Failure</option>
          <option value="other">Other</option>
        </select>

        <div className="queue-filter-count">
          <strong>{pagination.total}</strong> complaint{pagination.total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="queue-table-wrapper">
        {loading ? (
          <div className="queue-loading">
            <span style={{ fontSize: '1.5rem' }}>⏳</span> Loading complaints…
          </div>
        ) : complaints.length === 0 ? (
          <div className="queue-empty">
            <span className="queue-empty-icon">📭</span>
            <span>No complaints match the current filters.</span>
          </div>
        ) : (
          <table className="queue-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('reference_no')}>
                  Ref No{sortIndicator('reference_no')}
                </th>
                <th>Issue Type</th>
                <th onClick={() => handleSort('severity')} className={filters.sort === 'severity' ? 'sorted' : ''}>
                  Severity{sortIndicator('severity')}
                </th>
                <th onClick={() => handleSort('status')} className={filters.sort === 'status' ? 'sorted' : ''}>
                  Status{sortIndicator('status')}
                </th>
                <th>Assigned To</th>
                <th onClick={() => handleSort('created_at')} className={filters.sort === 'created_at' ? 'sorted' : ''}>
                  Reported{sortIndicator('created_at')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id}>
                  <td><span className="queue-ref">{c.reference_no}</span></td>
                  <td>
                    <span className="queue-issue-type">
                      <span className="queue-issue-icon">{ISSUE_ICONS[c.issue_type] || '📋'}</span>
                      {c.issue_type?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`queue-severity-label ${c.severity}`}>
                      <span className={`queue-severity-dot ${c.severity}`} />
                      {c.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`queue-status-badge ${c.status}`}>
                      {c.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="queue-date">
                    {c.assigned_officer_name || <span style={{ opacity: 0.4 }}>Unassigned</span>}
                  </td>
                  <td className="queue-date">{formatDate(c.created_at)}</td>
                  <td>
                    <div className="queue-actions">
                      <button
                        className="queue-action-btn assign"
                        id={`assign-btn-${c.id}`}
                        onClick={(e) => { e.stopPropagation(); setAssignModal({ complaint: c, mode: 'assign' }); }}
                      >
                        📋 Assign
                      </button>
                      {c.status !== 'escalated' && c.status !== 'resolved' && (
                        <button
                          className="queue-action-btn escalate"
                          id={`escalate-btn-${c.id}`}
                          onClick={(e) => { e.stopPropagation(); setAssignModal({ complaint: c, mode: 'escalate' }); }}
                        >
                          ⚡ Escalate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="queue-pagination">
            <button
              className="queue-page-btn"
              disabled={pagination.page <= 1}
              onClick={() => fetchComplaints(pagination.page - 1)}
            >
              ← Prev
            </button>
            <span className="queue-page-info">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              className="queue-page-btn"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchComplaints(pagination.page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Assign/Escalate Modal */}
      {assignModal && (
        <AssignModal
          complaint={assignModal.complaint}
          mode={assignModal.mode}
          onClose={() => setAssignModal(null)}
          onSuccess={(msg) => { setAssignModal(null); showToast(msg); }}
        />
      )}
    </div>
  );
}
