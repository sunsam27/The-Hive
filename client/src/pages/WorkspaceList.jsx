import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Users, X, ArrowRight } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../hooks/useToast';
import { workspaceService } from '../services/workspaceService';

export default function WorkspaceList() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

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

  if (loading) return <AppShell>
    <div className="page page-enter">
      <div className="page-top">
        <div>
          <h1 className="page-title">Workspaces</h1>
          <p className="page-sub">Manage your workspaces and collaborate with clients.</p>
        </div>
      </div>
      <div className="grid-cards">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid-card">
            <Skeleton variant="card" style={{ height: 180 }} />
          </div>
        ))}
      </div>
    </div>
  </AppShell>;

  return (
    <AppShell>
      <div className="page page-enter">
        <div className="page-top">
          <div>
            <h1 className="page-title">Workspaces</h1>
            <p className="page-sub">Manage your workspaces and collaborate with clients.</p>
          </div>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={20} aria-hidden="true" />
            New Workspace
          </Button>
        </div>

        {showCreate && (
          <div className="card card-padded" style={{ marginBottom: 28 }}>
            <div className="overlay-header" style={{ padding: '0 0 20px' }}>
              <h2>Create Workspace</h2>
              <button className="overlay-close" onClick={() => setShowCreate(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="flex flex-col gap-12 mb-16">
                <input
                  className="field-input"
                  placeholder="Workspace name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  aria-label="Workspace name"
                />
                <input
                  className="field-input"
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  aria-label="Workspace description"
                />
              </div>
              <div className="flex justify-end gap-12">
                <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={creating || !form.name.trim()}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {workspaces.length > 0 ? (
          <div className="grid-cards">
            {workspaces.map((w) => (
              <Link key={w.id} to={`/workspaces/${w.id}`} className="grid-card" aria-label={`View ${w.name} workspace`}>
                <div className="grid-card-icon" aria-hidden="true">
                  <FolderKanban size={24} />
                </div>
                <div className="grid-card-body">
                  <h3 className="grid-card-name">{w.name}</h3>
                  {w.description && <p className="grid-card-desc">{w.description}</p>}
                </div>
                <div className="grid-card-footer">
                  <span className="grid-card-meta">
                    <Users size={14} aria-hidden="true" />
                    {w.member_count ?? 1} member{(w.member_count ?? 1) !== 1 ? 's' : ''}
                  </span>
                  <span className="grid-card-arrow" aria-hidden="true">
                    <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon"><FolderKanban size={32} /></div>
            <h3>No workspaces yet</h3>
            <p>Create your first workspace to start tracking expenses.</p>
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus size={18} aria-hidden="true" />
              New Workspace
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
