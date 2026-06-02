import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Receipt, 
  BarChart3, 
  LogOut, 
  User as UserIcon,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Workspaces', icon: <FolderKanban size={20} />, path: '/workspaces' },
    { name: 'All Expenses', icon: <Receipt size={20} />, path: '/expenses' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.svg" alt="The Hive" className="sidebar-logo-img" />
        <span className="brand-name">The Hive</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">
            <UserIcon size={16} />
          </div>
          <div className="user-info">
            <p className="user-name">{user?.name || 'User'}</p>
            <p className="user-role">{user?.role || 'Freelancer'}</p>
          </div>
        </div>
        <NavLink to="/change-password" className="nav-link change-password-link">
          <KeyRound size={16} />
          <span>Change Password</span>
        </NavLink>
        <button onClick={logout} className="logout-btn">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>

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
          padding: 16px 10px 20px;
          border-top: 1px solid var(--color-outline-variant);
        }
        .user-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          margin-bottom: 4px;
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
      `}</style>
    </aside>
  );
};

export default Sidebar;
