import { CheckCircle, Clock, Loader, AlertTriangle, XCircle, ArrowUp } from 'lucide-react';
import './StatusTimeline.css';

const STATUS_CONFIG = {
  submitted:    { icon: CheckCircle,    color: '#94A3B8', label: 'Submitted' },
  under_review: { icon: Clock,          color: '#60A5FA', label: 'Under Review' },
  assigned:     { icon: CheckCircle,    color: '#93C5FD', label: 'Assigned' },
  in_progress:  { icon: Loader,         color: '#FBBF24', label: 'In Progress' },
  resolved:     { icon: CheckCircle,    color: '#4ADE80', label: 'Resolved' },
  rejected:     { icon: XCircle,        color: '#EF4444', label: 'Rejected' },
  escalated:    { icon: ArrowUp,        color: '#A78BFA', label: 'Escalated' },
};

const FLOW = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved'];

export default function StatusTimeline({ currentStatus, statusHistory = [] }) {
  const currentIdx = FLOW.indexOf(currentStatus);

  return (
    <div className="status-timeline">
      <h4 className="status-timeline__title">Progress</h4>

      {/* Step Bar */}
      <div className="status-timeline__steps">
        {FLOW.map((step, idx) => {
          const config  = STATUS_CONFIG[step];
          const Icon    = config.icon;
          const isDone  = idx < currentIdx;
          const isActive= idx === currentIdx;

          return (
            <div key={step} className="status-timeline__step">
              <div className={`status-timeline__dot ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                   style={isActive ? { borderColor: config.color, background: `${config.color}22` } : {}}>
                <Icon size={14} style={{ color: isActive || isDone ? config.color : 'var(--text-muted)' }} />
              </div>
              <span className="status-timeline__step-label"
                    style={{ color: isActive ? config.color : isDone ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                {config.label}
              </span>
              {idx < FLOW.length - 1 && (
                <div className={`status-timeline__connector ${idx < currentIdx ? 'done' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* History Log */}
      {statusHistory.length > 0 && (
        <div className="status-timeline__history">
          <h5 className="status-timeline__history-title">Activity Log</h5>
          {statusHistory.map((entry, i) => {
            const config = STATUS_CONFIG[entry.new_status];
            return (
              <div key={i} className="status-timeline__entry">
                <div className="status-timeline__entry-dot" style={{ background: config?.color }} />
                <div className="status-timeline__entry-content">
                  <span className="status-timeline__entry-status" style={{ color: config?.color }}>
                    {config?.label}
                  </span>
                  {entry.notes && (
                    <p className="status-timeline__entry-notes">{entry.notes}</p>
                  )}
                  <span className="status-timeline__entry-time">
                    {entry.changed_by_name && `by ${entry.changed_by_name} · `}
                    {new Date(entry.changed_at).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
