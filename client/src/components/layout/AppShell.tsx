
import Sidebar from './Sidebar';

const AppShell = ({ children }) => {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" id="main-content" role="main" aria-label="Main content">
        <div className="content-container page-enter">
          {children}
        </div>
      </main>
      <style>{`
        .app-shell {
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
        @media (max-width: 768px) {
          .content-container {
            padding: 60px 16px 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default AppShell;
