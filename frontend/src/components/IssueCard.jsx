import { MapPin, Clock, ThumbsUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SeverityMeter from './SeverityMeter';
import './IssueCard.css';

const ISSUE_ICONS = {
  pothole:        '🕳️',
  crack:          '⚡',
  waterlogging:   '💧',
  broken_divider: '🚧',
  missing_signage:'🚫',
  streetlight_failure: '💡',
  encroachment:   '⚠️',
  other:          '📍',
};

export default function IssueCard({ complaint, compact = false }) {
  const {
    id, reference_no, issue_type, severity, status, title,
    address_text, latitude, longitude,
    primary_image, upvotes, created_at,
  } = complaint;

  const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60)   return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Link to={`/complaint/${id}`} className={`issue-card ${compact ? 'issue-card--compact' : ''}`}>
      {/* Image */}
      <div className="issue-card__image">
        {primary_image ? (
          <img src={primary_image} alt={title} loading="lazy" />
        ) : (
          <div className="issue-card__no-image">
            <span>{ISSUE_ICONS[issue_type] || '📍'}</span>
          </div>
        )}
        <span className={`badge badge-${severity} issue-card__severity`}>
          {severity}
        </span>
      </div>

      {/* Content */}
      <div className="issue-card__body">
        <div className="issue-card__header">
          <span className="issue-card__type">
            {ISSUE_ICONS[issue_type]} {issue_type?.replace('_', ' ')}
          </span>
          <span className={`badge badge-${status}`}>{status?.replace('_', ' ')}</span>
        </div>

        <h3 className="issue-card__title">{title || `${issue_type} issue`}</h3>

        {!compact && <SeverityMeter severity={severity} compact />}

        <div className="issue-card__meta">
          <span className="issue-card__location">
            <MapPin size={12} /> {address_text || `${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}`}
          </span>
          <span className="issue-card__time">
            <Clock size={12} /> {timeAgo(created_at)}
          </span>
        </div>

        <div className="issue-card__footer">
          <span className="issue-card__ref">{reference_no}</span>
          <div className="issue-card__upvotes">
            <ThumbsUp size={12} /> {upvotes || 0}
          </div>
          <ChevronRight size={14} className="issue-card__arrow" />
        </div>
      </div>
    </Link>
  );
}
