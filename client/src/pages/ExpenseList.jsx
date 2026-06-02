import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Receipt, ArrowUpRight, Filter, Send, Download } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';
import NewExpenseModal from '../components/upload/NewExpenseModal';
import { useToast } from '../hooks/useToast';
import { expenseService } from '../services/expenseService';

const statusColors = {
  draft: { bg: 'var(--color-surface-container)', fg: 'var(--color-on-surface-variant)' },
  submitted: { bg: 'var(--color-secondary-container)', fg: 'var(--color-secondary)' },
  approved: { bg: 'var(--color-tertiary-container)', fg: 'var(--color-tertiary)' },
  rejected: { bg: 'var(--color-error-container)', fg: 'var(--color-error)' },
};

export default function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [submittingDrafts, setSubmittingDrafts] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { showToast } = useToast();

  const draftCount = expenses.filter((e) => e.status === 'draft').length;

  function buildParams() {
    const params = {};
    if (filter !== 'all') params.status = filter;
    if (categoryFilter.trim()) params.category = categoryFilter.trim();
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    params.sortBy = sortBy;
    params.sortOrder = sortOrder;
    return params;
  }

  useEffect(() => {
    expenseService.list(buildParams())
      .then((res) => setExpenses(res.data.data || res.data))
      .catch(() => showToast('Failed to load expenses', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, categoryFilter, dateFrom, dateTo, sortBy, sortOrder]);

  async function handleSubmitAllDrafts() {
    setSubmittingDrafts(true);
    try {
      const res = await expenseService.submitAllDrafts();
      showToast(`Submitted ${res.data.submitted} draft(s)`, 'success');
      const listRes = await expenseService.list(buildParams());
      setExpenses(listRes.data.data || listRes.data);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to submit drafts', 'error');
    } finally {
      setSubmittingDrafts(false);
    }
  }

  async function handleExport() {
    try {
      const res = await expenseService.exportCsv(buildParams());
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'expenses.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Failed to export', 'error');
    }
  }

  if (loading) return <AppShell><div className="el-loading">Loading...</div></AppShell>;

  return (
    <AppShell>
      <div className="el-page">
        <div className="el-top">
          <div>
            <h1 className="el-title">All Expenses</h1>
            <p className="el-sub">Manage and review all your submitted expenses.</p>
          </div>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus size={20} />
            New Expense
          </Button>
        </div>

        <div className="el-card">
          <div className="el-card-header">
            <div className="el-card-header-left">
              <span className="el-count">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="el-card-header-right">
              {draftCount > 0 && (
                <Button variant="primary" size="sm" onClick={handleSubmitAllDrafts} disabled={submittingDrafts}>
                  <Send size={14} />
                  {submittingDrafts ? 'Submitting...' : `Submit ${draftCount} Draft${draftCount > 1 ? 's' : ''}`}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleExport} title="Export CSV">
                <Download size={14} />
              </Button>
            </div>
          </div>

          <div className="el-filters">
            <div className="el-filter-group">
              <label className="el-filter-label">Status</label>
              <select className="el-filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="el-filter-group">
              <label className="el-filter-label">Category</label>
              <input className="el-filter-input" type="text" placeholder="Any category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} />
            </div>
            <div className="el-filter-group">
              <label className="el-filter-label">From</label>
              <input className="el-filter-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="el-filter-group">
              <label className="el-filter-label">To</label>
              <input className="el-filter-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="el-filter-group">
              <label className="el-filter-label">Sort by</label>
              <select className="el-filter-select" value={`${sortBy}:${sortOrder}`} onChange={(e) => { const [s, o] = e.target.value.split(':'); setSortBy(s); setSortOrder(o); }}>
                <option value="created_at:desc">Newest first</option>
                <option value="created_at:asc">Oldest first</option>
                <option value="amount:desc">Highest amount</option>
                <option value="amount:asc">Lowest amount</option>
                <option value="expense_date:desc">Most recent date</option>
                <option value="expense_date:asc">Oldest date</option>
                <option value="merchant:asc">Merchant A-Z</option>
              </select>
            </div>
          </div>

          {expenses.length > 0 ? (
            <table className="el-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const sc = statusColors[e.status] || statusColors.submitted;
                  return (
                    <tr key={e.id}>
                      <td className="el-cell-date">{e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                      <td className="el-cell-merchant">{e.merchant || '—'}</td>
                      <td className="el-cell-amount">${(parseFloat(e.amount) || 0).toFixed(2)}</td>
                      <td>{e.category || '—'}</td>
                      <td>
                        <span className="el-badge" style={{ background: sc.bg, color: sc.fg }}>
                          {e.status}
                        </span>
                      </td>
                      <td className="el-cell-action">
                        <Link to={`/expenses/${e.id}`} className="el-view-link">
                          View <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="el-empty">
              <div className="el-empty-icon"><Receipt size={32} /></div>
              <h3>No expenses found</h3>
              <p>Get started by adding your first expense.</p>
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                <Plus size={18} />
                New Expense
              </Button>
            </div>
          )}
        </div>
      </div>

      <NewExpenseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <style>{`
        .el-page { padding: 4px 0; }
        .el-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 28px;
        }
        .el-title {
          font-size: 26px;
          font-weight: 700;
          color: var(--color-on-surface);
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }
        .el-sub {
          font-size: 15px;
          color: var(--color-on-surface-variant);
        }
        .el-card {
          background: var(--color-surface);
          border-radius: 16px;
          border: 1px solid var(--color-outline-variant);
          overflow: hidden;
        }
        .el-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-outline-variant);
        }
        .el-card-header-left { display: flex; align-items: center; gap: 12px; }
        .el-card-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .el-count {
          font-size: 13px;
          color: var(--color-on-surface-variant);
          font-weight: 500;
        }
        .el-filters {
          display: flex;
          gap: 16px;
          padding: 14px 20px;
          border-bottom: 1px solid var(--color-outline-variant);
          background: var(--color-surface-container-low);
          flex-wrap: wrap;
        }
        .el-filter-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .el-filter-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .el-filter-select, .el-filter-input {
          border: 1.5px solid var(--color-outline-variant);
          background: var(--color-surface);
          color: var(--color-on-surface);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          padding: 7px 10px;
          border-radius: 8px;
          transition: border-color 0.15s ease;
          min-width: 130px;
        }
        .el-filter-select { cursor: pointer; }
        .el-filter-select:focus, .el-filter-input:focus { outline: none; border-color: var(--color-primary); }
        .el-table {
          width: 100%;
          border-collapse: collapse;
        }
        .el-table th {
          text-align: left;
          padding: 12px 20px;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--color-surface-container-low);
          border-bottom: 1px solid var(--color-outline-variant);
        }
        .el-table td {
          padding: 14px 20px;
          font-size: 14px;
          color: var(--color-on-surface);
          border-bottom: 1px solid var(--color-outline-variant);
        }
        .el-table tbody tr:last-child td { border-bottom: none; }
        .el-table tbody tr:hover { background: var(--color-surface-container-low); }
        .el-cell-date { white-space: nowrap; color: var(--color-on-surface-variant); width: 130px; }
        .el-cell-merchant { font-weight: 600; }
        .el-cell-amount { font-weight: 700; white-space: nowrap; }
        .el-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
        }
        .el-cell-action { text-align: right; width: 80px; }
        .el-view-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-primary);
          text-decoration: none;
          transition: opacity 0.15s ease;
        }
        .el-view-link:hover { opacity: 0.75; }
        .el-empty {
          text-align: center;
          padding: 60px 20px;
        }
        .el-empty-icon {
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
        .el-empty h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-on-surface);
          margin-bottom: 8px;
        }
        .el-empty p {
          font-size: 14px;
          color: var(--color-on-surface-variant);
          margin-bottom: 24px;
        }
        .el-loading {
          padding: 60px;
          text-align: center;
          color: var(--color-on-surface-variant);
          font-size: 15px;
        }
      `}</style>
    </AppShell>
  );
}
