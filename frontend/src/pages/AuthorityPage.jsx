// ============================================================
// AuthorityPage.jsx — Phase 2
// Authority/Admin dashboard for complaint management,
// road health monitoring, and analytics.
// Modules: 10, 13, 14, 17
// ============================================================
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useAuthorityStore from '../store/authorityStore';
import ComplaintQueue from '../components/ComplaintQueue';
import RoadHealthPanel from '../components/RoadHealthPanel';
import MapView from '../components/MapView';
import './AuthorityPage.css';

const tabs = [
  { id: 'overview',   label: '📊 Overview' },
  { id: 'complaints', label: '📋 Complaints' },
  { id: 'road-health',label: '🛣️ Road Health' },
  { id: 'map',        label: '🗺️ Live Map' },
];

const formatRelative = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso);
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

export default function AuthorityPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { dashboard, loading, fetchDashboard } = useAuthorityStore();
  const [activeTab, setActiveTab] = useState('overview');

  // Guard: only authority or admin
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'authority' && user?.role !== 'admin') {
    return (
      <div className="authority-page">
        <div className="authority-denied">
          <span className="authority-denied-icon">🔐</span>
          <div className="authority-denied-title">Access Restricted</div>
          <p>This dashboard is only accessible to Authority Officers and Admins.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchDashboard();
  }, []);

  const stats = dashboard?.stats;

  return (
    <div className="authority-page">
      <div className="authority-container">
        {/* Header */}
        <div className="authority-page-header">
          <div>
            <h1 className="authority-page-title">Authority Dashboard</h1>
            <div className="authority-page-subtitle">
              Welcome back, {user?.name || 'Officer'} — manage complaints and road infrastructure.
            </div>
          </div>
          <span className="authority-role-badge">
            🏛️ {user?.role === 'admin' ? 'System Admin' : 'Authority Officer'}
          </span>
        </div>

        {/* Stat Cards */}
        <div className="authority-stats-grid">
          <div className="authority-stat-card pending">
            <span className="authority-stat-icon">📬</span>
            <span className="authority-stat-value">
              {loading ? '—' : (parseInt(stats?.pending || 0) + parseInt(stats?.under_review || 0))}
            </span>
            <span className="authority-stat-label">Pending Review</span>
          </div>
          <div className="authority-stat-card escalated">
            <span className="authority-stat-icon">⚡</span>
            <span className="authority-stat-value">{loading ? '—' : (stats?.escalated || 0)}</span>
            <span className="authority-stat-label">Escalated</span>
          </div>
          <div className="authority-stat-card critical">
            <span className="authority-stat-icon">🚨</span>
            <span className="authority-stat-value">{loading ? '—' : (stats?.open_critical || 0)}</span>
            <span className="authority-stat-label">Open Critical</span>
          </div>
          <div className="authority-stat-card resolved">
            <span className="authority-stat-icon">✅</span>
            <span className="authority-stat-value">{loading ? '—' : (stats?.resolved_today || 0)}</span>
            <span className="authority-stat-label">Resolved Today</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="authority-tabs" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              id={`authority-tab-${tab.id}`}
              className={`authority-tab ${activeTab === tab.id ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="authority-tab-content" key={activeTab}>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Issue Type Breakdown */}
              {dashboard?.topIssues?.length > 0 && (
                <div className="authority-activity">
                  <div className="authority-activity-title">📊 Top Open Issues by Type & Severity</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {dashboard.topIssues.map((item, i) => (
                      <span key={i} style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.6rem',
                        padding: '0.5rem 0.9rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                      }}>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {item.issue_type?.replace('_', ' ')}
                        </strong>
                        <span style={{ opacity: 0.6 }}>·</span>
                        {item.severity}
                        <span style={{
                          background: 'var(--surface-3)',
                          borderRadius: '999px',
                          padding: '0.1rem 0.5rem',
                          fontWeight: 700,
                          color: 'var(--primary)',
                        }}>
                          {item.cnt}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="authority-activity">
                <div className="authority-activity-title">🕐 Recent Activity</div>
                {loading ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</div>
                ) : (
                  <div className="activity-list">
                    {(dashboard?.recentActivity || []).map((item, i) => (
                      <div className="activity-item" key={i}>
                        <span className="activity-dot" />
                        <span className="activity-text">
                          <strong>{item.reference_no}</strong>
                          {' '}status changed from{' '}
                          <em>{item.old_status?.replace('_', ' ') || '?'}</em>
                          {' '}→{' '}
                          <strong>{item.new_status?.replace('_', ' ')}</strong>
                          {item.changed_by_name && ` by ${item.changed_by_name}`}
                        </span>
                        <span className="activity-time">{formatRelative(item.changed_at)}</span>
                      </div>
                    ))}
                    {(!dashboard?.recentActivity?.length) && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.5rem 0' }}>
                        No recent activity yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'complaints' && <ComplaintQueue />}
          {activeTab === 'road-health' && <RoadHealthPanel />}
          {activeTab === 'map' && (
            <div style={{
              height: '600px',
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: '1rem',
              overflow: 'hidden',
            }}>
              <MapView />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
