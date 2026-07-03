import { useState, useEffect } from 'react';
import AppShell from '../components/layout/AppShell';
import { ArrowLeft, Check, X, Tag as TagIcon, Calendar, Building2, FileText, Send, Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import { expenseService } from '../services/expenseService';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import EditExpenseModal from '../components/upload/EditExpenseModal';
import PayModal from '../components/upload/PayModal';
import Modal from '../components/ui/Modal';
import { formatCurrency } from '../constants/currencies';
import { paymentService } from '../services/paymentService';

const ExpenseDetail = () => {
  const navigate = useNavigate();
  const { expenseId } = useParams();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectError, setRejectError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [receiptImages, setReceiptImages] = useState({});
  const [expandedImg, setExpandedImg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [proofBlob, setProofBlob] = useState(null);
  const { showToast } = useToast();
  const { token } = useAuth();

  useEffect(() => {
    if (!expenseId) return;
    loadExpense();
  }, [expenseId]);

  async function loadReceiptImage(r) {
    if (!token) return;
    try {
      const url = r.file_url.startsWith('http') ? r.file_url : `${import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'}${r.file_url}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      setReceiptImages((prev) => ({ ...prev, [r.id]: URL.createObjectURL(blob) }));
    } catch {
      // silently fail
    }
  }

  async function loadExpense() {
    try {
      const res = await expenseService.getById(expenseId);
      setExpense(res.data);
      if (res.data?.receipts) {
        res.data.receipts.forEach(loadReceiptImage);
      }
      if (res.data?.paid_proof_url) {
        loadProofImage(res.data.paid_proof_url);
      }
    } catch {
      setExpense(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadProofImage(url) {
    if (!token) return;
    try {
      const fetchUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'}${url}`;
      const res = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      setProofBlob(URL.createObjectURL(blob));
    } catch { /* proof image optional */ }
  }

  async function handleReview(status) {
    if (status === 'rejected') {
      setShowRejectInput(true);
      return;
    }
    setActionLoading(true);
    try {
      await expenseService.review(expenseId, status);
      navigate(-1);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to approve', 'error');
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectionNote.trim()) {
      setRejectError('A rejection note is required');
      return;
    }
    setActionLoading(true);
    try {
      await expenseService.review(expenseId, 'rejected', rejectionNote.trim());
      navigate(-1);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to reject', 'error');
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    setConfirmDelete(false);
    try {
      await expenseService.deleteExpense(expenseId);
      showToast('Expense deleted', 'success');
      navigate(-1);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to delete', 'error');
      setActionLoading(false);
    }
  }

  async function handlePayOnline() {
    setPayLoading(true);
    try {
      const res = await paymentService.initiate(expenseId);
      if (res.data.paymentUrl) {
        window.open(res.data.paymentUrl, '_blank');
        showToast('Payment page opened in new tab', 'success');
      } else {
        showToast('Payment link generated', 'success');
      }
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to initiate payment', 'error');
    } finally {
      setPayLoading(false);
    }
  }

  async function handleSubmit() {
    setActionLoading(true);
    try {
      await expenseService.submit(expenseId);
      loadExpense();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to submit', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <AppShell><div className="loading-state">Loading...</div></AppShell>;
  if (!expense) return <AppShell><div className="loading-state">Expense not found</div></AppShell>;

  return (
    <AppShell>
      <div className="ed-container">
        <header className="ed-header">
          <button className="ed-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Back
          </button>
          <div className={`status-pill`}>
            <span className={`status-dot status-dot--${expense.status}`}></span>
            {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
          </div>
        </header>

        {expense.rejection_note && expense.status === 'rejected' && (
          <div className="ed-rejection-banner">
            <strong>Rejection reason:</strong> {expense.rejection_note}
          </div>
        )}

        <div className="ed-layout">
          <div className="ed-receipt-section">
            <div className="ed-receipt-paper">
              <div className="ed-receipt-inner">
                <p className="ed-scanner-text">RECEIPT</p>
                <div className="ed-receipt-logo">&#9733;</div>
                <p className="ed-merchant">{expense.merchant || 'Unknown'}</p>
                <p className="ed-meta">{expense.expense_date ? new Date(expense.expense_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No date'}</p>
                <div className="ed-divider"></div>
                <div className="ed-line">
                  <span>{expense.description || expense.category || expense.notes || 'Expense'}</span>
                  <span>{formatCurrency(expense.amount, expense.currency)}</span>
                </div>
                <div className="ed-divider"></div>
                <div className="ed-total">
                  <span>TOTAL</span>
                  <span>{formatCurrency(expense.amount, expense.currency)}</span>
                </div>
              </div>
            </div>

            {expense.receipts?.length > 0 && (
              <div className="ed-receipt-files">
                <h4>Receipts</h4>
                {expense.receipts.map((r) => {
                  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(r.file_url);
                  const blobUrl = receiptImages[r.id];
                  const fileName = r.file_url.split('/').pop();

                  if (!blobUrl) {
                    return (
                      <button key={r.id} className="ed-receipt-file" onClick={() => loadReceiptImage(r)}>
                        <FileText size={16} />
                        {fileName}
                      </button>
                    );
                  }

                  if (isImage) {
                    return (
                      <div key={r.id} className="ed-receipt-img-wrap">
                        <img src={blobUrl} alt="Receipt" className="ed-receipt-img" onClick={() => setExpandedImg(blobUrl)} />
                        <button className="ed-receipt-dl" onClick={() => { const a = document.createElement('a'); a.href = blobUrl; a.download = fileName; a.click(); }}>
                          <FileText size={14} />
                          Download
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button key={r.id} className="ed-receipt-file" onClick={() => { const a = document.createElement('a'); a.href = blobUrl; a.download = fileName; a.click(); }}>
                      <FileText size={16} />
                      Download {fileName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="ed-info">
            <section className="ed-card">
              <h2 className="section-ttl">Expense Details</h2>
              <div className="ed-grid">
                <div className="ed-item">
                  <label><Building2 size={14} /> Merchant</label>
                  <p>{expense.merchant || 'N/A'}</p>
                </div>
                <div className="ed-item">
                  <label><Calendar size={14} /> Date</label>
                  <p>{expense.expense_date ? new Date(expense.expense_date).toLocaleDateString() : 'N/A'}</p>
                </div>
                {expense.category && (
                  <div className="ed-item">
                    <label><TagIcon size={14} /> Category</label>
                    <p>{expense.category}</p>
                  </div>
                )}
              </div>

              <div className="ed-amount">
                <label>Total Amount</label>
                <h3>{formatCurrency(expense.amount, expense.currency)}</h3>
              </div>

              {expense.tags?.length > 0 && (
                <div className="ed-tags-display">
                  <label>Tags</label>
                  <div className="tag-list">
                    {expense.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
              )}

              {expense.notes && (
                <div className="ed-notes">
                  <label>Notes</label>
                  <p>{expense.notes}</p>
                </div>
              )}

              {expense.submitter_name && (
                <div className="ed-notes">
                  <label>Submitted by</label>
                  <p>{expense.submitter_name}</p>
                </div>
              )}
            </section>

            {(expense.status === 'draft' || expense.status === 'rejected') && (
              <div className="ed-actions">
                {expense.status === 'draft' && (
                  <Button variant="primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={actionLoading}>
                    <Send size={18} />
                    Submit
                  </Button>
                )}
                {expense.status === 'rejected' && (
                  <Button variant="primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={actionLoading}>
                    <Send size={18} />
                    Resubmit
                  </Button>
                )}
                <Button variant="ghost" style={{ flex: 1 }} onClick={() => setEditModalOpen(true)}>
                  <Pencil size={18} />
                  Edit
                </Button>
                <Button variant="danger" style={{ flex: 1 }} onClick={() => setConfirmDelete(true)}>
                  <X size={18} />
                  Delete
                </Button>
              </div>
            )}

            {expense.status === 'approved' && expense.canReview && (
              <div className="ed-actions" style={{ flexDirection: 'column', gap: 8 }}>
                <Button variant="primary" style={{ width: '100%' }} onClick={handlePayOnline} disabled={payLoading}>
                  <Check size={18} />
                  {payLoading ? 'Processing...' : 'Pay Online'}
                </Button>
                <Button variant="ghost" style={{ width: '100%' }} onClick={() => setPayModalOpen(true)}>
                  <Check size={18} />
                  Mark as Paid (External)
                </Button>
              </div>
            )}

            {expense.status === 'paid' && (
              <div className="ed-paid-proof">
                <h4>Payment Info</h4>
                {expense.paid_proof_url ? (
                  <>
                    {expense.paid_note && <p className="ed-paid-note">{expense.paid_note}</p>}
                    {/\.(jpg|jpeg|png|webp)$/i.test(expense.paid_proof_url) ? (
                      proofBlob ? (
                        <img
                          src={proofBlob}
                          alt="Payment proof"
                          className="ed-proof-img"
                          onClick={() => setExpandedImg(proofBlob)}
                        />
                      ) : (
                        <p className="ed-paid-loading">Loading proof...</p>
                      )
                    ) : (
                      proofBlob ? (
                        <button className="ed-receipt-file" onClick={() => { const a = document.createElement('a'); a.href = proofBlob; a.download = expense.paid_proof_url.split('/').pop(); a.click(); }}>
                          <FileText size={16} />
                          Download proof
                        </button>
                      ) : (
                        <p className="ed-paid-loading">Loading proof...</p>
                      )
                    )}
                  </>
                ) : (
                  <p className="ed-paid-note" style={{ color: 'var(--color-primary)' }}>
                    Paid via online payment
                  </p>
                )}
              </div>
            )}

            {expense.status === 'submitted' && expense.canReview && (
              <>
                <div className="ed-actions">
                  <Button variant="danger" style={{ flex: 1 }} onClick={() => handleReview('rejected')} disabled={actionLoading}>
                    <X size={18} />
                    Reject
                  </Button>
                  <Button variant="primary" style={{ flex: 1 }} onClick={() => handleReview('approved')} disabled={actionLoading}>
                    <Check size={18} />
                    Approve
                  </Button>
                </div>

                {showRejectInput && (
                  <div className="ed-reject-form">
                    <textarea
                      className="ed-reject-textarea"
                      placeholder="Reason for rejection (required)..."
                      value={rejectionNote}
                      onChange={(e) => { setRejectionNote(e.target.value); setRejectError(''); }}
                      rows={3}
                    />
                    {rejectError && <p className="ed-reject-error">{rejectError}</p>}
                    <div className="ed-reject-actions">
                      <Button variant="ghost" size="sm" onClick={() => { setShowRejectInput(false); setRejectionNote(''); setRejectError(''); }}>Cancel</Button>
                      <Button variant="danger" size="sm" onClick={handleReject} disabled={actionLoading}>Confirm Reject</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {expandedImg && (
        <div className="ed-img-overlay" onClick={() => { URL.revokeObjectURL(expandedImg); setExpandedImg(null); }}>
          <img src={expandedImg} alt="Receipt" className="ed-img-full" />
        </div>
      )}

      {confirmDelete && (
        <Modal isOpen={true} onClose={() => setConfirmDelete(false)} title="Delete Expense">
          <p style={{ marginBottom: 20, color: 'var(--color-on-surface-variant)', fontSize: 14, lineHeight: 1.6 }}>
            Are you sure you want to delete this expense? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={actionLoading}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </Modal>
      )}

      <EditExpenseModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        expense={expense}
        onSaved={loadExpense}
      />

      <PayModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        expenseId={expenseId}
        onPaid={loadExpense}
      />
    </AppShell>
  );
};

export default ExpenseDetail;
