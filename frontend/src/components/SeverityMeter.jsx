import './SeverityMeter.css';

const SEVERITY_CONFIG = {
  low:      { value: 25, color: 'var(--severity-low)',      label: 'Low',      desc: 'Minor inconvenience' },
  medium:   { value: 50, color: 'var(--severity-medium)',   label: 'Medium',   desc: 'Needs attention' },
  high:     { value: 75, color: 'var(--severity-high)',     label: 'High',     desc: 'Urgent repair needed' },
  critical: { value: 100, color: 'var(--severity-critical)', label: 'Critical', desc: 'Immediate action required' },
};

export default function SeverityMeter({ severity = 'medium', compact = false, showLabel = true }) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium;

  return (
    <div className={`severity-meter ${compact ? 'severity-meter--compact' : ''}`}>
      {showLabel && !compact && (
        <div className="severity-meter__labels">
          <span className="severity-meter__label" style={{ color: config.color }}>
            {config.label} Severity
          </span>
          <span className="severity-meter__desc">{config.desc}</span>
        </div>
      )}
      <div className="severity-meter__bar-track">
        <div
          className="severity-meter__bar-fill"
          style={{ width: `${config.value}%`, background: config.color }}
        />
      </div>
      {compact && (
        <span className="severity-meter__compact-label" style={{ color: config.color }}>
          {config.label}
        </span>
      )}
    </div>
  );
}
