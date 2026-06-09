import { useState, useRef } from 'react';
import { Upload, X, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { expenseService } from '../../services/expenseService';
import { useToast } from '../../hooks/useToast';

const PayModal = ({ isOpen, onClose, expenseId, onPaid }) => {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await expenseService.pay(expenseId, file, note);
      showToast('Marked as paid', 'success');
      onPaid();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to mark as paid');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setFile(null);
    setNote('');
    setError('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Mark as Paid">
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500, border: '1px solid rgba(239,68,68,0.25)' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>
              Proof of Payment (optional)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--color-outline-variant)', borderRadius: 12, padding: 24,
                textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-outline-variant)'}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files[0])}
              />
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--color-primary)', fontWeight: 600, fontSize: 13 }}>
                  <Check size={18} />
                  {file.name}
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--color-on-surface-variant)' }}>
                  <Upload size={24} />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Upload receipt screenshot, bank transfer confirmation, etc.</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>
              Payment Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Transaction reference, payment method, notes..."
              rows={3}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid var(--color-outline-variant)', background: 'var(--color-surface)',
                color: 'var(--color-on-surface)', fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14, resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--color-outline-variant)', padding: '20px 0 0' }}>
          <Button variant="ghost" type="button" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PayModal;
