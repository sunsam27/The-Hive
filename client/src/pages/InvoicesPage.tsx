import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, ArrowLeft, Download, Send, Trash2, Eye } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';
import { invoiceService } from '../services/invoiceService';
import { useToast } from '../hooks/useToast';
import Modal from '../components/ui/Modal';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const { showToast } = useToast();

  function loadInvoices() {
    setLoading(true);
    invoiceService.list()
      .then((res) => setInvoices(res.data.data))
      .catch((err) => showToast(err?.response?.data?.error || 'Failed to load invoices', 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadInvoices(); }, []);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await invoiceService.delete(deleteId);
      showToast('Receipt deleted', 'success');
      setDeleteId(null);
      loadInvoices();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to delete', 'error');
    }
  }

  async function handleConvert(id) {
    try {
      await invoiceService.convertToExpense(id);
      showToast('Receipt converted to expense', 'success');
      loadInvoices();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to convert', 'error');
    }
  }

  async function handleDownload(id) {
    try {
      const res = await invoiceService.downloadPdf(id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'receipt.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Failed to download', 'error');
    }
  }

  const statusColors = {
    draft: { bg: 'var(--color-secondary-container)', fg: 'var(--color-secondary)' },
    sent: { bg: 'var(--color-primary-container)', fg: 'var(--color-primary)' },
    paid: { bg: 'var(--color-tertiary-container)', fg: 'var(--color-tertiary)' },
    cancelled: { bg: 'var(--color-error-container)', fg: 'var(--color-error)' },
  };

  return (
    <AppShell>
      <div className="page page-enter">
        <div className="page-top">
          <div>
            <Link to="/dashboard" className="back-link">
              <ArrowLeft size={18} />
              Dashboard
            </Link>
            <h1 className="page-title">My Receipts</h1>
            <p className="page-sub">Draft professional receipts for services rendered.</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/invoices/new')}>
            <Plus size={18} />
            New Receipt
          </Button>
        </div>

        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FileText size={24} /></div>
            <h3>No receipts yet</h3>
            <p>Create your first receipt for services rendered.</p>
            <Button variant="primary" style={{ marginTop: 16 }} onClick={() => navigate('/invoices/new')}>
              <Plus size={18} />
              Create Receipt
            </Button>
          </div>
        ) : (
          <div className="data-row-list">
            <div className="data-row-header">
              <span>Receipt #</span>
              <span className="data-row-col--wide">Client</span>
              <span>Amount</span>
              <span>Status</span>
              <span></span>
            </div>
            {invoices.map((inv) => {
              const sc = statusColors[inv.status] || statusColors.draft;
              return (
                <div key={inv.id} className="data-row-item" style={{ cursor: 'default' }}>
                  <span className="data-row-col--merchant" style={{ fontWeight: 600 }}>{inv.invoice_number}</span>
                  <span className="data-row-col--wide">{inv.client_name || inv.client_company || '—'}</span>
                  <span className="data-row-col--amount">{inv.currency} {Number(inv.amount).toFixed(2)}</span>
                  <span>
                    <span className="badge" style={{ background: sc.bg, color: sc.fg }}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </span>
                  <span style={{ display: 'flex', gap: 4 }}>
                    <button className="icon-btn" onClick={() => handleDownload(inv.id)} title="Download PDF">
                      <Download size={16} />
                    </button>
                    {inv.status === 'draft' && (
                      <>
                        <button className="icon-btn" onClick={() => handleConvert(inv.id)} title="Convert to Expense">
                          <Send size={16} />
                        </button>
                        <button className="icon-btn icon-btn--danger" onClick={() => setDeleteId(inv.id)} title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteId && (
        <Modal isOpen={true} onClose={() => setDeleteId(null)} title="Delete Receipt">
          <p style={{ marginBottom: 20, color: 'var(--color-on-surface-variant)', fontSize: 14 }}>
            Are you sure you want to delete this receipt?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
