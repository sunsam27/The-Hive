import React from 'react';
import Sidebar from './Sidebar';

const AppShell = ({ children }) => {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="content-container">
          {children}
        </div>
      </main>
      <style>{`
        .app-shell {
          --color-background: hsl(240, 8%, 95%);
          --color-surface: hsl(0, 0%, 100%);
          --color-on-surface: hsl(240, 3%, 12%);
          --color-on-surface-variant: hsl(240, 2%, 48%);
          --color-outline: hsl(240, 4%, 72%);
          --color-outline-variant: hsl(240, 6%, 86%);
          --color-primary: hsl(210, 100%, 48%);
          --color-on-primary: hsl(0, 0%, 100%);
          --color-primary-container: hsl(210, 75%, 93%);
          --color-on-primary-container: hsl(210, 100%, 38%);
          --color-secondary: hsl(240, 2%, 48%);
          --color-secondary-container: hsl(240, 10%, 90%);
          --color-tertiary: hsl(160, 55%, 38%);
          --color-tertiary-container: hsl(160, 50%, 88%);
          --color-error: hsl(0, 72%, 50%);
          --color-error-container: hsl(0, 75%, 93%);
          --color-surface-container: hsl(240, 6%, 92%);
          --color-surface-container-low: hsl(240, 8%, 95%);
          --color-secondary-container: hsl(240, 10%, 90%);
          --color-on-secondary-container: hsl(240, 3%, 35%);
          --color-error-container: hsl(0, 75%, 93%);
          --color-on-error-container: hsl(0, 70%, 35%);
          --color-on-secondary: hsl(0, 0%, 100%);
          --color-inverse-surface: hsl(240, 3%, 18%);
          --color-inverse-on-surface: hsl(240, 8%, 95%);
          display: flex;
          min-height: 100vh;
          background: var(--color-background);
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .content-container {
          padding: 40px;
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }
      `}</style>
    </div>
  );
};

export default AppShell;
