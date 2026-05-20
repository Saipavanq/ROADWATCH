// ============================================================
// AssignModal.jsx — Phase 2
// Modal for assigning, escalating, or resolving a complaint.
// Mode: 'assign' | 'escalate' | 'resolve'
// ============================================================
import { useState } from 'react';
import useAuthorityStore from '../store/authorityStore';
import './AssignModal.css';

const DUMMY_OFFICERS = [
  { id: 'officer-1', name: 'Ravi Kumar (Bengaluru Zone 1)' },
  { id: 'officer-2', name: 'Priya Sharma (Bengaluru Zone 2)' },
  { id: 'officer-3', name: 'Mohan Das (Mumbai Ward 12)' },
  { id: 'officer-4', name: 'Anjali Rao (Hyderabad Zone 1)' },
];

const DUMMY_CONTRACTORS = [
  { id: 'contractor-1', name: 'SRK Road Works Pvt. Ltd.' },
  { id: 'contractor-2', name: 'NBCC Infrastructure' },
  { id: 'contractor-3', name: 'Hyderabad Civil Contractors' },
];

const ESCALATE_REASONS = [
  'SLA breach — no action in 7+ days',
  'Critical safety hazard',
  'Multiple upvotes from citizens',
  'Media attention / urgent escalation',
  'Higher authority requested',
  'Other',
];

export default function AssignModal({ complaint, mode = 'assign', onClose, onSuccess }) {
  const { assignComplaint, escalateComplaint, resolveComplaint, loading } = useAuthorityStore();

  const [activeMode, setActiveMode] = useState(mode);
  const [assignedTo, setAssignedTo]       = useState('');
  const [contractorId, setContractorId]   = useState('');
  const [dueDate, setDueDate]             = useState('');
  const [reason, setReason]               = useState('');
  const [customReason, setCustomReason]   = useState('');
  const [notes, setNotes]                 = useState('');
  const [error, setError]                 = useState('');
  const [resolvedImage, setResolvedImage] = useState(null);

  const handleAssign = async () => {
    setError('');
    if (!assignedTo && !contractorId) {
      setError('Please select an officer or contractor.');
      return;
    }
    const result = await assignComplaint(complaint.id, {
      assigned_to: assignedTo || null,
      contractor_id: contractorId || null,
      due_date: dueDate || null,
      notes: notes || null,
    });
    if (result.success) onSuccess?.('Complaint assigned successfully!');
    else setError(result.message);
  };

  const handleEscalate = async () => {
    setError('');
    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason) {
      setError('Please select or enter an escalation reason.');
      return;
    }
    const result = await escalateComplaint(complaint.id, finalReason);
    if (result.success) onSuccess?.('Complaint escalated successfully!');
    else setError(result.message);
  };

  const handleResolve = async () => {
    setError('');
    if (!resolvedImage) {
      setError('Please upload a proof image of the resolved issue.');
      return;
    }
    const fd = new FormData();
    fd.append('resolved_image', resolvedImage);
    if (notes) fd.append('notes', notes);
    
    const result = await resolveComplaint(complaint.id, fd);
    if (result.success) onSuccess?.('Complaint marked as resolved!');
    else setError(result.message);
  };

  return (
    <div className="assign-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="assign-modal" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="assign-modal-header">
          <div>
            <div className="assign-modal-title">
              {activeMode === 'assign' ? '📋 Assign Complaint' : activeMode === 'escalate' ? '⚡ Escalate Complaint' : '✅ Resolve Complaint'}
            </div>
            <div className="assign-modal-subtitle">
              {complaint.reference_no} · {complaint.issue_type?.replace('_', ' ')}
            </div>
          </div>
          <button className="assign-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Mode Tabs */}
        <div className="assign-mode-tabs">
          <button
            className={`assign-mode-tab ${activeMode === 'assign' ? 'active' : ''}`}
            onClick={() => { setActiveMode('assign'); setError(''); }}
          >
            📋 Assign
          </button>
          <button
            className={`assign-mode-tab ${activeMode === 'escalate' ? 'active' : ''}`}
            onClick={() => { setActiveMode('escalate'); setError(''); }}
          >
            ⚡ Escalate
          </button>
          <button
            className={`assign-mode-tab ${activeMode === 'resolve' ? 'active' : ''}`}
            onClick={() => { setActiveMode('resolve'); setError(''); }}
          >
            ✅ Resolve
          </button>
        </div>

        {/* Body */}
        <div className="assign-modal-body">
          {error && <div className="assign-error">{error}</div>}

          {activeMode === 'assign' ? (
            <>
              <div className="form-group">
                <label>Assign to Officer</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                  <option value="">— Select Officer —</option>
                  {DUMMY_OFFICERS.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Contractor (optional)</label>
                <select value={contractorId} onChange={e => setContractorId(e.target.value)}>
                  <option value="">— Select Contractor —</option>
                  {DUMMY_CONTRACTORS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Due Date (optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add any instructions or context for the assignee..."
                />
              </div>
            </>
          ) : activeMode === 'escalate' ? (
            <>
              <div className="form-group">
                <label>Escalation Reason</label>
                <select value={reason} onChange={e => setReason(e.target.value)}>
                  <option value="">— Select Reason —</option>
                  {ESCALATE_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              {reason === 'Other' && (
                <div className="form-group">
                  <label>Custom Reason</label>
                  <textarea
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    placeholder="Describe the reason for escalation..."
                  />
                </div>
              )}
            </>
          ) : activeMode === 'resolve' ? (
            <>
              <div className="form-group">
                <label>Resolution Proof (Required)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setResolvedImage(e.target.files[0])}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Resolution Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Details about the work done..."
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="assign-modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          {activeMode === 'assign' ? (
            <button className="btn-assign" onClick={handleAssign} disabled={loading}>
              {loading ? 'Assigning…' : '✓ Assign Complaint'}
            </button>
          ) : activeMode === 'escalate' ? (
            <button className="btn-escalate" onClick={handleEscalate} disabled={loading}>
              {loading ? 'Escalating…' : '⚡ Escalate Now'}
            </button>
          ) : (
            <button className="btn-resolve" onClick={handleResolve} disabled={loading} style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
              {loading ? 'Resolving…' : '✅ Mark Resolved'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
