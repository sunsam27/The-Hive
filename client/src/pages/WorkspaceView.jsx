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

  if (loading) return <AppShell><div className="wv-loading">Loading...</div></AppShell>;
  if (!workspace) return <AppShell><div className="wv-loading">Workspace not found</div></AppShell>;

  return (
    <AppShell>
      <div className="wv-page">
        <div className="wv-header">
          <div>
            <Link to="/workspaces" className="wv-back">
              <ArrowLeft size={18} />
              Workspaces
            </Link>
            <h1 className="wv-title">{workspace.name}</h1>
            {workspace.description && <p className="wv-desc">{workspace.description}</p>}
          </div>
          <div className="wv-actions">
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

        <div className="wv-tabs">
          {tabs.map((tab) => {
            const isSummary = tab.id === 'summary';
            const content = (
              <button
                key={tab.id}
                className={`wv-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
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
                  className={`wv-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
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

        <div className="wv-tab-content">
          {activeTab === 'expenses' && (
            <div className="wv-expenses">
              {expensesLoading ? (
                <div className="wv-loading" style={{ padding: '40px' }}>Loading expenses...</div>
              ) : expenses.length === 0 ? (
                <div className="wv-empty">
                  <Receipt size={48} className="wv-empty-icon" />
                  <h3>No expenses yet</h3>
                  <p>Upload your first receipt to start tracking.</p>
                  <Button variant="primary" style={{ marginTop: '16px' }} onClick={() => setIsModalOpen(true)}>
                    Get Started
                  </Button>
                </div>
              ) : (
                <div className="wv-expense-list">
                  <div className="wv-expense-header">
                    <span>Date</span>
                    <span className="wv-exp-col-merchant">Merchant</span>
                    <span>Amount</span>
                    <span>Status</span>
                    <span></span>
                  </div>
                  {expenses.map((e) => (
                    <Link key={e.id} to={`/expenses/${e.id}`} className="wv-expense-row">
                      <span className="wv-exp-cell-date">{e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                      <span className="wv-exp-col-merchant wv-exp-cell-merchant">{e.merchant || '—'}</span>
                      <span className="wv-exp-cell-amount">{e.currency || 'USD'} ${(parseFloat(e.amount) || 0).toFixed(2)}</span>
                      <span>
                        <span className={`wv-exp-pill wv-exp-pill--${e.status}`}>{e.status}</span>
                      </span>
                      <span><Eye size={16} /></span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="wv-members">
              {workspace.members?.length > 0 ? (
                workspace.members.map((m, i) => {
                  const isOwner = m.id === workspace.owner_id;
                  const isSelf = m.id === user?.id;
                  const canManage = user?.id === workspace.owner_id || workspace.members.find((mm) => mm.id === user?.id)?.role === 'admin';
                  return (
                    <div key={i} className="wv-member-item">
                      <div className={`wv-member-avatar ${m.role === 'client' ? 'client' : ''}`}>
                        {m.name ? m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
                      </div>
                      <div className="wv-member-info">
                        <p className="wv-member-name">{m.name}{isOwner ? ' (Owner)' : isSelf ? ' (You)' : ''}</p>
                        <p className="wv-member-email">{m.email}</p>
                      </div>
                      <div className="wv-member-role">{m.role}</div>
                      {canManage && !isOwner && (
                        <div className="wv-member-menu-wrap">
                          <Button variant="ghost" size="sm" onClick={() => setMenuMember(menuMember === m.id ? null : m.id)}>
                            <MoreVertical size={16} />
                          </Button>
                          {menuMember === m.id && (
                            <div className="wv-member-menu">
                              <button className="wv-menu-item" onClick={async () => {
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
                              <button className="wv-menu-item wv-menu-item-danger" onClick={() => { setRemoveConfirm(m); setMenuMember(null); }}>
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
                <div className="wv-empty">
                  <Users size={48} className="wv-empty-icon" />
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
        <div className="wv-backdrop" onClick={() => setShowInvite(false)}>
          <div className="wv-invite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wv-invite-header">
              <h2>Invite Member</h2>
              <button className="wv-invite-close" onClick={() => setShowInvite(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="wv-invite-body">
                {inviteError && <div className="wv-invite-error">{inviteError}</div>}
                <div className="wv-invite-field">
                  <label>Email Address</label>
                  <input
                    className="wv-input"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                    required
                  />
                </div>
                <div className="wv-invite-field">
                  <label>Role</label>
                  <select className="wv-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                    <option value="member">Member</option>
                    <option value="client">Client</option>
                  </select>
                </div>
              </div>
              <div className="wv-invite-footer">
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
            <div className="wv-invite-body">
              <div className="wv-invite-field">
                <label>Name</label>
                <input className="wv-input" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} required />
              </div>
              <div className="wv-invite-field">
                <label>Description</label>
                <textarea className="wv-input" rows={3} value={settingsDesc} onChange={(e) => setSettingsDesc(e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="wv-invite-footer">
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

      <style>{`
        .wv-page { padding: 4px 0; }
        .wv-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
        }
        .wv-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-on-surface-variant);
          text-decoration: none;
          margin-bottom: 12px;
          transition: color 0.15s ease;
        }
        .wv-back:hover { color: var(--color-on-surface); }
        .wv-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--color-on-surface);
          letter-spacing: -0.5px;
          margin-bottom: 4px;
        }
        .wv-desc {
          font-size: 15px;
          color: var(--color-on-surface-variant);
        }
        .wv-actions { display: flex; gap: 12px; flex-shrink: 0; }

        .wv-tabs {
          display: flex;
          gap: 32px;
          border-bottom: 1px solid var(--color-outline-variant);
          margin-bottom: 32px;
        }
        .wv-tab-btn {
          background: none;
          border: none;
          padding: 12px 4px;
          color: var(--color-on-surface-variant);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
          transition: color 0.15s ease;
        }
        .wv-tab-btn:hover { color: var(--color-on-surface); }
        .wv-tab-btn.active { color: var(--color-primary); font-weight: 600; }
        .wv-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--color-primary);
          border-radius: 1px;
        }

        .wv-empty {
          text-align: center;
          padding: 80px 0;
          background: var(--color-surface);
          border-radius: 16px;
          border: 2px dashed var(--color-outline-variant);
        }
        .wv-empty-icon {
          color: var(--color-outline-variant);
          margin-bottom: 16px;
        }
        .wv-empty h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-on-surface);
          margin-bottom: 8px;
        }
        .wv-empty p {
          font-size: 14px;
          color: var(--color-on-surface-variant);
        }

        .wv-members {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .wv-member-item {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          background: var(--color-surface);
          border-radius: 14px;
          border: 1px solid var(--color-outline-variant);
          transition: box-shadow 0.15s ease;
        }
        .wv-member-item:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .wv-member-avatar {
          width: 40px;
          height: 40px;
          background: var(--color-secondary-container);
          color: var(--color-on-secondary-container);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          margin-right: 16px;
          flex-shrink: 0;
        }
        .wv-member-avatar.client {
          background: var(--color-tertiary-container);
          color: var(--color-on-tertiary-container);
        }
        .wv-member-info { flex: 1; min-width: 0; }
        .wv-member-name {
          font-weight: 600;
          color: var(--color-on-surface);
          margin-bottom: 2px;
        }
        .wv-member-email {
          font-size: 13px;
          color: var(--color-on-surface-variant);
        }
        .wv-member-role {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          background: var(--color-surface-container);
          color: var(--color-on-surface-variant);
          border-radius: 20px;
          margin: 0 20px;
          text-transform: capitalize;
        }
        .wv-loading {
          padding: 60px;
          text-align: center;
          color: var(--color-on-surface-variant);
          font-size: 15px;
        }

        .wv-expense-list {
          background: var(--color-surface);
          border-radius: 16px;
          border: 1px solid var(--color-outline-variant);
          overflow: hidden;
        }
        .wv-expense-header {
          display: flex;
          padding: 12px 20px;
          background: var(--color-surface-container-low);
          font-size: 12px;
          font-weight: 600;
          color: var(--color-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .wv-expense-header span, .wv-expense-row span { flex: 1; }
        .wv-exp-col-merchant { flex: 2 !important; }
        .wv-expense-row {
          display: flex;
          padding: 12px 20px;
          align-items: center;
          border-bottom: 1px solid var(--color-outline-variant);
          font-size: 14px;
          color: var(--color-on-surface);
          text-decoration: none;
          transition: background 0.15s ease;
        }
        .wv-expense-row:last-child { border-bottom: none; }
        .wv-expense-row:hover { background: var(--color-surface-container-low); }
        .wv-exp-cell-date { color: var(--color-on-surface-variant); white-space: nowrap; }
        .wv-exp-cell-merchant { font-weight: 600; }
        .wv-exp-cell-amount { font-weight: 700; white-space: nowrap; }
        .wv-exp-pill {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
        }
        .wv-exp-pill--submitted, .wv-exp-pill--draft { background: var(--color-surface-container); color: var(--color-on-surface-variant); }
        .wv-exp-pill--pending { background: var(--color-secondary-container); color: var(--color-secondary); }
        .wv-exp-pill--approved { background: var(--color-tertiary-container); color: var(--color-tertiary); }
        .wv-exp-pill--rejected { background: var(--color-error-container); color: var(--color-error); }

        .wv-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.25s ease-out;
        }
        .wv-invite-modal {
          background: var(--color-surface);
          width: 100%;
          max-width: 440px;
          border-radius: 20px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.15);
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }
        .wv-invite-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px;
          border-bottom: 1px solid var(--color-outline-variant);
        }
        .wv-invite-header h2 {
          font-size: 20px;
          font-weight: 700;
          color: var(--color-on-surface);
        }
        .wv-invite-close {
          background: none;
          border: none;
          color: var(--color-on-surface-variant);
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: background 0.15s ease;
        }
        .wv-invite-close:hover {
          background: var(--color-surface-container);
          color: var(--color-on-surface);
        }
        .wv-invite-body {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .wv-invite-error {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .wv-invite-field label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-on-surface-variant);
          margin-bottom: 6px;
        }
        .wv-input {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--color-outline-variant);
          background: var(--color-surface);
          color: var(--color-on-surface);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          transition: border-color 0.15s ease;
        }
        .wv-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
        }
        .wv-select {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--color-outline-variant);
          background: var(--color-surface);
          color: var(--color-on-surface);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          cursor: pointer;
        }
        .wv-select:focus {
          outline: none;
          border-color: var(--color-primary);
        }
        .wv-invite-footer {
          padding: 20px 28px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid var(--color-outline-variant);
        }

        .wv-member-menu-wrap { position: relative; }
        .wv-member-menu {
          position: absolute;
          right: 0;
          top: 100%;
          background: var(--color-surface);
          border: 1px solid var(--color-outline-variant);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          min-width: 180px;
          z-index: 100;
          overflow: hidden;
          animation: fadeIn 0.15s ease-out;
        }
        .wv-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 14px;
          background: none;
          border: none;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-on-surface);
          cursor: pointer;
          transition: background 0.1s ease;
          text-align: left;
        }
        .wv-menu-item:hover { background: var(--color-surface-container); }
        .wv-menu-item-danger { color: #ef4444; }
        .wv-menu-item-danger:hover { background: rgba(239,68,68,0.08); }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { transform: translateY(24px) scale(0.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </AppShell>
  );
}
