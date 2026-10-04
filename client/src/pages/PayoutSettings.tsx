import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, Trash2, Landmark } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';
import { paymentService } from '../services/paymentService';
import { useToast } from '../hooks/useToast';

const STATUS_META = {
  active: { label: 'Active', color: 'var(--color-tertiary)', icon: CheckCircle2 },
  pending: { label: 'Awaiting details', color: 'var(--color-on-surface-variant)', icon: Clock },
  restricted: { label: 'Needs attention', color: 'var(--color-error)', icon: AlertTriangle },
  disabled: { label: 'Disabled', color: 'var(--color-error)', icon: AlertTriangle },
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid var(--color-outline-variant)',
  background: 'var(--color-surface)',
  color: 'var(--color-on-surface)',
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: 14,
};

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-on-surface-variant)',
  marginBottom: 6,
};

export default function PayoutSettings() {
  const [accounts, setAccounts] = useState([]);
  const [disclosures, setDisclosures] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    accountBank: '',
    accountNumber: '',
    businessName: '',
    businessEmail: '',
    country: '',
    businessMobile: '',
  });
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentService.listAccounts();
      setAccounts(res.data.accounts || []);
      setDisclosures(res.data.disclosures || {});
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to load payout accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const state = searchParams.get('stripe_onboarding');
    if (state !== 'return') return;

    paymentService
      .syncStripeAccount()
      .then((res) => {
        const status = res.data.account?.status;
        if (status === 'active') showToast('Stripe account connected', 'success');
        else if (status === 'restricted') showToast('Stripe needs more information from you', 'error');
        else showToast('Stripe onboarding is not finished yet', 'info');
      })
      .catch(() => showToast('Could not refresh your Stripe account', 'error'))
      .finally(() => load());
  }, [searchParams, showToast, load]);

  const stripe = accounts.find((a) => a.provider === 'stripe');
  const flutterwave = accounts.find((a) => a.provider === 'flutterwave');

  async function handleStripe() {
    setBusy(true);
    try {
      const res = await paymentService.startStripeOnboarding();
      if (res.data.onboardingUrl) window.location.href = res.data.onboardingUrl;
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not start Stripe onboarding', 'error');
      setBusy(false);
    }
  }

  async function handleFlutterwave(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await paymentService.addFlutterwaveSubaccount(form);
      showToast('Payout account added', 'success');
      setForm({ accountBank: '', accountNumber: '', businessName: '', businessEmail: '', country: '', businessMobile: '' });
      load();
      if (res.data.disclosure) setDisclosures((d) => ({ ...d, flutterwave: res.data.disclosure }));
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not add the payout account', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(provider) {
    setBusy(true);
    try {
      await paymentService.removeAccount(provider);
      showToast('Payout account removed', 'success');
      load();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not remove the account', 'error');
    } finally {
      setBusy(false);
    }
  }

  function renderAccount(account) {
    const meta = STATUS_META[account.status] || STATUS_META.pending;
    const Icon = meta.icon;

    return (
      <div
        key={account.provider}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          padding: 16,
          borderRadius: 12,
          border: '1.5px solid var(--color-outline-variant)',
          background: 'var(--color-surface-container)',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icon size={18} style={{ color: meta.color, marginTop: 2 }} aria-hidden="true" />
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--color-on-surface)' }}>
              {account.provider === 'stripe' ? 'Stripe' : 'Flutterwave'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: meta.color }}>{meta.label}</p>
            {account.displayLabel && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
                {account.displayLabel}
              </p>
            )}
            {!account.canReceiveSplits && account.status === 'active' && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-error)' }}>
                Payouts are not enabled on this account yet.
              </p>
            )}
          </div>
        </div>

        <Button variant="ghost" size="sm" type="button" disabled={busy} onClick={() => handleRemove(account.provider)}>
          <Trash2 size={14} /> Remove
        </Button>
      </div>
    );
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 48px' }}>
        <Button variant="ghost" size="sm" type="button" onClick={() => window.history.back()}>
          <ArrowLeft size={16} /> Back
        </Button>

        <h1 style={{ fontSize: 24, margin: '16px 0 4px', color: 'var(--color-on-surface)' }}>Payout accounts</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-on-surface-variant)' }}>
          Link a payout account so expense reimbursements are sent straight to your bank instead of
          being paid out manually.
        </p>

        {loading ? (
          <p style={{ marginTop: 24, fontSize: 14, color: 'var(--color-on-surface-variant)' }}>Loading your accounts...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 }}>
            {accounts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {accounts.map(renderAccount)}
              </div>
            )}

            <section>
              <h2 style={{ fontSize: 16, margin: '0 0 8px', color: 'var(--color-on-surface)' }}>Stripe</h2>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
                {disclosures.stripe || 'Used for payouts outside Africa.'}
              </p>
              {stripe ? (
                <Button type="button" variant="secondary" disabled={busy} onClick={handleStripe}>
                  {busy ? 'Opening Stripe...' : stripe.status === 'active' ? 'Open Stripe dashboard setup' : 'Continue onboarding'}
                </Button>
              ) : (
                <Button type="button" disabled={busy} onClick={handleStripe}>
                  {busy ? 'Connecting...' : 'Connect with Stripe'}
                </Button>
              )}
            </section>

            <section>
              <h2 style={{ fontSize: 16, margin: '0 0 8px', color: 'var(--color-on-surface)' }}>Flutterwave</h2>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
                {disclosures.flutterwave || 'Used for payouts to African bank accounts.'}
              </p>

              {flutterwave ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
                  Remove this account before adding a different bank account.
                </p>
              ) : (
                <form onSubmit={handleFlutterwave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle} htmlFor="accountBank">Bank code</label>
                      <input
                        id="accountBank"
                        style={inputStyle}
                        value={form.accountBank}
                        onChange={(e) => setForm({ ...form, accountBank: e.target.value })}
                        placeholder="044"
                        required
                      />
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="accountNumber">Account number</label>
                      <input
                        id="accountNumber"
                        style={inputStyle}
                        value={form.accountNumber}
                        onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                        placeholder="0123456789"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle} htmlFor="businessName">Business or payee name</label>
                      <input
                        id="businessName"
                        style={inputStyle}
                        value={form.businessName}
                        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="businessEmail">Business email</label>
                      <input
                        id="businessEmail"
                        style={inputStyle}
                        type="email"
                        value={form.businessEmail}
                        onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={labelStyle} htmlFor="country">Country</label>
                      <input
                        id="country"
                        style={inputStyle}
                        value={form.country}
                        onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })}
                        placeholder="NG"
                        maxLength={2}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle} htmlFor="businessMobile">Business phone</label>
                    <input
                      id="businessMobile"
                      style={inputStyle}
                      value={form.businessMobile}
                      onChange={(e) => setForm({ ...form, businessMobile: e.target.value })}
                      placeholder="08000010100"
                      required
                    />
                  </div>

                  <div>
                    <Button type="submit" disabled={busy}>
                      {busy ? 'Adding...' : 'Add payout account'}
                    </Button>
                  </div>
                </form>
              )}
            </section>

            <p style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--color-on-surface-variant)', margin: 0 }}>
              <Landmark size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
              Bank details are sent straight to the payment provider and are never stored by Finsyte
              beyond the last four digits.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
