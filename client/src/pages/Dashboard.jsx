import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Receipt,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { Link } from 'react-router-dom';
import { expenseService } from '../services/expenseService';

const StatCard = ({ title, value, icon, color }) => {
  const colorMap = {
    blue: { bg: 'var(--color-primary-container)', fg: 'var(--color-primary)' },
    orange: { bg: 'var(--color-secondary-container)', fg: 'var(--color-secondary)' },
    green: { bg: 'var(--color-tertiary-container)', fg: 'var(--color-tertiary)' },
    red: { bg: 'var(--color-error-container)', fg: 'var(--color-error)' },
  };
  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className="stat-card">
      <div className="stat-card-inner">
        <div className="stat-icon-wrap" style={{ background: colors.bg, color: colors.fg }}>
          {icon}
        </div>
        <div className="stat-text">
          <p className="stat-label">{title}</p>
          <h3 className="stat-number">{value}</h3>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    expenseService.list()
      .then((res) => setExpenses(res.data.data))
      .catch((err) => { showToast(err?.response?.data?.error || 'Failed to load'); })
      .finally(() => setLoading(false));
  }, [location.pathname]);

  const totalSubmitted = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const pendingTotal = expenses.filter((e) => e.status === 'submitted').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const approvedTotal = expenses.filter((e) => e.status === 'approved').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const rejectedTotal = expenses.filter((e) => e.status === 'rejected').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const stats = [
    { title: 'Total Submitted', value: `$${totalSubmitted.toFixed(2)}`, icon: <TrendingUp size={22} />, color: 'blue' },
    { title: 'Pending Approval', value: `$${pendingTotal.toFixed(2)}`, icon: <Clock size={22} />, color: 'orange' },
    { title: 'Approved', value: `$${approvedTotal.toFixed(2)}`, icon: <CheckCircle2 size={22} />, color: 'green' },
    { title: 'Rejected', value: `$${rejectedTotal.toFixed(2)}`, icon: <AlertCircle size={22} />, color: 'red' },
  ];

  const recent = expenses.slice(0, 5);

  const statusColors = {
    approved: { bg: 'var(--color-tertiary-container)', fg: 'var(--color-tertiary)' },
    submitted: { bg: 'var(--color-secondary-container)', fg: 'var(--color-secondary)' },
    rejected: { bg: 'var(--color-error-container)', fg: 'var(--color-error)' },
  };

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  }

  return (
    <AppShell>
      <div className="dash">
        <div className="dash-top">
          <div>
            <div className="dash-greeting">
              <Sparkles size={16} />
              <span>Dashboard</span>
            </div>
            <h1 className="dash-title">Welcome back, {user?.name?.split(' ')[0] || 'there'}</h1>
            <p className="dash-sub">Here's what's happening across your workspaces.</p>
          </div>
          <Link to="/expenses">
            <Button variant="primary">
              <Plus size={20} />
              New Expense
            </Button>
          </Link>
        </div>

        <div className="stats-row">
          {stats.map((s, i) => (
            <StatCard key={i} {...s} />
          ))}
        </div>

        <div className="section-hd">
          <h2 className="section-ttl">Recent Activity</h2>
          <Link to="/expenses" className="section-more">
            View all
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="activity-card">
          {loading ? (
            <div className="dash-loading">Loading...</div>
          ) : recent.length === 0 ? (
            <div className="dash-empty">No expenses yet. Submit your first one!</div>
          ) : (
            recent.map((item, i) => {
              const sc = statusColors[item.status] || statusColors.submitted;
              return (
                <Link key={i} to={`/expenses/${item.id}`} className="activity-row" style={{ textDecoration: 'none' }}>
                  <div className="activity-icon">
                    <Receipt size={20} />
                  </div>
                  <div className="activity-body">
                    <p className="activity-name">{item.merchant || 'Unnamed expense'}</p>
                    <p className="activity-meta">{item.description || item.category || 'No description'} &bull; {timeAgo(item.created_at)}</p>
                  </div>
                  <div className="activity-right">
                    <span className="activity-amount">${(parseFloat(item.amount) || 0).toFixed(2)}</span>
                    <span className="activity-badge" style={{ background: sc.bg, color: sc.fg }}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        .dash { padding: 4px 0; }
        .dash-top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
        .dash-greeting { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: var(--color-primary-container); color: var(--color-primary); border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
        .dash-title { font-size: 26px; font-weight: 700; color: var(--color-on-surface); letter-spacing: -0.5px; margin-bottom: 6px; }
        .dash-sub { font-size: 15px; color: var(--color-on-surface-variant); }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 44px; }
        @media (max-width: 900px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 500px) { .stats-row { grid-template-columns: 1fr; } }
        .stat-card { background: var(--color-surface); border-radius: 16px; border: 1px solid var(--color-outline-variant); padding: 24px; transition: box-shadow 0.2s ease; }
        .stat-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .stat-card-inner { display: flex; align-items: flex-start; gap: 16px; }
        .stat-icon-wrap { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-text { flex: 1; }
        .stat-label { font-size: 13px; font-weight: 500; color: var(--color-on-surface-variant); margin-bottom: 4px; }
        .stat-number { font-size: 24px; font-weight: 700; color: var(--color-on-surface); letter-spacing: -0.3px; }
        .section-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .section-ttl { font-size: 18px; font-weight: 700; color: var(--color-on-surface); letter-spacing: -0.3px; }
        .section-more { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: var(--color-primary); text-decoration: none; transition: opacity 0.15s ease; }
        .section-more:hover { opacity: 0.75; }
        .activity-card { background: var(--color-surface); border-radius: 16px; border: 1px solid var(--color-outline-variant); overflow: hidden; }
        .activity-row { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--color-outline-variant); transition: background 0.15s ease; }
        .activity-row:last-child { border-bottom: none; }
        .activity-row:hover { background: var(--color-surface-container-low); }
        .activity-icon { width: 38px; height: 38px; background: var(--color-surface-container); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 14px; color: var(--color-primary); flex-shrink: 0; }
        .activity-body { flex: 1; min-width: 0; }
        .activity-name { font-size: 14px; font-weight: 600; color: var(--color-on-surface); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .activity-meta { font-size: 12px; color: var(--color-on-surface-variant); }
        .activity-right { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
        .activity-amount { font-size: 15px; font-weight: 700; color: var(--color-on-surface); }
        .activity-badge { font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }
        .dash-loading, .dash-empty { padding: 32px; text-align: center; color: var(--color-on-surface-variant); font-size: 14px; }
      `}</style>
    </AppShell>
  );
};

export default Dashboard;
