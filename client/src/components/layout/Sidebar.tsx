import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Receipt, 
  FileText,
  LogOut, 
  User as UserIcon,
  KeyRound,
  Menu,
  X,
  Landmark,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBilling } from '../../context/BillingContext';
import ProfileModal from './ProfileModal';
import { getFileUrl } from '../../services/api';
import ThemeToggle from '../ui/ThemeToggle';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { isPro, workspaceId } = useBilling();
  const location = useLocation();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarBlob, setAvatarBlob] = useState(null);
  const avatarBlobRef = useRef(null);

  useEffect(() => {
    if (!user?.avatar_url) { setAvatarBlob(null); return; }
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(getFileUrl(user.avatar_url), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => { if (!res.ok) throw new Error(); return res.blob(); })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        if (avatarBlobRef.current) URL.revokeObjectURL(avatarBlobRef.current);
        avatarBlobRef.current = url;
        setAvatarBlob(url);
      })
      .catch(() => setAvatarBlob(null));
    return () => {
      if (avatarBlobRef.current) {
        URL.revokeObjectURL(avatarBlobRef.current);
        avatarBlobRef.current = null;
      }
    };
  }, [user?.avatar_url]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = '';
      return undefined;
    }

    // Locking the page stops it scrolling behind the drawer. The drawer scrolls
    // its own nav, so this must not be relied on to reveal the footer.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={17} />, path: '/dashboard' },
    { name: 'Workspaces', icon: <FolderKanban size={17} />, path: '/workspaces' },
    { name: 'All Expenses', icon: <Receipt size={17} />, path: '/expenses' },
    { name: 'My Invoices', icon: <FileText size={17} />, path: '/invoices' },
    { name: 'Payout Accounts', icon: <Landmark size={17} />, path: '/settings/payouts' },
  ];

  const billingPath = workspaceId ? `/workspaces/${workspaceId}/billing` : '/workspaces';

  // Billing lives under /workspaces, and NavLink treats a path as active for
  // every deeper route too, so the Workspaces link would light up on the billing
  // page. Billing is the only sub-route with its own nav entry, so treat
  // everything else under a workspace as part of the Workspaces section.
  const isBillingRoute = /^\/workspaces\/[^/]+\/billing\/?$/.test(location.pathname);
  const onWorkspacesSection = /^\/workspaces(\/[^/]+)*\/?$/.test(location.pathname);

  const handleNavClick = () => setMobileOpen(false);

  const sidebarContent = (
    <>
      <div className="sidebar-brand">
        <img src="/finsyte-logo.png" alt="Finsyte" className="sidebar-logo-img" />
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) => {
              // Workspaces covers the list and a single workspace, but the
              // billing page has its own link, so only one of them is active.
              if (item.path === '/workspaces') {
                return `nav-link ${onWorkspacesSection && !isBillingRoute ? 'active' : ''}`;
              }
              return `nav-link ${isActive ? 'active' : ''}`;
            }}
            onClick={handleNavClick}
            aria-label={item.name}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.name}</span>
          </NavLink>
        ))}
        <NavLink
          to={billingPath}
          end
          className={({ isActive }) => `nav-link ${isActive || isBillingRoute ? 'active' : ''}`}
          onClick={handleNavClick}
          aria-label="Plan & Billing"
        >
          <span className="nav-icon" aria-hidden="true"><Sparkles size={17} /></span>
          <span className="nav-label">Plan &amp; Billing</span>
          {!isPro && (
            <span className="plan-badge">Free</span>
          )}
          {isPro && (
            <span className="plan-badge pro">Pro</span>
          )}
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <ThemeToggle />
        </div>
        <div className="user-profile" onClick={() => { setProfileModalOpen(true); handleNavClick(); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfileModalOpen(true); } }} aria-label="Open profile">
          <div className="user-avatar">
            {user?.avatar_url && avatarBlob ? (
              <img src={avatarBlob} alt="" className="sidebar-avatar-img" />
            ) : (
              <UserIcon size={16} aria-hidden="true" />
            )}
          </div>
          <div className="user-info">
            <p className="user-name">{user?.name || 'User'}</p>
            <p className="user-role">{user?.role || 'Freelancer'}</p>
          </div>
        </div>
        <NavLink to="/change-password" className="nav-link" onClick={handleNavClick} aria-label="Change password">
          <span className="nav-icon nav-icon--sm" aria-hidden="true"><KeyRound size={13} /></span>
          <span>Change Password</span>
        </NavLink>
        <button onClick={() => { logout(); handleNavClick(); }} className="logout-btn" aria-label="Logout">
          <span className="nav-icon nav-icon--sm" aria-hidden="true"><LogOut size={13} /></span>
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Desktop sidebar */}
      <aside className="sidebar sidebar-desktop">
        {sidebarContent}
      </aside>

      {/* Mobile overlay + sidebar */}
      {mobileOpen && (
        <div className="sidebar-mobile-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true">
          <aside className="sidebar sidebar-mobile" onClick={(e) => e.stopPropagation()}>
            {sidebarContent}
          </aside>
        </div>
      )}

      <style>{`
        /* Plate colours are defined here rather than in tokens.css so the
           treatment stays scoped to the sidebar. */
        :root {
          --nav-plate-top: hsl(183, 62%, 91%);
          --nav-plate-bottom: hsl(183, 52%, 80%);
          --nav-glyph: hsl(183, 88%, 26%);
          --nav-active-bottom: hsl(183, 92%, 33%);
        }
        .dark {
          --nav-plate-top: hsl(183, 44%, 29%);
          --nav-plate-bottom: hsl(183, 50%, 20%);
          --nav-glyph: hsl(182, 70%, 68%);
          --nav-active-bottom: hsl(183, 62%, 44%);
        }

        .sidebar {
          width: 260px;
          height: 100vh;
          /* dvh tracks the visible area when mobile browser chrome collapses,
             so the drawer never overflows the screen it is drawn over. */
          height: 100dvh;
          background: var(--color-surface);
          border-right: 1px solid var(--color-outline-variant);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          z-index: 100;
          /* The column itself never scrolls: .sidebar-nav scrolls instead so
             the footer (profile, change password, logout) stays reachable. */
          overflow: hidden;
        }
        .sidebar-brand {
          padding: 28px 20px 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sidebar-logo-img {
          height: 28px;
          width: auto;
        }
        .sidebar-nav {
          flex: 1;
          /* min-height:0 lets this actually shrink inside the flex column;
             without it the default min-content size keeps the whole column
             taller than the viewport and the footer is pushed off-screen. */
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          padding: 0 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 8px;
          text-decoration: none;
          color: var(--color-on-surface-variant);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        .nav-link:hover {
          background: var(--color-surface-container);
          color: var(--color-on-surface);
        }
        .nav-link.active {
          background: var(--color-primary-container);
          color: var(--color-on-primary-container);
          font-weight: 600;
        }
        /* Soft 3D icon plates: a raised rounded tile with a vertical gradient,
           a top inner highlight and a contact shadow, so the glyph reads as
           sitting on a physical surface rather than being drawn flat. */
        .nav-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          flex: 0 0 auto;
          border-radius: 8px;
          background: linear-gradient(
            180deg,
            var(--nav-plate-top) 0%,
            var(--nav-plate-bottom) 100%
          );
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.55),
            inset 0 -1px 1px rgba(0, 0, 0, 0.08);
          color: var(--nav-glyph);
          transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
        }
        /* Lifts the glyph off the plate so it does not look printed on. */
        .nav-icon svg {
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.22));
        }
        /* The active row is the focus, so its plate takes the full brand
           colour instead of the muted default. */
        .nav-link.active .nav-icon {
          background: linear-gradient(
            180deg,
            var(--color-primary) 0%,
            var(--nav-active-bottom) 100%
          );
          color: var(--color-on-primary);
          box-shadow:
            0 2px 4px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.35),
            inset 0 -1px 1px rgba(0, 0, 0, 0.12);
        }
        .nav-link.active .nav-icon svg {
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
        }
        .nav-icon--sm {
          width: 22px;
          height: 22px;
          border-radius: 7px;
        }
        .nav-icon--sm svg {
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.18));
        }
        .plan-badge {
          margin-left: auto;
          padding: 2px 8px;
          border-radius: 999px;
          background: var(--color-surface-container);
          color: var(--color-on-surface-variant);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .plan-badge.pro {
          background: var(--color-primary);
          color: var(--color-on-primary);
        }
        .sidebar-footer {
          flex: 0 0 auto;
          padding: 12px 10px calc(20px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid var(--color-outline-variant);
          background: var(--color-surface);
        }
        .sidebar-footer-row {
          display: flex;
          justify-content: flex-end;
          padding: 0 14px 8px;
        }
        .user-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          margin-bottom: 4px;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.15s ease;
        }
        .user-profile:hover {
          background: var(--color-surface-container);
        }
        .user-avatar {
          width: 32px;
          height: 32px;
          background: var(--color-secondary-container);
          color: var(--color-on-secondary-container);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }
        .user-info {
          flex: 1;
          min-width: 0;
        }
        .user-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-on-surface);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .user-role {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          color: var(--color-on-surface-variant);
          text-transform: capitalize;
        }
        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 14px;
          background: transparent;
          border: none;
          color: var(--color-on-surface-variant);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.15s ease;
        }
        .logout-btn:hover {
          background: var(--color-error-container);
          color: var(--color-on-error-container);
        }
        /* Tint the plate with the row so the hover reads as one object. */
        .logout-btn:hover .nav-icon {
          background: linear-gradient(
            180deg,
            var(--color-error-container) 0%,
            var(--color-error-container) 100%
          );
          color: var(--color-error);
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.35);
        }
        .sidebar-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Hamburger (hidden on desktop) */
        .sidebar-hamburger {
          display: none;
          position: fixed;
          top: 12px;
          left: 12px;
          z-index: 200;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--color-surface);
          border: 1px solid var(--color-outline-variant);
          color: var(--color-on-surface);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .sidebar-hamburger:hover {
          background: var(--color-surface-container);
        }

        /* Mobile overlay */
        .sidebar-mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 150;
          animation: fadeIn 0.2s ease-out;
        }

        /* Hamburger icon transition */
        .sidebar-hamburger svg {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sidebar-hamburger[aria-expanded="true"] svg {
          transform: rotate(90deg);
        }

        @media (max-width: 768px) {
          .sidebar-desktop {
            display: none;
          }
          .sidebar-hamburger {
            display: flex;
          }
          .sidebar-mobile-overlay {
            display: block;
          }
          .sidebar-mobile {
            position: fixed;
            left: 0;
            top: 0;
            height: 100vh;
            height: 100dvh;
            /* Leave room on narrow phones so the drawer never covers the
               whole screen and traps the content behind it. */
            max-width: 82vw;
            z-index: 160;
            display: flex;
            flex-direction: column;
            /* Scrolling must happen on .sidebar-nav, not the overlay. */
            overscroll-behavior: contain;
            animation: sidebarSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 8px 0 24px rgba(0, 0, 0, 0.16);
          }
        }

        @keyframes sidebarSlideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  );
};

export default Sidebar;
