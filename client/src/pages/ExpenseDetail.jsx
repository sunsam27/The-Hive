import { useState, useEffect } from 'react';
import AppShell from '../components/layout/AppShell';
import { ArrowLeft, Check, X, Tag as TagIcon, Calendar, Building2, FileText, Send, Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import { expenseService } from '../services/expenseService';
import { useToast } from '../hooks/useToast';
import EditExpenseModal from '../components/upload/EditExpenseModal';
import PayModal from '../components/upload/PayModal';
import Modal from '../components/ui/Modal';

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
  const [proofBlob, setProofBlob] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!expenseId) return;
    loadExpense();
  }, [expenseId]);

  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

  async function loadReceiptImage(r) {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}${r.file_url}`, {
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
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}${url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      setProofBlob(URL.createObjectURL(blob));
    } catch {}
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

  if (loading) return <AppShell><div className="ed-loading">Loading...</div></AppShell>;
  if (!expense) return <AppShell><div className="ed-loading">Expense not found</div></AppShell>;

  const isClientView = expense.submitter_id !== undefined; // simplified; real check would be role-based

  return (
    <AppShell>
      <div className="ed-container">
        <header className="ed-header">
          <button className="ed-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Back
          </button>
          <div className={`ed-status ed-status--${expense.status}`}>
            <span className={`ed-dot ed-dot--${expense.status}`}></span>
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
                  <span>{expense.currency || 'USD'} ${(parseFloat(expense.amount) || 0).toFixed(2)}</span>
                </div>
                <div className="ed-divider"></div>
                <div className="ed-total">
                  <span>TOTAL</span>
                  <span>{expense.currency || 'USD'} ${(parseFloat(expense.amount) || 0).toFixed(2)}</span>
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
              <h2 className="ed-card-title">Expense Details</h2>
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
                <h3>{expense.currency || 'USD'} ${(parseFloat(expense.amount) || 0).toFixed(2)}</h3>
              </div>

              {expense.tags?.length > 0 && (
                <div className="ed-tags-display">
                  <label>Tags</label>
                  <div className="ed-tag-list">
                    {expense.tags.map((t) => <span key={t} className="ed-tag">{t}</span>)}
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
              <div className="ed-actions">
                <Button variant="primary" style={{ flex: 1 }} onClick={() => setPayModalOpen(true)}>
                  <Check size={18} />
                  Mark as Paid
                </Button>
              </div>
            )}

            {expense.status === 'paid' && expense.paid_proof_url && (
              <div className="ed-paid-proof">
                <h4>Proof of Payment</h4>
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

      <style>{`
        .ed-loading { padding: 60px; text-align: center; color: var(--color-on-surface-variant); font-size: 15px; }
        .ed-back { background: none; border: none; display: inline-flex; align-items: center; gap: 8px; color: var(--color-on-surface-variant); cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 500; transition: color 0.15s ease; }
        .ed-back:hover { color: var(--color-primary); }
        .ed-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .ed-status { display: flex; align-items: center; gap: 8px; padding: 6px 14px; background: var(--color-surface-container); border-radius: 20px; font-size: 13px; font-weight: 600; }
        .ed-dot { width: 8px; height: 8px; border-radius: 50%; }
        .ed-dot--draft { background: #94a3b8; }
        .ed-dot--submitted { background: var(--color-primary); }
        .ed-dot--approved { background: #22c55e; }
        .ed-dot--rejected { background: #ef4444; }
        .ed-dot--paid { background: #22c55e; }

        .ed-rejection-banner { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; }
        .ed-rejection-banner strong { font-weight: 600; }

        .ed-layout { display: grid; grid-template-columns: 1fr 400px; gap: 40px; align-items: start; }

        .ed-receipt-section { }
        .ed-receipt-paper { background: var(--color-surface); padding: 40px; border-radius: 16px; display: flex; justify-content: center; min-height: 400px; border: 1px solid var(--color-outline-variant); }
        .ed-receipt-inner { background: white; width: 320px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); font-family: 'Courier New', Courier, monospace; color: #334155; text-align: center; }
        .ed-scanner-text { font-size: 10px; color: #94a3b8; margin-bottom: 24px; letter-spacing: 2px; }
        .ed-receipt-logo { font-size: 32px; margin-bottom: 12px; }
        .ed-merchant { font-weight: 700; margin-bottom: 4px; }
        .ed-meta { font-size: 12px; color: #64748b; margin-bottom: 24px; }
        .ed-divider { border-bottom: 1px dashed #cbd5e1; margin: 16px 0; }
        .ed-line { display: flex; justify-content: space-between; font-size: 14px; }
        .ed-total { display: flex; justify-content: space-between; font-weight: 700; font-size: 18px; margin-top: 8px; }

        .ed-receipt-files { margin-top: 16px; }
        .ed-receipt-files h4 { font-size: 14px; font-weight: 600; color: var(--color-on-surface); margin-bottom: 8px; }
        .ed-receipt-file { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--color-surface); border: 1px solid var(--color-outline-variant); border-radius: 8px; text-decoration: none; color: var(--color-primary); font-size: 13px; font-weight: 500; }
        .ed-receipt-file:hover { background: var(--color-primary-container); }

        .ed-card { background: var(--color-surface); padding: 28px; border-radius: 16px; border: 1px solid var(--color-outline-variant); margin-bottom: 24px; }
        .ed-card-title { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700; color: var(--color-on-surface); letter-spacing: -0.3px; margin-bottom: 24px; }
        .ed-grid { display: flex; flex-direction: column; gap: 20px; margin-bottom: 28px; }
        .ed-item label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-on-surface-variant); font-weight: 600; margin-bottom: 4px; }
        .ed-item p { font-weight: 600; color: var(--color-on-surface); }
        .ed-amount { padding: 20px; background: var(--color-surface-container); border-radius: 14px; margin-bottom: 24px; }
        .ed-amount label { font-size: 12px; color: var(--color-on-surface-variant); font-weight: 600; }
        .ed-amount h3 { font-family: 'Space Grotesk', sans-serif; font-size: 28px; font-weight: 700; color: var(--color-primary); letter-spacing: -0.5px; }
        .ed-tags-display { margin-bottom: 24px; }
        .ed-tags-display label { font-size: 12px; color: var(--color-on-surface-variant); font-weight: 600; display: block; margin-bottom: 8px; }
        .ed-tag-list { display: flex; gap: 8px; flex-wrap: wrap; }
        .ed-tag { padding: 4px 12px; background: var(--color-primary-container); color: var(--color-on-primary-container); border-radius: 20px; font-size: 12px; font-weight: 600; }
        .ed-notes label { font-size: 12px; color: var(--color-on-surface-variant); font-weight: 600; }
        .ed-notes p { font-size: 14px; color: var(--color-on-surface); line-height: 1.6; font-style: italic; margin-top: 4px; }
        .ed-actions { display: flex; gap: 12px; margin-bottom: 12px; }
        .ed-reject-form { background: var(--color-surface-container); padding: 16px; border-radius: 12px; }
        .ed-reject-textarea { width: 100%; padding: 10px 14px; border-radius: 8px; border: 1.5px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface); font-family: 'Space Grotesk', sans-serif; font-size: 13px; resize: vertical; }
        .ed-reject-textarea:focus { outline: none; border-color: var(--color-primary); }
        .ed-reject-error { color: #ef4444; font-size: 12px; margin-top: 4px; }
        .ed-reject-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }

        .ed-receipt-img-wrap { display: flex; flex-direction: column; gap: 8px; }
        .ed-receipt-img { width: 100%; border-radius: 8px; cursor: pointer; border: 1px solid var(--color-outline-variant); transition: opacity 0.15s ease; }
        .ed-receipt-img:hover { opacity: 0.85; }
        .ed-receipt-dl { background: var(--color-surface); border: 1px solid var(--color-outline-variant); border-radius: 8px; padding: 6px 12px; cursor: pointer; font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 500; color: var(--color-primary); display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; }
        .ed-receipt-dl:hover { background: var(--color-primary-container); }
        .ed-img-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 3000; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 40px; }
        .ed-img-full { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }

        .ed-paid-proof { background: var(--color-surface); padding: 20px; border-radius: 14px; border: 1px solid var(--color-outline-variant); margin-bottom: 24px; }
        .ed-paid-proof h4 { font-size: 14px; font-weight: 700; color: var(--color-on-surface); margin-bottom: 8px; }
        .ed-paid-note { font-size: 13px; color: var(--color-on-surface-variant); margin-bottom: 12px; font-style: italic; }
        .ed-paid-loading { font-size: 13px; color: var(--color-on-surface-variant); }
        .ed-proof-img { width: 100%; border-radius: 8px; cursor: pointer; border: 1px solid var(--color-outline-variant); transition: opacity 0.15s ease; }
        .ed-proof-img:hover { opacity: 0.85; }
      `}</style>
    </AppShell>
  );
};

export default ExpenseDetail;
