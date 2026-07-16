import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, FileText, AlertCircle, X, Plus, ChevronDown } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { processReceipt } from '../../services/ocrService';
import { expenseService } from '../../services/expenseService';
import { useToast } from '../../hooks/useToast';
import { CURRENCIES } from '../../constants/currencies';

const PRESET_TAGS = ['Travel', 'Ads', 'Software', 'Office Supplies'];

const NewExpenseModal = ({ isOpen, onClose, workspaceId }) => {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [rawText, setRawText] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm();

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError('');
    setRawText('');
    setShowRaw(false);
    setIsProcessing(true);
    try {
      const result = await processReceipt(selectedFile);
      if (result.amount) setValue('amount', result.amount);
      if (result.merchant) setValue('merchant', result.merchant);
      if (result.date) setValue('date', result.date);
      if (result.currency) setCurrency(result.currency);
      if (result.text) setRawText(result.text);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'OCR failed');
    } finally {
      setIsProcessing(false);
    }
  };

  function addTag(name) {
    const trimmed = name.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    setTags([...tags, trimmed]);
    setTagInput('');
  }

  function removeTag(name) {
    setTags(tags.filter((t) => t !== name));
  }

  async function onSubmit(data) {
    if (!workspaceId) {
      setError('No workspace selected.');
      return;
    }
    if (!file) {
      setError('Please upload a receipt first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data: expense } = await expenseService.create({
        workspaceId,
        amount: parseFloat(data.amount) || 0,
        merchant: data.merchant,
        expenseDate: data.date,
        currency,
      });

      await expenseService.uploadReceipt(expense.id, file, rawText);

      for (const tag of tags) {
        try { await expenseService.addTag(expense.id, tag); } catch (err) { showToast(err?.response?.data?.error || 'Failed to add tag', 'error'); }
      }

      reset();
      setFile(null);
      setTags([]);
      setRawText('');
      setCurrency('USD');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
  }

  const onInvalid = (errs) => {
    const first = Object.values(errs)[0];
    setError(first?.message || 'Please fill in required fields');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Expense"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit, onInvalid)} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Expense'}
          </Button>
        </>
      }
    >
      <div className="upload-flow">
        {!file ? (
          <div className="dropzone">
            <input type="file" id="receipt-upload" hidden onChange={handleFileChange} accept="image/*,application/pdf" />
            <label htmlFor="receipt-upload" className="dropzone-label">
              <div className="upload-icon-circle"><Upload size={24} /></div>
              <h3>Upload Receipt</h3>
              <p>Drag and drop or click to browse</p>
              <span className="file-hint">JPG, PNG or PDF (max 10MB)</span>
            </label>
          </div>
        ) : (
          <div className="receipt-preview-container">
            <div className="preview-image">
              <FileText size={48} />
              <p className="filename">{file.name}</p>
            </div>
            {isProcessing && (
              <div className="ocr-loader">
                <div className="spinner"></div>
                <p>AI is analyzing your receipt...</p>
              </div>
            )}
            {error && <div className="ocr-error"><AlertCircle size={16} />{error}</div>}
            {rawText && !isProcessing && (
              <button className="raw-toggle" onClick={() => setShowRaw(!showRaw)}>
                {showRaw ? 'Hide' : 'Show'} raw OCR text
              </button>
            )}
            {rawText && showRaw && <pre className="raw-text">{rawText}</pre>}
          </div>
        )}

        <div className={`form-fields ${isProcessing ? 'blur' : ''}`}>
          <div className="row">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { required: 'Required' })}
              error={errors.amount}
              className="col"
            />
            <div className="currency-select-wrap">
              <label className="input-label">Currency</label>
              <div className="currency-select-inner">
                <select
                  className="currency-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.symbol}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="currency-select-chevron" />
              </div>
            </div>
          </div>

          <Input
            label="Merchant"
            placeholder="e.g. Amazon, Uber"
            {...register('merchant', { required: 'Required' })}
            error={errors.merchant}
            helperText={file && !isProcessing ? 'OCR detected this automatically' : ''}
          />

          <Input
            label="Date"
            type="date"
            {...register('date', { required: 'Required' })}
            error={errors.date}
          />

          <div className="tag-section">
            <label className="section-label">Tags</label>
            <div className="tag-pills">
              {PRESET_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                <span key={t} className="tag-pill" onClick={() => addTag(t)}>+ {t}</span>
              ))}
            </div>
            {tags.length > 0 && (
              <div className="tag-pills" style={{ marginTop: 8 }}>
                {tags.map((t) => (
                  <span key={t} className="tag-pill active">
                    {t}
                    <X size={12} style={{ marginLeft: 4, cursor: 'pointer' }} onClick={() => removeTag(t)} />
                  </span>
                ))}
              </div>
            )}
            <div className="tag-input-row">
              <input
                className="tag-text-input"
                placeholder="Custom tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
              />
              <button type="button" className="tag-add-btn" onClick={() => addTag(tagInput)}><Plus size={16} /></button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .upload-flow { display: flex; flex-direction: column; gap: 32px; }
        .dropzone { border: 2px dashed var(--color-outline-variant); border-radius: 20px; padding: 40px; text-align: center; transition: border-color 0.2s ease; }
        .dropzone:hover { border-color: var(--color-primary); background: var(--color-surface-container-low); }
        .dropzone-label { cursor: pointer; display: block; }
        .upload-icon-circle { width: 56px; height: 56px; background: var(--color-primary-container); color: var(--color-on-primary-container); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .dropzone h3 { margin-bottom: 4px; color: var(--color-on-surface); }
        .dropzone p { color: var(--color-on-surface-variant); font-size: 14px; }
        .file-hint { font-size: 12px; color: var(--color-outline); margin-top: 12px; display: block; }
        .receipt-preview-container { background: var(--color-surface-container); border-radius: 16px; padding: 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .preview-image { width: 80px; height: 80px; background: var(--color-surface-container-lowest); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--color-outline); flex-shrink: 0; }
        .filename { font-size: 10px; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; max-width: 60px; }
        .ocr-loader { flex: 1; display: flex; align-items: center; gap: 12px; }
        .ocr-loader p { font-size: 14px; font-weight: 600; color: var(--color-primary); }
        .ocr-error { display: flex; align-items: center; gap: 8px; color: #ef4444; font-size: 13px; padding: 8px 12px; background: rgba(239,68,68,0.08); border-radius: 8px; width: 100%; }
        .raw-toggle { background: none; border: 1px solid var(--color-outline-variant); color: var(--color-on-surface-variant); font-size: 12px; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-family: 'Space Grotesk', sans-serif; }
        .raw-toggle:hover { border-color: var(--color-primary); color: var(--color-primary); }
        .raw-text { width: 100%; background: var(--color-surface-container); padding: 12px; border-radius: 8px; font-size: 11px; line-height: 1.5; color: var(--color-on-surface-variant); max-height: 150px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; font-family: 'JetBrains Mono', monospace; }
        .row { display: flex; gap: 16px; }
        .col { flex: 1; }
        .col-sm { width: 100px; }
        .form-fields { transition: filter 0.3s ease; }
        .form-fields.blur { filter: blur(2px); opacity: 0.6; pointer-events: none; }
        .tag-section { margin-top: 8px; }
        .section-label { font-size: 14px; color: var(--color-on-surface-variant); margin-bottom: 8px; display: block; font-weight: 500; }
        .tag-pills { display: flex; gap: 8px; flex-wrap: wrap; }
        .tag-pill { padding: 4px 12px; border-radius: 20px; background: var(--color-surface-container); color: var(--color-on-surface-variant); font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; }
        .tag-pill.active { background: var(--color-primary); color: var(--color-on-primary); }
        .tag-input-row { display: flex; gap: 8px; margin-top: 8px; }
        .tag-text-input { flex: 1; padding: 8px 12px; border-radius: 8px; border: 1.5px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface); font-family: 'Space Grotesk', sans-serif; font-size: 13px; }
        .tag-text-input:focus { outline: none; border-color: var(--color-primary); }
        .tag-add-btn { background: var(--color-primary); color: var(--color-on-primary); border: none; border-radius: 8px; width: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .spinner { width: 20px; height: 20px; border: 3px solid var(--color-primary-container); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .currency-select-wrap { position: relative; width: 140px; display: flex; flex-direction: column; gap: 6px; }
        .currency-select-inner { position: relative; }
        .currency-select { appearance: none; width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface); font-family: 'Space Grotesk', sans-serif; font-size: 14px; cursor: pointer; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .currency-select:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1); }
        .currency-select-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--color-on-surface-variant); }
      `}</style>
    </Modal>
  );
};

export default NewExpenseModal;
