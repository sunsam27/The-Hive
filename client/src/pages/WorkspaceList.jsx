import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Users, X, ArrowRight } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { workspaceService } from '../services/workspaceService';

export default function WorkspaceList() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    workspaceService.list()
      .then((res) => setWorkspaces(res.data))
      .catch(() => showToast('Failed to load workspaces', 'error'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await workspaceService.create(form);
      setWorkspaces((prev) => [...prev, res.data]);
      setShowCreate(false);
      setForm({ name: '', description: '' });
      showToast('Workspace created', 'success');
    } catch {
      showToast('Failed to create workspace', 'error');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <AppShell><div className="wl-loading">Loading...</div></AppShell>;

  return (
    <AppShell>
      <div className="wl-page">
        <div className="wl-top">
          <div>
            <h1 className="wl-title">Workspaces</h1>
            <p className="wl-sub">Manage your workspaces and collaborate with clients.</p>
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={20} />
            New Workspace
          </Button>
        </div>

        {showCreate && (
          <div className="wl-create-card">
            <div className="wl-create-header">
              <h2>Create Workspace</h2>
              <button className="wl-close-btn" onClick={() => setShowCreate(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="wl-create-fields">
                <input
                  className="wl-input"
                  placeholder="Workspace name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <input
                  className="wl-input"
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="wl-create-actions">
                <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={creating || !form.name.trim()}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {workspaces.length > 0 ? (
          <div className="wl-grid">
            {workspaces.map((w) => (
              <Link key={w.id} to={`/workspaces/${w.id}`} className="wl-card">
                <div className="wl-card-icon">
                  <FolderKanban size={24} />
                </div>
                <div className="wl-card-body">
                  <h3 className="wl-card-name">{w.name}</h3>
                  {w.description && <p className="wl-card-desc">{w.description}</p>}
                </div>
                <div className="wl-card-footer">
                  <span className="wl-card-meta">
                    <Users size={14} />
                    {w.member_count ?? 1} member{(w.member_count ?? 1) !== 1 ? 's' : ''}
                  </span>
                  <span className="wl-card-arrow">
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="wl-empty">
            <div className="wl-empty-icon"><FolderKanban size={32} /></div>
            <h3>No workspaces yet</h3>
            <p>Create your first workspace to start tracking expenses.</p>
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus size={18} />
              New Workspace
            </Button>
          </div>
        )}
      </div>

      <style>{`
        .wl-page { padding: 4px 0; }
        .wl-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 32px;
        }
        .wl-title {
          font-size: 26px;
          font-weight: 700;
          color: var(--color-on-surface);
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }
        .wl-sub { font-size: 15px; color: var(--color-on-surface-variant); }

        .wl-create-card {
          background: var(--color-surface);
          border-radius: 16px;
          border: 1px solid var(--color-outline-variant);
          padding: 24px 28px;
          margin-bottom: 28px;
        }
        .wl-create-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .wl-create-header h2 {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-on-surface);
        }
        .wl-close-btn {
          background: none;
          border: none;
          color: var(--color-on-surface-variant);
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: background 0.15s ease;
        }
        .wl-close-btn:hover {
          background: var(--color-surface-container);
          color: var(--color-on-surface);
        }
        .wl-create-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        .wl-input {
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--color-outline-variant);
          background: var(--color-surface);
          color: var(--color-on-surface);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          transition: border-color 0.15s ease;
        }
        .wl-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
        }
        .wl-create-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .wl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .wl-card {
          background: var(--color-surface);
          border-radius: 16px;
          border: 1px solid var(--color-outline-variant);
          padding: 24px;
          text-decoration: none;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          display: flex;
          flex-direction: column;
        }
        .wl-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }
        .wl-card-icon {
          width: 44px;
          height: 44px;
          background: var(--color-primary-container);
          color: var(--color-primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .wl-card-body { flex: 1; margin-bottom: 16px; }
        .wl-card-name {
          font-size: 17px;
          font-weight: 700;
          color: var(--color-on-surface);
          margin-bottom: 4px;
          letter-spacing: -0.2px;
        }
        .wl-card-desc {
          font-size: 13px;
          color: var(--color-on-surface-variant);
          line-height: 1.5;
        }
        .wl-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid var(--color-outline-variant);
        }
        .wl-card-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--color-on-surface-variant);
        }
        .wl-card-arrow {
          color: var(--color-on-surface-variant);
          transition: transform 0.2s ease;
        }
        .wl-card:hover .wl-card-arrow {
          transform: translateX(4px);
          color: var(--color-primary);
        }

        .wl-empty {
          text-align: center;
          padding: 80px 20px;
        }
        .wl-empty-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          background: var(--color-primary-container);
          color: var(--color-primary);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wl-empty h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-on-surface);
          margin-bottom: 8px;
        }
        .wl-empty p {
          font-size: 14px;
          color: var(--color-on-surface-variant);
          margin-bottom: 24px;
        }
        .wl-loading {
          padding: 60px;
          text-align: center;
          color: var(--color-on-surface-variant);
          font-size: 15px;
        }
      `}</style>
    </AppShell>
  );
}
