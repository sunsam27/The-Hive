import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, Receipt, BarChart3, UserPlus, MoreVertical, Plus, ArrowLeft, X, Eye, Settings, Trash2, Shield } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';
import NewExpenseModal from '../components/upload/NewExpenseModal';
import { workspaceService } from '../services/workspaceService';
import { expenseService } from '../services/expenseService';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';

const tabs = [
  { id: 'expenses', label: 'Expenses', icon: <Receipt size={18} /> },
  { id: 'members', label: 'Members', icon: <Users size={18} /> },
  { id: 'summary', label: 'Summary', icon: <BarChart3 size={18} /> },
];

export default function WorkspaceView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [menuMember, setMenuMember] = useState(null);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const { showToast } = useToast();

  function fetchExpenses() {
    setExpensesLoading(true);
    expenseService.list({ workspaceId: id })
      .then((res) => setExpenses(res.data.data))
      .catch((err) => { showToast(err?.response?.data?.error || 'Failed to load'); })
      .finally(() => setExpensesLoading(false));
  }

  useEffect(() => {
    if (!id) return;
    fetchExpenses();
  }, [id]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteError('');
    setInviting(true);
    try {
      await workspaceService.addMember(id, inviteEmail, inviteRole);
      setShowInvite(false);
      setInviteEmail('');
      setInviteRole('client');
      setInviteError('');
      loadWorkspace();
    } catch (err) {
      setInviteError(err?.response?.data?.error || err?.message || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  }

  async function loadWorkspace() {
    try {
      const res = await workspaceService.getById(id);
      setWorkspace(res.data);
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <AppShell><div className="loading-state">Loading...</div></AppShell>;
  if (!workspace) return <AppShell><div className="loading-state">Workspace not found</div></AppShell>;

  return (
    <AppShell>
        <div className="page">
        <div className="page-top page-top--start">
          <div>
            <Link to="/workspaces" className="back-link">
              <ArrowLeft size={18} />
              Workspaces
            </Link>
            <h1 className="page-title">{workspace.name}</h1>
            {workspace.description && <p className="page-sub">{workspace.description}</p>}
          </div>
          <div className="page-actions">
            <Button variant="secondary" size="md" onClick={() => { setSettingsName(workspace.name || ''); setSettingsDesc(workspace.description || ''); setShowSettings(true); }}>
              <Settings size={18} />
              Settings
            </Button>
            <Button variant="secondary" size="md" onClick={() => setShowInvite(true)}>
              <UserPlus size={18} />
              Invite
            </Button>
            <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
              <Plus size={18} />
              Add Expense
            </Button>
          </div>
        </div>

        <div className="tabs-bar">
          {tabs.map((tab) => {
            const isSummary = tab.id === 'summary';
            const content = (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
            if (isSummary) {
              return (
                <Link
                  key={tab.id}
                  to={`/workspaces/${id}/summary`}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  style={{ textDecoration: 'none' }}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              );
            }
            return content;
          })}
        </div>

        <div className="tab-content">
          {activeTab === 'expenses' && (
            <div>
              {expensesLoading ? (
                <div className="loading-state">Loading expenses...</div>
              ) : expenses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Receipt size={24} /></div>
                  <h3>No expenses yet</h3>
                  <p>Upload your first receipt to start tracking.</p>
                  <Button variant="primary" style={{ marginTop: '16px' }} onClick={() => setIsModalOpen(true)}>
                    Get Started
                  </Button>
                </div>
              ) : (
                <div className="data-row-list">
                  <div className="data-row-header">
                    <span>Date</span>
                    <span className="data-row-col--wide">Merchant</span>
                    <span>Amount</span>
                    <span>Status</span>
                    <span></span>
                  </div>
                  {expenses.map((e) => (
                    <Link key={e.id} to={`/expenses/${e.id}`} className="data-row-item">
                      <span className="data-row-col--date">{e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                      <span className="data-row-col--wide data-row-col--merchant">{e.merchant || '—'}</span>
                      <span className="data-row-col--amount">{e.currency || 'USD'} ${(parseFloat(e.amount) || 0).toFixed(2)}</span>
                      <span>
                        <span className={`badge badge--${e.status}`}>{e.status}</span>
                      </span>
                      <span><Eye size={16} /></span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="members-list">
              {workspace.members?.length > 0 ? (
                workspace.members.map((m, i) => {
                  const isOwner = m.id === workspace.owner_id;
                  const isSelf = m.id === user?.id;
                  const canManage = user?.id === workspace.owner_id || workspace.members.find((mm) => mm.id === user?.id)?.role === 'admin';
                  return (
                    <div key={i} className="member-item">
                      <div className={`member-avatar ${m.role === 'client' ? 'member-avatar--client' : ''}`}>
                        {m.name ? m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
                      </div>
                      <div className="member-info">
                        <p className="member-name">{m.name}{isOwner ? ' (Owner)' : isSelf ? ' (You)' : ''}</p>
                        <p className="member-email">{m.email}</p>
                      </div>
                      <div className="member-role-badge">{m.role}</div>
                      {canManage && !isOwner && (
                        <div className="member-menu-wrap">
                          <Button variant="ghost" size="sm" onClick={() => setMenuMember(menuMember === m.id ? null : m.id)}>
                            <MoreVertical size={16} />
                          </Button>
                          {menuMember === m.id && (
                            <div className="member-menu">
                              <button className="member-menu-item" onClick={async () => {
                                try {
                                  await workspaceService.updateMemberRole(id, m.id, m.role === 'admin' ? 'member' : 'admin');
                                  showToast('Role updated', 'success');
                                  setMenuMember(null);
                                  loadWorkspace();
                                } catch (err) {
                                  showToast(err?.response?.data?.error || 'Failed to update role', 'error');
                                }
                              }}>
                                <Shield size={14} />
                                {m.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                              </button>
                              <button className="member-menu-item member-menu-item--danger" onClick={() => { setRemoveConfirm(m); setMenuMember(null); }}>
                                <Trash2 size={14} />
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon"><Users size={24} /></div>
                  <h3>No members yet</h3>
                  <p>Invite clients or team members to this workspace.</p>
                  <Button variant="primary" style={{ marginTop: '16px' }} onClick={() => setShowInvite(true)}>
                    <UserPlus size={18} />
                    Invite Members
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showInvite && (
        <div className="overlay-backdrop" onClick={() => setShowInvite(false)}>
          <div className="overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h2>Invite Member</h2>
              <button className="overlay-close" onClick={() => setShowInvite(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="overlay-body">
                {inviteError && <div className="overlay-error">{inviteError}</div>}
                <div className="form-field">
                  <label>Email Address</label>
                  <input
                    className="field-input"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Role</label>
                  <select className="field-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                    <option value="member">Member</option>
                    <option value="client">Client</option>
                  </select>
                </div>
              </div>
              <div className="overlay-footer">
                <Button variant="ghost" type="button" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettings && (
        <Modal isOpen={true} onClose={() => setShowSettings(false)} title="Workspace Settings">
          <form onSubmit={async (e) => {
            e.preventDefault();
            setSavingSettings(true);
            try {
              await workspaceService.updateWorkspace(id, { name: settingsName.trim(), description: settingsDesc.trim() });
              showToast('Workspace updated', 'success');
              setShowSettings(false);
              const res = await workspaceService.getById(id);
              setWorkspace(res.data);
            } catch (err) {
              showToast(err?.response?.data?.error || 'Failed to update', 'error');
            } finally {
              setSavingSettings(false);
            }
          }}>
            <div className="overlay-body">
              <div className="form-field">
                <label>Name</label>
                <input className="field-input" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Description</label>
                <textarea className="field-input" rows={3} value={settingsDesc} onChange={(e) => setSettingsDesc(e.target.value)} />
              </div>
            </div>
            <div className="overlay-footer">
              <Button variant="ghost" type="button" onClick={() => setShowSettings(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={savingSettings || !settingsName.trim()}>
                {savingSettings ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <NewExpenseModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); fetchExpenses(); }} workspaceId={id} />

      {removeConfirm && (
        <Modal isOpen={true} onClose={() => setRemoveConfirm(null)} title="Remove Member">
          <p style={{ marginBottom: 20, color: 'var(--color-on-surface-variant)', fontSize: 14, lineHeight: 1.6 }}>
            Are you sure you want to remove <strong>{removeConfirm.name}</strong> from this workspace?
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="ghost" onClick={() => setRemoveConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={async () => {
              try {
                await workspaceService.removeMember(id, removeConfirm.id);
                showToast('Member removed', 'success');
                setRemoveConfirm(null);
                loadWorkspace();
              } catch (err) {
                showToast(err?.response?.data?.error || 'Failed to remove member', 'error');
                setRemoveConfirm(null);
              }
            }}>
              Remove
            </Button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
