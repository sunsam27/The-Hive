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

  useEffect(() => {
    if (!id) return;
    api.get(`/summaries/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => { showToast(err?.response?.data?.error || 'Failed to load'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppShell><div className="sv-loading">Loading...</div></AppShell>;

  const { expenses = [], summary = { total: 0, pending: 0, approved: 0, rejected: 0 } } = data || {};

  return (
    <AppShell>
      <div className="sv-page">
        <div className="sv-top">
          <div>
            <Link to={`/workspaces/${id}`} className="sv-back">
              <ArrowLeft size={18} />
              Back to Workspace
            </Link>
            <h1 className="sv-title">Reimbursement Summary</h1>
            <p className="sv-sub">Overview of all expenses in this workspace.</p>
          </div>
          <div className="sv-actions">
            <Button variant="ghost"><Share2 size={18} /> Share</Button>
            <Button variant="primary"><Download size={18} /> Download PDF</Button>
          </div>
        </div>

        <div className="sv-range">
          <div className="sv-range-info">
            <Calendar size={18} />
            <span>All time</span>
          </div>
          <Button variant="ghost" size="sm">Change Range</Button>
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

        <section className="sv-section">
          <h2 className="sv-section-title">Itemized Expenses</h2>
          {expenses.length > 0 ? (
            <div className="sv-table">
              <div className="sv-table-header">
                <span>Date</span>
                <span className="sv-col-merchant">Merchant</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {expenses.map((e) => {
                const sc = statusColors[e.status] || statusColors.pending;
                return (
                  <div key={e.id} className="sv-table-row">
                    <span className="sv-cell-date">{e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                    <span className="sv-col-merchant sv-cell-merchant">{e.merchant || '—'}</span>
                    <span className="sv-cell-amount">{e.currency || 'USD'} ${(Number(e.amount) || 0).toFixed(2)}</span>
                    <span>
                      <span className="sv-pill" style={{ background: sc.bg, color: sc.fg }}>{e.status}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="sv-empty">
              <div className="sv-empty-icon"><Receipt size={32} /></div>
              <h3>No expenses yet</h3>
              <p>Add expenses to this workspace to see a summary.</p>
              <Link to={`/workspaces/${id}`} className="sv-empty-btn">Go to Workspace</Link>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .sv-page { padding: 4px 0; }
        .sv-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 24px;
        }
        .sv-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-on-surface-variant);
          text-decoration: none;
          margin-bottom: 12px;
          transition: color 0.15s ease;
        }
        .sv-back:hover { color: var(--color-on-surface); }
        .sv-title {
          font-size: 26px;
          font-weight: 700;
          color: var(--color-on-surface);
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }
        .sv-sub { font-size: 15px; color: var(--color-on-surface-variant); }
        .sv-actions { display: flex; gap: 12px; }

        .sv-range {
          background: var(--color-surface);
          padding: 14px 20px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          border: 1px solid var(--color-outline-variant);
        }
        .sv-range-info {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--color-on-surface);
          font-weight: 600;
          font-size: 14px;
        }

        .sv-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 48px;
        }
        .sv-total-card {
          background: linear-gradient(135deg, var(--color-primary), hsl(210, 100%, 40%));
          color: var(--color-on-primary);
          padding: 36px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .sv-total-label {
          font-size: 14px;
          opacity: 0.8;
          margin-bottom: 4px;
          font-weight: 500;
        }
        .sv-total-amount {
          font-size: 42px;
          font-weight: 700;
          letter-spacing: -1px;
          margin-bottom: 4px;
        }
        .sv-total-sub {
          font-size: 13px;
          opacity: 0.7;
        }
        .sv-breakdown {
          background: var(--color-surface);
          padding: 28px;
          border-radius: 16px;
          border: 1px solid var(--color-outline-variant);
          display: flex;
          flex-direction: column;
          gap: 24px;
          justify-content: center;
        }
        .sv-status-item {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .sv-status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .sv-status-info { flex: 1; }
        .sv-status-label {
          font-weight: 600;
          color: var(--color-on-surface);
          font-size: 15px;
        }
        .sv-status-count {
          font-size: 12px;
          color: var(--color-on-surface-variant);
          margin-top: 2px;
        }

        .sv-section { }
        .sv-section-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-on-surface);
          letter-spacing: -0.3px;
          margin-bottom: 16px;
        }
        .sv-table {
          background: var(--color-surface);
          border-radius: 16px;
          border: 1px solid var(--color-outline-variant);
          overflow: hidden;
        }
        .sv-table-header {
          display: flex;
          padding: 14px 20px;
          background: var(--color-surface-container-low);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sv-table-row {
          display: flex;
          padding: 14px 20px;
          border-bottom: 1px solid var(--color-outline-variant);
          align-items: center;
          font-size: 14px;
          color: var(--color-on-surface);
          transition: background 0.15s ease;
        }
        .sv-table-row:last-child { border-bottom: none; }
        .sv-table-row:hover { background: var(--color-surface-container-low); }
        .sv-table-header span, .sv-table-row span { flex: 1; }
        .sv-col-merchant { flex: 2 !important; }
        .sv-cell-date { color: var(--color-on-surface-variant); white-space: nowrap; }
        .sv-cell-merchant { font-weight: 600; }
        .sv-cell-amount { font-weight: 700; white-space: nowrap; }
        .sv-pill {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
        }
        .sv-empty {
          text-align: center;
          padding: 60px 20px;
          background: var(--color-surface);
          border-radius: 16px;
          border: 1px solid var(--color-outline-variant);
        }
        .sv-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          background: var(--color-primary-container);
          color: var(--color-primary);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sv-empty h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-on-surface);
          margin-bottom: 8px;
        }
        .sv-empty p {
          font-size: 14px;
          color: var(--color-on-surface-variant);
          margin-bottom: 24px;
        }
        .sv-empty-btn {
          display: inline-block;
          padding: 10px 24px;
          background: var(--color-primary);
          color: #fff;
          text-decoration: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
        }
        .sv-loading {
          padding: 60px;
          text-align: center;
          color: var(--color-on-surface-variant);
          font-size: 15px;
        }
      `}</style>
    </AppShell>
  );
}
