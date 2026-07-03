import { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Receipt, 
  FileText,
  LogOut, 
  User as UserIcon,
  KeyRound,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProfileModal from './ProfileModal';
import { getFileUrl } from '../../services/api';
import ThemeToggle from '../ui/ThemeToggle';

const Sidebar = () => {
  const { user, logout } = useAuth();
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
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [mobileOpen]);

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Workspaces', icon: <FolderKanban size={20} />, path: '/workspaces' },
    { name: 'All Expenses', icon: <Receipt size={20} />, path: '/expenses' },
    { name: 'My Receipts', icon: <FileText size={20} />, path: '/invoices' },
  ];

  const handleNavClick = () => setMobileOpen(false);

  const sidebarContent = (
    <>
      <div className="sidebar-brand">
        <img src="/logo.svg" alt="The Hive" className="sidebar-logo-img" />
        <span className="brand-name">The Hive</span>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={handleNavClick}
            aria-label={item.name}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.name}</span>
          </NavLink>
        ))}
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
          <KeyRound size={16} aria-hidden="true" />
          <span>Change Password</span>
        </NavLink>
        <button onClick={() => { logout(); handleNavClick(); }} className="logout-btn" aria-label="Logout">
          <LogOut size={16} aria-hidden="true" />
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
        .sidebar {
          width: 260px;
          height: 100vh;
          background: var(--color-surface);
          border-right: 1px solid var(--color-outline-variant);
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          z-index: 100;
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
        .brand-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--color-on-surface);
          letter-spacing: -0.3px;
        }
        .sidebar-nav {
          flex: 1;
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
        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
        }
        .sidebar-footer {
          padding: 12px 10px 20px;
          border-top: 1px solid var(--color-outline-variant);
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
            z-index: 160;
            animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
        }
      `}</style>
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  );
};

export default Sidebar;
