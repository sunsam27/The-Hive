import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';

vi.mock('../services/api', () => ({
  default: { get: vi.fn() },
  getFileUrl: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Ada', avatar_url: null }, logout: vi.fn() }),
}));

vi.mock('../context/BillingContext', () => ({
  useBilling: () => ({ workspaceId: 'ws-1', isPro: false, status: null, refresh: vi.fn() }),
}));

/**
 * Billing is nested under /workspaces. NavLink counts a path as active for all
 * deeper routes too, so without an explicit rule both links light up at once.
 * Only one nav item may carry the active class on any given route.
 */
function activeLabels(pathname) {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <ThemeProvider>
        <ToastProvider>
          <Sidebar />
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
  return screen
    .getAllByRole('link')
    .filter((el) => el.className.includes('active'))
    .map((el) => el.getAttribute('aria-label'))
    .filter((label) => label && label !== 'Change password');
}

function renderSidebar(pathname = '/') {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <ThemeProvider>
        <ToastProvider>
          <Sidebar />
        </ToastProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

function sidebarStyles() {
  const { container } = renderSidebar();
  const styleText = Array.from(document.querySelectorAll('style'))
    .map((el) => el.textContent || '')
    .join('\n');
  return { styleText, container };
}

describe('sidebar active state', () => {
  const cases = [
    ['/workspaces', 'Workspaces'],
    ['/workspaces/ws-1', 'Workspaces'],
    ['/workspaces/ws-1/billing', 'Plan & Billing'],
    ['/workspaces/ws-1/summary', 'Workspaces'],
    ['/dashboard', 'Dashboard'],
    ['/expenses', 'All Expenses'],
    ['/expenses/abc-123', 'All Expenses'],
    ['/invoices', 'My Invoices'],
    ['/invoices/new', 'My Invoices'],
    ['/settings/payouts', 'Payout Accounts'],
  ];

  it.each(cases)('%s highlights only %s', (pathname, expected) => {
    const labels = activeLabels(pathname);
    expect(labels).toEqual([expected]);
  });

  it('never highlights Workspaces and Plan & Billing together', () => {
    const labels = activeLabels('/workspaces/ws-1/billing');
    expect(labels).not.toContain('Workspaces');
    expect(labels).toHaveLength(1);
  });
});

/**
 * On a phone the sidebar used to be a fixed-height column with no scrollable
 * region, so anything past the fold - including Logout - was clipped away and
 * unreachable. The nav has to be the element that scrolls.
 */
describe('sidebar mobile scrolling', () => {
  it('makes the nav the scrollable region', () => {
    const { styleText } = sidebarStyles();
    const navBlock = styleText.match(/\.sidebar-nav\s*\{[^}]*\}/)?.[0] || '';
    expect(navBlock).toContain('overflow-y: auto');
    // min-height:0 is what allows the flex child to shrink and scroll at all.
    expect(navBlock).toContain('min-height: 0');
  });

  it('keeps the footer pinned and non-shrinking', () => {
    const { styleText } = sidebarStyles();
    const footerBlock = styleText.match(/\.sidebar-footer\s*\{[^}]*\}/)?.[0] || '';
    expect(footerBlock).toContain('flex: 0 0 auto');
  });

  it('does not let the column itself scroll', () => {
    const { styleText } = sidebarStyles();
    const sidebarBlock = styleText.match(/\.sidebar\s*\{[^}]*\}/)?.[0] || '';
    expect(sidebarBlock).toContain('overflow: hidden');
  });

  it('sizes the drawer to the visible viewport and caps its width', () => {
    const { styleText } = sidebarStyles();
    expect(styleText).toContain('height: 100dvh');
    expect(styleText).toMatch(/\.sidebar-mobile\s*\{[^}]*max-width: 82vw/);
  });

  it('slides the left drawer in from the left', () => {
    const { styleText } = sidebarStyles();
    const keyframes = styleText.match(/@keyframes sidebarSlideIn\s*\{[^@]*\}/)?.[0] || '';
    expect(keyframes).toContain('translateX(-100%)');
    // The old rule animated a left-hand drawer with slideInRight.
    const mobileBlock = styleText.match(/\.sidebar-mobile\s*\{[^}]*\}/)?.[0] || '';
    expect(mobileBlock).not.toContain('slideInRight');
  });

  it('renders logout and change password inside the sidebar', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: 'Logout' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Change password' })).toBeTruthy();
  });
});

/**
 * The nav icons were flat line glyphs. They now sit on a raised "plate" so they
 * read as tactile objects without leaving the teal palette.
 */
describe('sidebar icon treatment', () => {
  it('renders every nav icon inside a plate', () => {
    const { container } = renderSidebar();
    const links = container.querySelectorAll('.sidebar-nav a, .sidebar-nav .nav-link');
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link.querySelector('.nav-icon')).toBeTruthy();
    });
  });

  it('gives the plate a gradient, highlight and contact shadow', () => {
    const { styleText } = sidebarStyles();
    const plate = styleText.match(/\.nav-icon\s*\{[^}]*\}/)?.[0] || '';
    expect(plate).toContain('linear-gradient');
    // Top inner highlight is what sells the raised edge.
    expect(plate).toMatch(/inset 0 1px 0/);
    // Contact shadow grounds it on the surface.
    expect(plate).toMatch(/0 1px 2px/);
    expect(plate).toContain('--nav-plate-top');
    expect(plate).toContain('--nav-plate-bottom');
  });

  it('lifts the glyph off the plate so it is not printed on', () => {
    const { styleText } = sidebarStyles();
    const glyph = styleText.match(/\.nav-icon svg\s*\{[^}]*\}/)?.[0] || '';
    expect(glyph).toContain('drop-shadow');
  });

  it('recolours the plate on the active row', () => {
    const { styleText } = sidebarStyles();
    const active = styleText.match(/\.nav-link\.active \.nav-icon\s*\{[^}]*\}/)?.[0] || '';
    expect(active).toContain('--color-primary');
    expect(active).toContain('--color-on-primary');
  });

  it('defines separate plate colours for light and dark', () => {
    const { styleText } = sidebarStyles();
    const root = styleText.match(/:root\s*\{[^}]*--nav-plate-top[^}]*\}/)?.[0] || '';
    const dark = styleText.match(/\.dark\s*\{[^}]*--nav-plate-top[^}]*\}/)?.[0] || '';
    expect(root).toBeTruthy();
    expect(dark).toBeTruthy();
  });

  it('uses a smaller plate variant for the footer icons', () => {
    const { styleText } = sidebarStyles();
    const small = styleText.match(/\.nav-icon--sm\s*\{[^}]*\}/)?.[0] || '';
    const base = styleText.match(/\.nav-icon\s*\{[^}]*\}/)?.[0] || '';
    const baseSize = base.match(/width:\s*(\d+)px/)?.[1];
    const smallSize = small.match(/width:\s*(\d+)px/)?.[1];
    expect(Number(smallSize)).toBeLessThan(Number(baseSize));
  });
});
