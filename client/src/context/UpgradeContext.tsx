import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBilling } from '../context/BillingContext';
import { useToast } from '../hooks/useToast';
import { planLimitDetails } from '../services/billingService';

const UpgradeContext = createContext(null);

const METRIC_LABEL = {
  invoices: 'invoices',
  ocr: 'receipt scans',
};

export function UpgradeProvider({ children }) {
  const [prompt, setPrompt] = useState(null);

  // Pass the workspace the limit was hit in. Without it the prompt falls back
  // to whatever workspace was last billed, which is usually none, and the CTA
  // ends up navigating to the page the user is already on.
  const showUpgrade = useCallback((err, workspaceId) => {
    const details = planLimitDetails(err);
    if (details) setPrompt({ ...details, workspaceId: workspaceId ?? null });
  }, []);

  return (
    <UpgradeContext.Provider value={{ showUpgrade, prompt, dismiss: () => setPrompt(null) }}>
      {children}
      <UpgradePromptCard />
    </UpgradeContext.Provider>
  );
}

export const useUpgrade = () => useContext(UpgradeContext);

/**
 * Shown when the server rejects a write with 402. It links to the billing page
 * rather than handling the upgrade inline, so there is one place to pay from.
 */
function UpgradePromptCard() {
  const { prompt, dismiss } = useUpgrade();
  const navigate = useNavigate();
  const { workspaceId } = useBilling();
  const { showToast } = useToast();

  useEffect(() => {
    if (!prompt) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [prompt, dismiss]);

  if (!prompt) return null;

  const label = METRIC_LABEL[prompt.metric] || 'items';
  // Prefer the workspace the limit was actually hit in, then the one already
  // selected, and only then fall back to the list.
  const target = prompt.workspaceId || workspaceId;
  const hasTarget = Boolean(target);

  function goToUpgrade() {
    dismiss();
    if (hasTarget) {
      navigate(`/workspaces/${target}/billing`);
      return;
    }
    // Never close and silently stay put: say why we are sending them here.
    showToast('Open a workspace, then choose Plan & billing to upgrade.', 'info');
    navigate('/workspaces');
  }

  return (
    <div className="upgrade-overlay" role="presentation" onClick={dismiss}>
      <div
        className="upgrade-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="upgrade-close" onClick={dismiss} aria-label="Close">
          <X size={16} />
        </button>

        <span className="upgrade-badge">
          <Sparkles size={14} aria-hidden="true" /> Pro
        </span>

        <h2 id="upgrade-title" className="upgrade-title">{prompt.error}</h2>
        <p className="upgrade-body">
          {prompt.used != null && prompt.limit != null ? (
            <>You have used {prompt.used} of {prompt.limit} {label} this month. </>
          ) : (
            <>This is a Pro feature. </>
          )}
          Pro also lowers your platform fee from 2% to 0.8%.
        </p>

        <div className="upgrade-actions">
          <button
            type="button"
            className="upgrade-cta"
            onClick={goToUpgrade}
          >
            Upgrade to Pro <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button type="button" className="upgrade-dismiss" onClick={dismiss}>
            Not now
          </button>
        </div>

        <style>{`
          .upgrade-overlay {
            position: fixed;
            inset: 0;
            z-index: 300;
            background: rgba(0, 0, 0, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.15s ease-out;
          }
          .upgrade-card {
            position: relative;
            width: 100%;
            max-width: 420px;
            background: var(--color-surface);
            border: 1px solid var(--color-outline-variant);
            border-radius: 16px;
            padding: 28px 24px 24px;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.24);
            animation: slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .upgrade-close {
            position: absolute;
            top: 14px;
            right: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            border: none;
            background: transparent;
            color: var(--color-on-surface-variant);
            cursor: pointer;
          }
          .upgrade-close:hover {
            background: var(--color-surface-container);
          }
          .upgrade-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            background: var(--color-primary-container);
            color: var(--color-on-primary-container);
            font-family: 'Space Grotesk', sans-serif;
            font-size: 12px;
            font-weight: 600;
          }
          .upgrade-title {
            margin: 14px 0 6px;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 19px;
            line-height: 1.3;
            color: var(--color-on-surface);
          }
          .upgrade-body {
            margin: 0;
            font-size: 14px;
            line-height: 1.55;
            color: var(--color-on-surface-variant);
          }
          .upgrade-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 20px;
          }
          .upgrade-cta {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 11px 16px;
            border: none;
            border-radius: 10px;
            background: var(--color-primary);
            color: var(--color-on-primary);
            font-family: 'Space Grotesk', sans-serif;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          }
          .upgrade-cta:hover {
            background: var(--color-primary);
            filter: brightness(1.08);
          }
          .upgrade-dismiss {
            padding: 9px 16px;
            border: 1.5px solid var(--color-outline-variant);
            border-radius: 10px;
            background: transparent;
            color: var(--color-on-surface-variant);
            font-family: 'Space Grotesk', sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          }
          .upgrade-dismiss:hover {
            background: var(--color-surface-container);
          }
        `}</style>
      </div>
    </div>
  );
}
