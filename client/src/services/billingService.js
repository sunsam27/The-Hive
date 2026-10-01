import api from './api';

/** A plan limit was reached. The server answers 402 with the upgrade details. */
export function isPlanLimitError(err) {
  return err?.response?.status === 402;
}

export function planLimitDetails(err) {
  const body = err?.response?.data;
  if (!isPlanLimitError(err) || !body) return null;
  return {
    error: body.error,
    code: body.code,
    metric: body.metric,
    used: body.used,
    limit: body.limit,
    priceUsd: body.upgrade?.priceUsd,
  };
}

export const billingService = {
  listPlans() {
    return api.get('/billing/plans');
  },

  status(workspaceId) {
    return api.get('/billing/status', { params: { workspaceId } });
  },

  startCheckout(workspaceId, currency) {
    return api.post('/billing/checkout', { workspaceId, currency });
  },

  verifyCheckout(reference) {
    return api.get(`/billing/checkout/${reference}`);
  },
};
