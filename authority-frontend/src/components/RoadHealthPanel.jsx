// ============================================================
// RoadHealthPanel.jsx — Phase 2
// Road health scoring visualization for authority dashboard
// Module 17: Road Health Scoring
// ============================================================
import { useEffect, useState } from 'react';
import useAuthorityStore from '../store/authorityStore';
import './RoadHealthPanel.css';

const formatDate = (iso) => {
  if (!iso) return 'Never repaired';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function RoadHealthPanel() {
  const { roadHealth, loading, fetchRoadHealth, recomputeRoadHealth } = useAuthorityStore();
  const [recomputing, setRecomputing] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchRoadHealth();
  }, []);

  const handleRecompute = async () => {
    setRecomputing(true);
    const result = await recomputeRoadHealth();
    setRecomputing(false);
    setToast(result.success ? 'Road health scores updated!' : result.message);
    setTimeout(() => setToast(''), 3000);
  };

  // Summary stats
  const good     = roadHealth.filter(r => r.category === 'good').length;
  const fair     = roadHealth.filter(r => r.category === 'fair').length;
  const poor     = roadHealth.filter(r => r.category === 'poor').length;
  const critical = roadHealth.filter(r => r.category === 'critical').length;

  return (
    <div className="road-health-panel">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', zIndex: 2000,
          background: 'var(--success)', color: '#fff', padding: '0.75rem 1.25rem',
          borderRadius: '0.75rem', fontWeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <div className="road-health-header">
        <div>
          <div className="road-health-title">🛣️ Road Health Scores</div>
          <div className="road-health-subtitle">
            {roadHealth.length} road segment{roadHealth.length !== 1 ? 's' : ''} monitored
          </div>
        </div>
        <button
          className="road-health-recompute-btn"
          onClick={handleRecompute}
          disabled={recomputing || loading}
          id="recompute-health-btn"
        >
          {recomputing ? '⏳ Computing…' : '🔄 Recompute Scores'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="road-health-summary">
        <div className="road-health-card good">
          <span className="road-health-card-label">🟢 Good (≥70)</span>
          <span className="road-health-card-value">{good}</span>
        </div>
        <div className="road-health-card fair">
          <span className="road-health-card-label">🟡 Fair (40–69)</span>
          <span className="road-health-card-value">{fair}</span>
        </div>
        <div className="road-health-card poor">
          <span className="road-health-card-label">🟠 Poor (20–39)</span>
          <span className="road-health-card-value">{poor}</span>
        </div>
        <div className="road-health-card critical">
          <span className="road-health-card-label">🔴 Critical (&lt;20)</span>
          <span className="road-health-card-value">{critical}</span>
        </div>
      </div>

      {/* Road List */}
      {loading ? (
        <div className="road-health-empty">
          <span className="road-health-empty-icon">⏳</span>
          <span>Loading road health data…</span>
        </div>
      ) : roadHealth.length === 0 ? (
        <div className="road-health-empty">
          <span className="road-health-empty-icon">🛣️</span>
          <span>No road segments found. Add road segments to see health scores.</span>
        </div>
      ) : (
        <div className="road-health-list">
          {roadHealth.map(road => (
            <div className="road-health-item" key={road.id}>
              {/* Info */}
              <div className="road-health-item-info">
                <span className="road-health-item-name">{road.name || 'Unnamed Road'}</span>
                <div className="road-health-item-meta">
                  <span className="road-health-meta-tag">
                    🏛️ {road.authority_org || 'Unknown Authority'}
                  </span>
                  <span className="road-health-meta-tag">
                    🛣️ {road.road_type || 'local'}
                  </span>
                  {parseInt(road.open_issues) > 0 && (
                    <span className="road-health-meta-tag" style={{ color: '#fb923c' }}>
                      ⚠️ {road.open_issues} open issue{road.open_issues > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="road-health-meta-tag">
                    🔧 {formatDate(road.last_repaired_at)}
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className="road-health-score-col">
                <span className={`road-health-score-num ${road.category}`}>
                  {parseFloat(road.health_score || 100).toFixed(0)}
                </span>
                <div className="road-health-bar-track">
                  <div
                    className={`road-health-bar-fill ${road.category}`}
                    style={{ width: `${Math.max(2, parseFloat(road.health_score || 100))}%` }}
                  />
                </div>
                <span className={`road-health-category-badge ${road.category}`}>
                  {road.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
