import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Send, ChevronDown } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';
import { invoiceService } from '../services/invoiceService';
import { workspaceService } from '../services/workspaceService';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import { CURRENCIES } from '../constants/currencies';

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [workspaces, setWorkspaces] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceId, setInvoiceId] = useState(null);
  const [form, setForm] = useState({
    workspaceId: '',
    serviceDesc: '',
    amount: '',
    currency: 'USD',
    clientName: '',
    clientCompany: '',
    clientEmail: '',
    freelancerName: user?.name || '',
    freelancerBusiness: '',
    freelancerContact: '',
    taxAmount: '',
    taxDesc: '',
    paymentTerms: '',
    notes: '',
  });

  useEffect(() => {
    workspaceService.list()
      .then((res) => {
        setWorkspaces(res.data.data || res.data);
        if (res.data.data?.[0]) setForm((f) => ({ ...f, workspaceId: res.data.data[0].id }));
      })
      .catch(() => {});
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.workspaceId) { showToast('Please select a workspace', 'error'); return; }
    if (!form.serviceDesc.trim()) { showToast('Service description is required', 'error'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { showToast('Please enter a valid amount', 'error'); return; }
    if (!form.freelancerName.trim()) { showToast('Your name is required', 'error'); return; }

    setSubmitting(true);
    try {
      const payload = {
        workspaceId: form.workspaceId,
        serviceDesc: form.serviceDesc.trim(),
        amount: parseFloat(form.amount),
        currency: form.currency,
        clientName: form.clientName.trim(),
        clientCompany: form.clientCompany.trim(),
        clientEmail: form.clientEmail.trim(),
        freelancerName: form.freelancerName.trim(),
        freelancerBusiness: form.freelancerBusiness.trim(),
        freelancerContact: form.freelancerContact.trim(),
        taxAmount: form.taxAmount ? parseFloat(form.taxAmount) : 0,
        taxDesc: form.taxDesc.trim(),
        paymentTerms: form.paymentTerms.trim(),
        notes: form.notes.trim(),
      };

      const res = await invoiceService.create(payload);
      setInvoiceId(res.data.id);
      showToast('Receipt created successfully', 'success');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to create receipt', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload() {
    if (!invoiceId) return;
    try {
      const res = await invoiceService.downloadPdf(invoiceId);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'receipt.pdf';
      a.click();
      URL.revokeObjectURL(url);
      showToast('PDF downloaded', 'success');
    } catch (err) {
      showToast('Failed to download', 'error');
    }
  }

  async function handleConvert() {
    if (!invoiceId) return;
    try {
      await invoiceService.convertToExpense(invoiceId);
      showToast('Receipt converted to expense', 'success');
      navigate('/expenses');
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to convert', 'error');
    }
  }

  const total = parseFloat(form.amount || 0) + parseFloat(form.taxAmount || 0);

  return (
    <AppShell>
      <div className="page page-enter">
        <div className="page-top">
          <div>
            <button className="back-link" onClick={() => navigate('/invoices')}>
              <ArrowLeft size={18} />
              My Receipts
            </button>
            <h1 className="page-title">Draft Receipt</h1>
            <p className="page-sub">Create a professional receipt for services rendered.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <section className="form-section">
              <h2 className="section-ttl">Service Details</h2>
              <div className="form-field">
                <label className="input-label">Workspace</label>
                <select className="field-select" value={form.workspaceId} onChange={(e) => update('workspaceId', e.target.value)} required>
                  <option value="">Select workspace...</option>
                  {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="input-label">Service Description *</label>
                <textarea
                  className="field-input"
                  rows={3}
                  placeholder="e.g. Website design & development for Q2 2026"
                  value={form.serviceDesc}
                  onChange={(e) => update('serviceDesc', e.target.value)}
                  required
                />
              </div>
              <div className="row" style={{ display: 'flex', gap: 16 }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="input-label">Amount *</label>
                  <input className="field-input" type="number" step="0.01" min="0" placeholder="0.00"
                    value={form.amount} onChange={(e) => update('amount', e.target.value)} required />
                </div>
                <div className="currency-select-wrap" style={{ width: 140 }}>
                  <label className="input-label">Currency</label>
                  <div className="currency-select-inner" style={{ position: 'relative' }}>
                    <select className="currency-select" value={form.currency} onChange={(e) => update('currency', e.target.value)}
                      style={{ appearance: 'none', width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--color-outline-variant)', background: 'var(--color-surface)', color: 'var(--color-on-surface)', fontSize: 14, cursor: 'pointer' }}>
                      {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.symbol}</option>)}
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-on-surface-variant)' }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="form-section">
              <h2 className="section-ttl">Client Information</h2>
              <div className="form-field">
                <label className="input-label">Client Name</label>
                <input className="field-input" placeholder="e.g. John Doe"
                  value={form.clientName} onChange={(e) => update('clientName', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="input-label">Company / Organization</label>
                <input className="field-input" placeholder="e.g. Acme Corp"
                  value={form.clientCompany} onChange={(e) => update('clientCompany', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="input-label">Client Email</label>
                <input className="field-input" type="email" placeholder="john@acme.com"
                  value={form.clientEmail} onChange={(e) => update('clientEmail', e.target.value)} />
              </div>
            </section>

            <section className="form-section">
              <h2 className="section-ttl">Your Information</h2>
              <div className="form-field">
                <label className="input-label">Your Name *</label>
                <input className="field-input" placeholder="Jane Doe"
                  value={form.freelancerName} onChange={(e) => update('freelancerName', e.target.value)} required />
              </div>
              <div className="form-field">
                <label className="input-label">Business Name</label>
                <input className="field-input" placeholder="e.g. Jane Designs LLC"
                  value={form.freelancerBusiness} onChange={(e) => update('freelancerBusiness', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="input-label">Contact</label>
                <input className="field-input" placeholder="Phone, website, etc."
                  value={form.freelancerContact} onChange={(e) => update('freelancerContact', e.target.value)} />
              </div>
            </section>

            <section className="form-section">
              <h2 className="section-ttl">Tax & Terms</h2>
              <div className="row" style={{ display: 'flex', gap: 16 }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="input-label">Tax Amount</label>
                  <input className="field-input" type="number" step="0.01" min="0" placeholder="0.00"
                    value={form.taxAmount} onChange={(e) => update('taxAmount', e.target.value)} />
                </div>
                <div className="form-field" style={{ flex: 2 }}>
                  <label className="input-label">Tax Description</label>
                  <input className="field-input" placeholder="e.g. VAT (7.5%)"
                    value={form.taxDesc} onChange={(e) => update('taxDesc', e.target.value)} />
                </div>
              </div>
              <div className="form-field">
                <label className="input-label">Payment Terms</label>
                <textarea className="field-input" rows={2} placeholder="e.g. Payment due within 30 days"
                  value={form.paymentTerms} onChange={(e) => update('paymentTerms', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="input-label">Notes</label>
                <textarea className="field-input" rows={2} placeholder="Additional notes..."
                  value={form.notes} onChange={(e) => update('notes', e.target.value)} />
              </div>
            </section>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" type="button" onClick={() => navigate('/invoices')}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Receipt'}
              </Button>
            </div>
          </form>

          <div className="invoice-preview-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <FileText size={18} />
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Receipt Preview</h3>
            </div>
            {invoiceId ? (
              <div className="invoice-preview-ready">
                <div className="invoice-preview-icon">
                  <FileText size={40} />
                </div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>Receipt saved!</p>
                <p style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>What would you like to do?</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexDirection: 'column', width: '100%' }}>
                  <Button variant="primary" onClick={handleDownload} style={{ width: '100%' }}>
                    <Download size={16} />
                    Download PDF
                  </Button>
                  <Button variant="secondary" onClick={handleConvert} style={{ width: '100%' }}>
                    <Send size={16} />
                    Convert to Expense
                  </Button>
                </div>
              </div>
            ) : (
              <div className="invoice-preview-empty">
                <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
                  Fill in the form and save the receipt to see options.
                </p>
                <div className="invoice-preview-total">
                  <span>Total</span>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{CURRENCIES.find((c) => c.code === form.currency)?.flag} {form.currency} {total.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .form-section { background: var(--color-surface); border: 1px solid var(--color-outline-variant); border-radius: 16px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .input-label { font-size: 13px; font-weight: 600; color: var(--color-on-surface-variant); margin-bottom: 6px; display: block; }
        .field-input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface); font-family: 'Space Grotesk', sans-serif; font-size: 14px; box-sizing: border-box; }
        .field-input:focus { outline: none; border-color: var(--color-primary); }
        .field-select { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface); font-family: 'Space Grotesk', sans-serif; font-size: 14px; cursor: pointer; }
        .invoice-preview-card { background: var(--color-surface); border: 1px solid var(--color-outline-variant); border-radius: 16px; padding: 24px; position: sticky; top: 24px; }
        .invoice-preview-ready { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
        .invoice-preview-icon { width: 72px; height: 72px; background: var(--color-primary-container); color: var(--color-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
        .invoice-preview-empty { display: flex; flex-direction: column; gap: 20px; }
        .invoice-preview-total { background: var(--color-surface-container); border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
        .icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--color-outline-variant); background: var(--color-surface); color: var(--color-on-surface-variant); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease; }
        .icon-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
        .icon-btn--danger:hover { border-color: var(--color-error); color: var(--color-error); }
        .back-link { display: inline-flex; align-items: center; gap: 6px; color: var(--color-on-surface-variant); text-decoration: none; font-size: 13px; font-weight: 500; margin-bottom: 8px; cursor: pointer; background: none; border: none; font-family: 'Space Grotesk', sans-serif; padding: 0; }
        .back-link:hover { color: var(--color-primary); }
      `}</style>
    </AppShell>
  );
}
