import { useState, useRef } from 'react';
import { User, Upload } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { getFileUrl } from '../../services/api';

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File must be under 5MB', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Only image files are allowed', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (avatarFile) formData.append('avatar', avatarFile);
      const res = await authService.updateProfile(formData);
      setUser(res.data.user);
      showToast('Profile updated', 'success');
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setName(user?.name || '');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Profile Settings">
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--color-secondary-container)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : user?.avatar_url ? (
                <img src={getFileUrl(user.avatar_url)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <User size={32} style={{ color: 'var(--color-on-secondary-container)' }} />
              )}
            </div>
            <Button variant="ghost" size="sm" type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Change Photo
            </Button>
            <p style={{ fontSize: 11, color: 'var(--color-on-surface-variant)', textAlign: 'center', margin: 0 }}>JPEG, PNG, or WebP &middot; Max 5MB</p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>
              Display Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid var(--color-outline-variant)', background: 'var(--color-surface)',
                color: 'var(--color-on-surface)', fontFamily: "'Space Grotesk', sans-serif", fontSize: 14,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-on-surface-variant)', marginBottom: 6 }}>
              Email
            </label>
            <input
              value={user?.email || ''}
              disabled
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: '1.5px solid var(--color-outline-variant)', background: 'var(--color-surface-container)',
                color: 'var(--color-on-surface-variant)', fontFamily: "'Space Grotesk', sans-serif", fontSize: 14,
                opacity: 0.7,
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--color-outline-variant)', padding: '20px 0 0' }}>
          <Button variant="ghost" type="button" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProfileModal;
