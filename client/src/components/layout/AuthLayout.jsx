import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="auth-container">
      <Link to="/" className="back-to-home">← Back to home</Link>
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.svg" alt="The Hive" className="app-logo" />
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        </div>
        <div className="auth-content">
          {children}
        </div>
      </div>
      <style>{`
        .auth-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background: #ffffff;
          background-image: radial-gradient(circle at 20% 100%, var(--color-primary-container) 0%, transparent 60%);
          padding: 20px;
          --color-surface: #f8f8fa;
          --color-on-surface: hsl(240, 3%, 12%);
          --color-on-surface-variant: hsl(240, 2%, 48%);
          --color-outline-variant: hsl(240, 6%, 86%);
          --color-primary-container: hsl(210, 75%, 93%);
          --color-surface-container: hsl(240, 6%, 92%);
          --color-tertiary: hsl(160, 55%, 38%);
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          background: var(--color-surface);
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
        }
        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .app-logo {
          height: 40px;
          width: auto;
          display: block;
          margin: 0 auto 20px;
        }
        .auth-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: var(--color-on-surface);
          margin-bottom: 8px;
          letter-spacing: -0.3px;
        }
        .auth-subtitle {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 15px;
          color: var(--color-on-surface-variant);
        }
        .back-to-home {
          position: absolute;
          top: 24px;
          left: 24px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-on-surface-variant);
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .back-to-home:hover {
          color: var(--color-on-surface);
        }
        .auth-footer {
          text-align: center;
          margin-top: 24px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          color: var(--color-on-surface-variant);
        }
        .auth-footer a {
          color: var(--color-primary);
          text-decoration: none;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default AuthLayout;
