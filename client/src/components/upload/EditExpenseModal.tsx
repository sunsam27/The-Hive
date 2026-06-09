import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { expenseService } from '../../services/expenseService';
import { useToast } from '../../hooks/useToast';
import { CURRENCIES } from '../../constants/currencies';

const EditExpenseModal = ({ isOpen, onClose, expense, onSaved }) => {
  const [merchant, setMerchant] = useState(expense?.merchant || '');
  const [amount, setAmount] = useState(expense?.amount || '');
  const [currency, setCurrency] = useState(expense?.currency || 'USD');
  const [date, setDate] = useState(expense?.expense_date ? expense.expense_date.slice(0, 10) : '');
  const [category, setCategory] = useState(expense?.category || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [notes, setNotes] = useState(expense?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await expenseService.update(expense.id, {
        merchant: merchant.trim() || undefined,
        amount: amount ? parseFloat(amount) : undefined,
        currency,
        expenseDate: date || undefined,
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      showToast('Expense updated', 'success');
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Expense">
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {error && (
          <div className="eem-error">{error}</div>
        )}

        <div className="row" style={{ display: 'flex', gap: 16 }}>
          <Input label="Merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} className="col" />
          <div className="currency-select-wrap" style={{ width: 140 }}>
            <label className="input-label">Currency</label>
            <div className="currency-select-inner">
              <select className="currency-select" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} — {c.symbol}</option>
                ))}
              </select>
              <ChevronDown size={16} className="currency-select-chevron" />
            </div>
          </div>
        </div>

        <div className="row" style={{ display: 'flex', gap: 16 }}>
          <Input label="Amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="col" />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="col" />
        </div>

        <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Travel, Office Supplies" />

        <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" />

        <div className="input-group">
          <label className="input-label">Notes</label>
          <textarea
            className="eem-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            rows={3}
          />
        </div>

        <div className="modal-footer" style={{ padding: '20px 0 0', border: 'none' }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      <style>{`
        .eem-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          color: #ef4444;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 8px;
        }
        .eem-textarea {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--color-outline-variant);
          background: var(--color-surface);
          color: var(--color-on-surface);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          resize: vertical;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .eem-textarea:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
        }
        .row { display: flex; gap: 16px; }
        .col { flex: 1; }
        .col-sm { width: 100px; }
      `}</style>
    </Modal>
  );
};

export default EditExpenseModal;
