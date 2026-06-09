import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockUser = { id: '1', name: 'Test', email: 'test@example.com' };

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const { useAuth } = await import('../hooks/useAuth');

import AuthGuard from '../components/auth/AuthGuard';

beforeEach(() => {
  vi.clearAllMocks();
});

function renderGuard(user: any, loading = false, initialRoute = '/dashboard') {
  (useAuth as any).mockReturnValue({ user, loading });

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <div>Protected Content</div>
            </AuthGuard>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthGuard', () => {
  it('renders children when user is authenticated', () => {
    renderGuard(mockUser, false);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    renderGuard(null, false);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    renderGuard(null, true);
    expect(document.querySelector('.auth-loading-screen')).toBeInTheDocument();
  });
});
