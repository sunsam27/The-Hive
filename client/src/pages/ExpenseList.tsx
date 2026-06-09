import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Receipt, ArrowUpRight, Send, Download } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
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
      .then((res) => setExpenses(res.data.data))
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
    } catch {
      showToast('Failed to export', 'error');
    }
  }

  if (loading) return <AppShell>
    <div className="page page-enter">
      <div className="page-top">
        <div>
          <h1 className="page-title">All Expenses</h1>
          <p className="page-sub">Manage and review all your submitted expenses.</p>
        </div>
      </div>
      <div className="card">
        <div style={{ padding: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="row" />
          ))}
        </div>
      </div>
    </div>
  </AppShell>;

  return (
    <AppShell>
      <div className="page page-enter">
        <div className="page-top">
          <div>
            <h1 className="page-title">All Expenses</h1>
            <p className="page-sub">Manage and review all your submitted expenses.</p>
          </div>
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus size={20} aria-hidden="true" />
            New Expense
          </Button>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-header-left">
              <span className="card-count">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="card-header-right">
              {draftCount > 0 && (
                <Button variant="primary" size="sm" onClick={handleSubmitAllDrafts} disabled={submittingDrafts}>
                  <Send size={14} aria-hidden="true" />
                  {submittingDrafts ? 'Submitting...' : `Submit ${draftCount} Draft${draftCount > 1 ? 's' : ''}`}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleExport} title="Export CSV" aria-label="Export CSV">
                <Download size={14} />
              </Button>
            </div>
          </div>

          <div className="filter-bar">
            <div className="filter-group">
              <label className="filter-label" htmlFor="el-status">Status</label>
              <select id="el-status" className="filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label" htmlFor="el-category">Category</label>
              <input id="el-category" className="filter-input" type="text" placeholder="Any category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} />
            </div>
            <div className="filter-group">
              <label className="filter-label" htmlFor="el-from">From</label>
              <input id="el-from" className="filter-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="filter-group">
              <label className="filter-label" htmlFor="el-to">To</label>
              <input id="el-to" className="filter-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="filter-group">
              <label className="filter-label" htmlFor="el-sort">Sort by</label>
              <select id="el-sort" className="filter-select" value={`${sortBy}:${sortOrder}`} onChange={(e) => { const [s, o] = e.target.value.split(':'); setSortBy(s); setSortOrder(o); }}>
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
            <table className="data-table">
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
                      <td className="cell-date">{e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                      <td className="cell-merchant">{e.merchant || '—'}</td>
                      <td className="cell-amount">${(parseFloat(e.amount) || 0).toFixed(2)}</td>
                      <td>{e.category || '—'}</td>
                      <td>
                        <span className="badge" style={{ background: sc.bg, color: sc.fg }}>
                          {e.status}
                        </span>
                      </td>
                      <td className="cell-action">
                        <Link to={`/expenses/${e.id}`} className="section-more" aria-label={`View ${e.merchant || 'expense'} details`}>
                          View <ArrowUpRight size={14} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ border: 'none' }}>
              <div className="empty-state-icon"><Receipt size={32} /></div>
              <h3>No expenses found</h3>
              <p>Get started by adding your first expense.</p>
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                <Plus size={18} aria-hidden="true" />
                New Expense
              </Button>
            </div>
          )}
        </div>
      </div>

      <NewExpenseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </AppShell>
  );
}
