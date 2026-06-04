import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, Share2, Calendar, ArrowLeft, Receipt } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';
import api from '../services/api';
import { useToast } from '../hooks/useToast';

const statusColors = {
  pending: { bg: 'var(--color-secondary-container)', fg: 'var(--color-secondary)' },
  approved: { bg: 'var(--color-tertiary-container)', fg: 'var(--color-tertiary)' },
  rejected: { bg: 'var(--color-error-container)', fg: 'var(--color-error)' },
};

const statusSummaries = [
  { key: 'approved', label: 'Approved', color: 'green' },
  { key: 'pending', label: 'Pending', color: 'orange' },
  { key: 'rejected', label: 'Rejected', color: 'red' },
];

const dotColors = { green: 'var(--color-tertiary)', orange: 'var(--color-secondary)', red: 'var(--color-error)' };

export default function SummaryView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const [showRange, setShowRange] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  function fetchSummary(from, to) {
    if (!id) return;
    setLoading(true);
    const params = {};
    if (from) params.dateFrom = from;
    if (to) params.dateTo = to;
    api.get(`/summaries/${id}`, { params })
      .then((res) => setData(res.data))
      .catch((err) => { showToast(err?.response?.data?.error || 'Failed to load'); })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchSummary();
  }, [id]);

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copied to clipboard', 'success');
  }

  function handleDownload() {
    if (!data?.expenses?.length) {
      showToast('No data to export', 'error');
      return;
    }
    const headers = 'Date,Merchant,Amount,Status,Category,Description\n';
    const rows = data.expenses.map((e) =>
      `"${e.expense_date || ''}","${(e.merchant || '').replace(/"/g, '""')}","${parseFloat(e.amount) || 0}","${e.status || ''}","${(e.category || '').replace(/"/g, '""')}","${(e.description || '').replace(/"/g, '""')}"`
    ).join('\n');
    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded', 'success');
  }

  function handleRangeChange(e) {
    e.preventDefault();
    fetchSummary(dateFrom, dateTo);
    setShowRange(false);
  }

  if (loading) return <AppShell><div className="loading-state">Loading...</div></AppShell>;

  const { expenses = [], summary = { total: 0, pending: 0, approved: 0, rejected: 0 } } = data || {};

  return (
    <AppShell>
      <div className="page">
        <div className="page-top">
          <div>
            <Link to={`/workspaces/${id}`} className="back-link">
              <ArrowLeft size={18} />
              Back to Workspace
            </Link>
            <h1 className="page-title">Reimbursement Summary</h1>
            <p className="page-sub">Overview of all expenses in this workspace.</p>
          </div>
          <div className="page-actions">
            <Button variant="ghost" onClick={handleShare}><Share2 size={18} /> Share</Button>
            <Button variant="primary" onClick={handleDownload}><Download size={18} /> Download CSV</Button>
          </div>
        </div>

        <div className="sv-range">
          <div className="sv-range-info">
            <Calendar size={18} />
            <span>{dateFrom || dateTo ? `${dateFrom || '...'} to ${dateTo || '...'}` : 'All time'}</span>
          </div>
          {showRange ? (
            <form onSubmit={handleRangeChange} className="sv-range-form">
              <input type="date" className="sv-date-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span style={{ color: 'var(--color-on-surface-variant)', fontSize: 13 }}>to</span>
              <input type="date" className="sv-date-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              <Button variant="primary" size="sm" type="submit">Apply</Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => { setShowRange(false); setDateFrom(''); setDateTo(''); fetchSummary(); }}>Reset</Button>
            </form>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowRange(true)}>Change Range</Button>
          )}
        </div>

        <div className="sv-stats">
          <div className="sv-total-card">
            <p className="sv-total-label">Total Expenses</p>
            <h2 className="sv-total-amount">${(Number(summary.total) || 0).toFixed(2)}</h2>
            <p className="sv-total-sub">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="sv-breakdown">
            {statusSummaries.map((s) => (
              <div key={s.key} className="sv-status-item">
                <div className="sv-status-dot" style={{ background: dotColors[s.color] }} />
                <div className="sv-status-info">
                  <p className="sv-status-label">{s.label}</p>
                  <p className="sv-status-count">{summary[s.key]} item{summary[s.key] !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section>
          <h2 className="section-ttl">Itemized Expenses</h2>
          {expenses.length > 0 ? (
            <div className="data-row-list">
              <div className="data-row-header">
                <span>Date</span>
                <span className="data-row-col--wide">Merchant</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {expenses.map((e) => {
                const sc = statusColors[e.status] || statusColors.pending;
                return (
                  <div key={e.id} className="data-row-item">
                    <span className="data-row-col--date">{e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                    <span className="data-row-col--wide data-row-col--merchant">{e.merchant || '—'}</span>
                    <span className="data-row-col--amount">{e.currency || 'USD'} ${(Number(e.amount) || 0).toFixed(2)}</span>
                    <span>
                      <span className="badge" style={{ background: sc.bg, color: sc.fg }}>{e.status}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><Receipt size={24} /></div>
              <h3>No expenses yet</h3>
              <p>Add expenses to this workspace to see a summary.</p>
              <Link to={`/workspaces/${id}`} className="section-more" style={{ display: 'inline-flex' }}>Go to Workspace</Link>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
