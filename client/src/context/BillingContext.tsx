import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { billingService } from '../services/billingService';
import { useAuth } from './AuthContext';

const BillingContext = createContext(null);

const EMPTY_USAGE = {
  invoices: { metric: 'invoices', used: 0, limit: null, remaining: null },
  ocr: { metric: 'ocr', used: 0, limit: null, remaining: null },
};

const EMPTY_STATUS = {
  plan: 'free',
  label: 'Free',
  lapsed: false,
  paidUntil: null,
  feeRate: 0.02,
  feeMinimum: 1,
  limits: {},
  usage: EMPTY_USAGE,
  upgrade: { plan: 'pro', priceUsd: 39, months: 12 },
};

export function BillingProvider({ children }) {
  const { token, user } = useAuth();
  const [status, setStatus] = useState(EMPTY_STATUS);
  const [workspaceId, setWorkspaceId] = useState(() => localStorage.getItem('billing_workspace') || null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (id) => {
    const target = id || workspaceId;
    if (!target) return null;
    try {
      const res = await billingService.status(target);
      setStatus(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!token || !user) return;
    if (!workspaceId) {
      const first = user.workspace_id || user.workspaceId || null;
      if (first) {
        localStorage.setItem('billing_workspace', first);
        setWorkspaceId(first);
      }
    }
  }, [token, user, workspaceId]);

  useEffect(() => {
    if (!token || !workspaceId) return;
    let active = true;
    setLoading(true);
    billingService
      .status(workspaceId)
      .then((res) => { if (active) setStatus(res.data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, workspaceId]);

  const selectWorkspace = useCallback((id) => {
    if (!id) return;
    localStorage.setItem('billing_workspace', id);
    setWorkspaceId(id);
  }, []);

  const value = useMemo(
    () => ({
      status,
      loading,
      workspaceId,
      isPro: status.plan === 'pro',
      isLapsed: status.lapsed,
      priceUsd: status.upgrade?.priceUsd ?? 39,
      setStatus,
      selectWorkspace,
      refresh,
    }),
    [status, loading, workspaceId, selectWorkspace, refresh]
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
};
