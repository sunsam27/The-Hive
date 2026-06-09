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
import Skeleton from '../components/ui/Skeleton';
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

  return (
    <AppShell>
      <div className="page page-enter">
        <div className="page-top">
          <div>
            <div className="greeting-badge">
              <Sparkles size={16} aria-hidden="true" />
              <span>Dashboard</span>
            </div>
            <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0] || 'there'}</h1>
            <p className="page-sub">Here's what's happening across your workspaces.</p>
          </div>
          <Link to="/expenses">
            <Button variant="primary">
              <Plus size={20} aria-hidden="true" />
              New Expense
            </Button>
          </Link>
        </div>

        <div className="stats-row">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="stat-card">
                  <Skeleton variant="card" />
                </div>
              ))
            : stats.map((s, i) => <StatCard key={i} {...s} />)
          }
        </div>

        <div className="section-hd">
          <h2 className="section-ttl">Recent Activity</h2>
          <Link to="/expenses" className="section-more" aria-label="View all expenses">
            View all
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="activity-card">
          {loading ? (
            <div style={{ padding: '20px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="row" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="empty-state" style={{ border: 'none', padding: '40px 20px' }}>
              <h3>No expenses yet</h3>
              <p>Submit your first one to get started.</p>
            </div>
          ) : (
            recent.map((item, i) => {
              const sc = statusColors[item.status] || statusColors.submitted;
              return (
                <Link key={i} to={`/expenses/${item.id}`} className="activity-row" aria-label={`View ${item.merchant || 'expense'} expense`}>
                  <div className="activity-icon" aria-hidden="true">
                    <Receipt size={20} />
                  </div>
                  <div className="activity-body">
                    <p className="activity-name">{item.merchant || 'Unnamed expense'}</p>
                    <p className="activity-meta">{item.description || item.category || 'No description'} &bull; {timeAgo(item.created_at)}</p>
                  </div>
                  <div className="activity-right">
                    <span className="activity-amount">${(parseFloat(item.amount) || 0).toFixed(2)}</span>
                    <span className="badge" style={{ background: sc.bg, color: sc.fg }}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Dashboard;
