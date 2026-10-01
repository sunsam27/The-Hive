import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Sparkles, TrendingDown, CreditCard, AlertTriangle } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';
import { billingService } from '../services/billingService';
import { useBilling } from '../context/BillingContext';
import { useToast } from '../hooks/useToast';
import { PLAN_CURRENCIES } from '../constants/currencies';

const cardStyle = {
  border: '1.5px solid var(--color-outline-variant)',
  borderRadius: 14,
  background: 'var(--color-surface)',
  padding: 22,
};

export default function BillingPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { status, loading, selectWorkspace, refresh, setStatus } = useBilling();

  const [currency, setCurrency] = useState('USD');
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => { if (id) selectWorkspace(id); }, [id, selectWorkspace]);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await refresh(id);
    if (data) setStatus(data);
  }, [id, refresh, setStatus]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchParams.get('payment_status') !== 'completed') return;
    const reference = searchParams.get('reference');
    if (!reference) {
      load();
      return;
    }
    let cancelled = false;
    setVerifying(true);

    const check = async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const res = await billingService.verifyCheckout(reference);
          if (cancelled) return;
          if (res.data.status === 'completed') {
            setStatus(res.data);
            showToast('Pro is now active on this workspace', 'success');
            window.history.replaceState({}, '', `/workspaces/${id}/billing`);
            return;
          }
        } catch {
          /* the webhook may not have landed yet; keep polling */
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (!cancelled) showToast('Still waiting for payment confirmation', 'info');
    };

    check();
    return () => { cancelled = true; };
  }, [searchParams, id, setStatus, showToast]);

  async function handleUpgrade() {
    setBusy(true);
    try {
      const res = await billingService.startCheckout(id, currency);
      window.location.href = res.data.paymentUrl;
    } catch (err) {
      showToast(err?.response?.data?.error || 'Could not start the upgrade', 'error');
      setBusy(false);
    }
  }

  if (loading && !status.paidUntil) {
    return (
      <AppShell>
        <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)' }}>Loading your plan...</p>
      </AppShell>
    );
  }

  const isPro = status.plan === 'pro';
  const price = status.upgrade?.priceUsd ?? 39;
  const currencyPrices = status.upgrade?.currencies || [];
  const selected = currencyPrices.find((c) => c.code === currency);
  const selectedPrice = typeof selected?.amount === 'number' && selected.amount > 0
    ? selected.amount.toFixed(2)
    : (currency === 'USD' ? price.toFixed(2) : null);
  const usage = status.usage || {};
  const feePercent = (status.feeRate * 100).toFixed(1).replace(/\.0$/, '');
  return (
    <AppShell>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 0 48px' }}>
        <Button variant="ghost" size="sm" type="button" onClick={() => window.history.back()}>
          <ArrowLeft size={16} /> Back
        </Button>

        <h1 style={{ fontSize: 24, margin: '16px 0 4px', color: 'var(--color-on-surface)' }}>
          Plan &amp; billing
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-on-surface-variant)' }}>
          Pro is a single annual payment, not a subscription you have to cancel.
        </p>

        {status.lapsed && (
          <div
            role="status"
            style={{
              display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 20, padding: 14,
              borderRadius: 12, border: '1.5px solid var(--color-error)',
              background: 'var(--color-error-container)', color: 'var(--color-on-error-container)',
              fontSize: 14,
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <span>
              Your Pro period ended. Your records are all still here and readable — upgrade any
              time to get the Pro limits and the reduced fee back.
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 24 }}>
          <PlanCard
            name="Free"
            active={!isPro}
            current={!isPro}
            lines={[
              'Expense tracking, always',
              '1 workspace',
              '2 members per workspace',
              '3 invoices per month',
              '10 receipt scans per month',
              '7-day audit log',
            ]}
            footer={!isPro ? 'You are on this plan' : null}
          />

          <PlanCard
            name="Pro"
            active={isPro}
            current={isPro}
            lines={[
              'Everything in Free',
              'Unlimited workspaces and members',
              'Unlimited invoices and scans',
              'Full audit log history',
              'Reports and summaries',
              'Platform fee 2% to 0.8%',
            ]}
            footer={
              isPro && status.paidUntil
                ? `Active until ${new Date(status.paidUntil).toLocaleDateString()}`
                : null
            }
          />
        </div>

        {!isPro && (
          <section style={{ ...cardStyle, marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Sparkles size={18} style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <h2 style={{ fontSize: 17, margin: 0, color: 'var(--color-on-surface)' }}>
                Upgrade to Pro
              </h2>
            </div>

            <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--color-on-surface-variant)' }}>
              {selectedPrice === null
                ? 'Choose a currency to see the price. No recurring charge, nothing to cancel.'
                : `One payment of ${selectedPrice} covers ${status.upgrade?.months ?? 12} months. No recurring charge, nothing to cancel.`}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <TrendingDown size={16} style={{ color: 'var(--color-tertiary)' }} aria-hidden="true" />
              <span style={{ fontSize: 14, color: 'var(--color-on-surface)' }}>
                Your platform fee drops from 2% to 0.8% on every payment.
              </span>
            </div>

            <label
              htmlFor="plan-currency"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}
            >
              Pay in
            </label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <select
                id="plan-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{
                  padding: '10px 14px', borderRadius: 10,
                  border: '1.5px solid var(--color-outline-variant)',
                  background: 'var(--color-surface)', color: 'var(--color-on-surface)',
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, minWidth: 160,
                }}
              >
                {(status.upgrade?.currencies || PLAN_CURRENCIES.map((c) => ({ code: c.code, amount: null }))).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {PLAN_CURRENCIES.find((p) => p.code === c.code)?.name || c.code}
                    {typeof c.amount === 'number' && c.amount > 0 ? ` (${c.amount.toFixed(2)})` : ''}
                  </option>
                ))}
              </select>

              <Button type="button" disabled={busy || verifying} onClick={handleUpgrade}>
                <CreditCard size={16} aria-hidden="true" />
                {verifying ? 'Confirming payment...' : busy ? 'Opening checkout...' : selectedPrice === null ? 'Select a currency' : `Pay ${currency} ${selectedPrice} for Pro`}
              </Button>
            </div>

            <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
              African currencies are charged through Flutterwave, everything else through Stripe.
              Only the workspace owner can purchase a plan.
            </p>
          </section>
        )}

        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2 style={{ fontSize: 17, margin: '0 0 12px', color: 'var(--color-on-surface)' }}>
            This month
          </h2>
          <UsageRow
            label="Invoices"
            snapshot={usage.invoices}
            noun="invoices"
            onUpgrade={handleUpgrade}
            isPro={isPro}
          />
          <UsageRow
            label="Receipt scans"
            snapshot={usage.ocr}
            noun="scans"
            onUpgrade={handleUpgrade}
            isPro={isPro}
          />
          <p style={{ margin: '16px 0 0', fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
            Usage resets on the first of each month. Pro has no limits.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function UsageRow({ label, snapshot, noun, onUpgrade, isPro }) {
  if (!snapshot) return null;
  const { used = 0, limit, remaining } = snapshot;
  const unlimited = limit == null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: 'var(--color-on-surface)' }}>{label}</span>
        <span style={{ color: 'var(--color-on-surface-variant)' }}>
          {unlimited ? `${used} used — unlimited` : `${used} of ${limit} used`}
        </span>
      </div>
      <div
        style={{ height: 6, borderRadius: 999, background: 'var(--color-surface-container)', overflow: 'hidden' }}
        role="progressbar"
        aria-valuenow={unlimited ? 0 : used}
        aria-valuemin={0}
        aria-valuemax={unlimited ? used : limit}
        aria-label={`${label} used this month`}
      >
        <div
          style={{
            height: '100%',
            width: `${unlimited ? 100 : pct}%`,
            background: remaining === 0 ? 'var(--color-error)' : 'var(--color-primary)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {!unlimited && remaining === 0 && !isPro && (
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-error)' }}>
          You have used all {limit} {noun} this month.{' '}
          <button
            type="button"
            onClick={onUpgrade}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--color-primary)', fontWeight: 600, fontSize: 13, textDecoration: 'underline',
            }}
          >
            Upgrade to Pro
          </button>{' '}
          to remove this limit.
        </p>
      )}
    </div>
  );
}

function PlanCard({ name, lines, active, current, footer }) {
  return (
    <div
      style={{
        ...cardStyle,
        borderColor: active ? 'var(--color-primary)' : undefined,
        borderWidth: active ? '2px' : undefined,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <h2 style={{ fontSize: 17, margin: 0, color: 'var(--color-on-surface)' }}>{name}</h2>
        {current && (
          <span
            style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)',
            }}
          >
            Current
          </span>
        )}
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--color-on-surface-variant)' }}>
        {name === 'Free' ? 'Included with every account' : 'Pay once a year'}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {lines.map((line) => (
          <li key={line} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 14, color: 'var(--color-on-surface)' }}>
            <Check size={16} style={{ color: 'var(--color-tertiary)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {footer && (
        <p style={{ margin: '16px 0 0', fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{footer}</p>
      )}
    </div>
  );
}
