import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Filter, Search, ThumbsUp, Eye, RefreshCw } from 'lucide-react';
import useComplaintsStore from '../store/complaintsStore';
import IssueCard from '../components/IssueCard';
import StatusTimeline from '../components/StatusTimeline';
import './StatusPage.css';

const STATUSES   = ['','submitted','under_review','assigned','in_progress','resolved','rejected','escalated'];
const SEVERITIES = ['','low','medium','high','critical'];
const TYPES      = ['','pothole','crack','waterlogging','broken_divider','missing_signage','other'];

export default function StatusPage() {
  const { complaints, isLoading, fetchComplaints, fetchComplaint, currentComplaint, getStats, filters, setFilter } = useComplaintsStore();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [selectedId, setSelectedId] = useState(null);
  const [myOnly, setMyOnly] = useState(false);

  useEffect(() => {
    fetchComplaints({ my: myOnly });
  }, [myOnly, filters.status, filters.severity, filters.issue_type]);

  const openDetail = async (id) => {
    setSelectedId(id);
    await fetchComplaint(id);
    setViewMode('detail');
  };

  const closeDetail = () => {
    setViewMode('list');
    setSelectedId(null);
  };

  return (
    <div className="page-content">
      <div className="status-page container">
        <div className="status-page__header">
          <div>
            <h1>My Reports</h1>
            <p>Track the status of all your submitted road issue reports</p>
          </div>
          <Link to="/report" className="btn btn-primary">+ New Report</Link>
        </div>

        {/* Toggle My / All */}
        <div className="status-page__toggle">
          <button className={`btn btn-sm ${myOnly ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMyOnly(true)}>
            My Reports
          </button>
          <button className={`btn btn-sm ${!myOnly ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMyOnly(false)}>
            All Reports
          </button>
        </div>

        {/* Filters */}
        <div className="status-page__filters">
          <select className="form-select" value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All Statuses'}</option>)}
          </select>
          <select className="form-select" value={filters.severity} onChange={(e) => setFilter('severity', e.target.value)}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s || 'All Severities'}</option>)}
          </select>
          <select className="form-select" value={filters.issue_type} onChange={(e) => setFilter('issue_type', e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t ? t.replace('_', ' ') : 'All Types'}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchComplaints()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {viewMode === 'detail' && currentComplaint ? (
          /* ── Detail View ──────────────────────────────── */
          <div className="status-page__detail animate-fadeInUp">
            <button className="btn btn-ghost btn-sm" onClick={closeDetail}>← Back to List</button>
            <div className="status-page__detail-grid">
              {/* Main Info */}
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <span className="font-bold">{currentComplaint.reference_no}</span>
                  <div className="flex gap-2">
                    <span className={`badge badge-${currentComplaint.severity}`}>{currentComplaint.severity}</span>
                    <span className={`badge badge-${currentComplaint.status}`}>{currentComplaint.status?.replace('_',' ')}</span>
                  </div>
                </div>
                <div className="card-body">
                  <h2 style={{marginBottom:'var(--space-4)'}}>{currentComplaint.title}</h2>
                  <div style={{display:'flex', gap:'1rem', overflowX:'auto'}}>
                    {currentComplaint.images?.[0] && (
                      <div style={{flex:1}}>
                        <p className="text-sm text-muted mb-2">Reported Issue</p>
                        <img src={currentComplaint.images[0].url} alt="Reported" className="status-page__detail-img" />
                      </div>
                    )}
                    {currentComplaint.resolved_image_url && (
                      <div style={{flex:1}}>
                        <p className="text-sm text-success mb-2" style={{color:'var(--success)', fontWeight:'bold'}}>Resolution Proof</p>
                        <img src={currentComplaint.resolved_image_url} alt="Resolved" className="status-page__detail-img" style={{border: '3px solid var(--success)'}} />
                      </div>
                    )}
                  </div>
                  {currentComplaint.description && <p style={{marginTop:'1rem'}}>{currentComplaint.description}</p>}
                  <div className="status-page__detail-meta">
                    <div><span className="text-muted text-sm">Issue Type</span><br /><strong style={{textTransform:'capitalize'}}>{currentComplaint.issue_type?.replace('_',' ')}</strong></div>
                    <div><span className="text-muted text-sm">Location</span><br /><strong>{currentComplaint.address_text || `${parseFloat(currentComplaint.latitude).toFixed(4)}, ${parseFloat(currentComplaint.longitude).toFixed(4)}`}</strong></div>
                    <div><span className="text-muted text-sm">Reported</span><br /><strong>{new Date(currentComplaint.created_at).toLocaleDateString()}</strong></div>
                    <div><span className="text-muted text-sm">Authority</span><br /><strong>{currentComplaint.authority_org || 'Pending'}</strong></div>
                  </div>
                  {currentComplaint.ai_analyzed && (
                    <div className="status-page__ai-result">
                      <span>🤖 AI Analysis</span>
                      <span>{currentComplaint.ai_issue_type?.replace('_',' ')} — {Math.round((currentComplaint.ai_confidence||0)*100)}% confidence</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Timeline */}
              <div className="card">
                <div className="card-body">
                  <StatusTimeline
                    currentStatus={currentComplaint.status}
                    statusHistory={currentComplaint.statusHistory || []}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── List View ────────────────────────────────── */
          <div>
            {isLoading ? (
              <div className="status-page__loading">
                <div className="spinner spinner-lg" />
              </div>
            ) : complaints.length === 0 ? (
              <div className="status-page__empty">
                <p style={{fontSize:'3rem'}}>🛣️</p>
                <h3>No reports found</h3>
                <p>Be the first to report a road issue in your area</p>
                <Link to="/report" className="btn btn-primary">Report an Issue</Link>
              </div>
            ) : (
              <div className="grid-3">
                {complaints.map((c) => (
                  <div key={c.id} className="stagger-item" onClick={() => openDetail(c.id)} style={{cursor:'pointer'}}>
                    <IssueCard complaint={c} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
