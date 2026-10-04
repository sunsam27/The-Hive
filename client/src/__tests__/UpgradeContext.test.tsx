import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { UpgradeProvider } from '../context/UpgradeContext';

vi.mock('../services/billingService', () => ({
  planLimitDetails: vi.fn(() => null),
}));

vi.mock('../context/BillingContext', () => ({
  useBilling: () => ({ workspaceId: 'ws-1' }),
}));

// The prompt card tells the user where to go when it has no workspace to bill,
// so it needs the toast. Mocked here because this suite deliberately renders
// UpgradeProvider without the app's full provider stack.
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

/**
 * Regression test: UpgradeProvider renders UpgradePromptCard above <App />, and
 * that card calls useNavigate(). If a provider is ever moved outside the
 * router again, React throws during render and the entire app fails to mount,
 * which presents as a blank page in production rather than a visible error.
 */
function NavConsumer() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/target')}>go</button>;
}

describe('UpgradeProvider router placement', () => {
  it('renders a child that uses useNavigate without throwing', () => {
    expect(() =>
      render(
        <MemoryRouter>
          <UpgradeProvider>
            <NavConsumer />
          </UpgradeProvider>
        </MemoryRouter>
      )
    ).not.toThrow();

    expect(screen.getByRole('button', { name: 'go' })).toBeTruthy();
  });

  it('throws when the provider is rendered outside a router', () => {
    // Guards the assumption the test above relies on: if this ever stops
    // throwing, the test above has stopped proving anything.
    expect(() =>
      render(
        <UpgradeProvider>
          <NavConsumer />
        </UpgradeProvider>
      )
    ).toThrow();
  });
});
