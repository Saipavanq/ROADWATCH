import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, MapPin, Zap } from 'lucide-react';
import useComplaintsStore from '../store/complaintsStore';
import './DashboardPage.css';

const COLORS = {
  pothole:        '#FF6B2C',
  crack:          '#4ECDC4',
  waterlogging:   '#60A5FA',
  broken_divider: '#A78BFA',
  missing_signage:'#FBBF24',
  other:          '#94A3B8',
};

const STATUS_DATA = [
  { name: 'Mon', reported: 12, resolved: 8 },
  { name: 'Tue', reported: 19, resolved: 14 },
  { name: 'Wed', reported: 8,  resolved: 11 },
  { name: 'Thu', reported: 24, resolved: 18 },
  { name: 'Fri', reported: 15, resolved: 12 },
  { name: 'Sat', reported: 21, resolved: 16 },
  { name: 'Sun', reported: 9,  resolved: 7  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip__label">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { stats, fetchStats, complaints, fetchComplaints, isLoading } = useComplaintsStore();

  useEffect(() => {
    fetchStats();
    fetchComplaints();
  }, []);

  const overview = stats?.overview || {};
  const byType   = stats?.byType   || [];

  const statCards = [
    { icon: AlertTriangle, label: 'Total Reported', value: overview.total || 0,      color: 'var(--primary)', bg: 'rgba(255,107,44,0.1)' },
    { icon: Clock,         label: 'In Progress',    value: overview.in_progress || 0, color: '#FBBF24',        bg: 'rgba(251,191,36,0.1)' },
    { icon: CheckCircle,   label: 'Resolved',       value: overview.resolved || 0,    color: '#4ADE80',        bg: 'rgba(74,222,128,0.1)' },
    { icon: Zap,           label: 'Critical',       value: overview.critical || 0,    color: '#EF4444',        bg: 'rgba(239,68,68,0.1)'  },
  ];

  const pieData = byType.map((t) => ({
    name: t.issue_type?.replace('_', ' '),
    value: parseInt(t.count),
  }));

  return (
    <div className="page-content">
      <div className="dashboard container">
        <div className="dashboard__header">
          <h1>Dashboard</h1>
          <p>Road infrastructure health analytics & insights</p>
        </div>

        {/* Stat Cards */}
        <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
          {statCards.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="dashboard__stat-card card stagger-item">
              <div className="card-body">
                <div className="dashboard__stat-icon" style={{ background: bg, color }}>
                  <Icon size={22} />
                </div>
                <div className="dashboard__stat-value">{isLoading ? '…' : value}</div>
                <div className="dashboard__stat-label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="dashboard__charts grid-2">
          {/* Bar chart — weekly activity */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg">Weekly Activity</h3>
              <p className="text-sm text-muted">Reports vs Resolutions</p>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={STATUS_DATA} barSize={10} barGap={4}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="reported" fill="var(--primary)"   radius={[4,4,0,0]} name="Reported" />
                  <Bar dataKey="resolved" fill="var(--secondary)" radius={[4,4,0,0]} name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie chart — issue breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg">Issue Breakdown</h3>
              <p className="text-sm text-muted">By type distribution</p>
            </div>
            <div className="card-body">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={3} dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={Object.values(COLORS)[i % Object.values(COLORS).length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                /* Mock pie */
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pothole', value: 40 },
                        { name: 'Crack', value: 25 },
                        { name: 'Waterlogging', value: 15 },
                        { name: 'Broken Divider', value: 10 },
                        { name: 'Other', value: 10 },
                      ]}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={3} dataKey="value"
                    >
                      {Object.values(COLORS).map((color, i) => (
                        <Cell key={i} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Recent Issues */}
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <div className="card-header flex items-center justify-between">
            <h3>Recent Reports</h3>
            <Link to="/status" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          <div className="dashboard__recent-list">
            {(complaints.slice(0, 8) || []).map((c) => (
              <Link key={c.id} to={`/complaint/${c.id}`} className="dashboard__recent-item">
                <div className="dashboard__recent-icon">
                  {c.issue_type === 'pothole' ? '🕳️' : c.issue_type === 'crack' ? '⚡' : c.issue_type === 'waterlogging' ? '💧' : '📍'}
                </div>
                <div className="dashboard__recent-info">
                  <span className="dashboard__recent-title">{c.title || c.reference_no}</span>
                  <span className="dashboard__recent-loc">
                    <MapPin size={10} /> {c.address_text || `${parseFloat(c.latitude).toFixed(3)}, ${parseFloat(c.longitude).toFixed(3)}`}
                  </span>
                </div>
                <span className={`badge badge-${c.severity}`}>{c.severity}</span>
                <span className={`badge badge-${c.status}`}>{c.status?.replace('_',' ')}</span>
              </Link>
            ))}
            {complaints.length === 0 && !isLoading && (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No reports yet. <Link to="/report" className="text-primary">Be the first!</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
