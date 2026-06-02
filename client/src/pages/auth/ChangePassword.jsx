import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const newPasswordErrors = [];
  if (newPassword && newPassword.length < 8) newPasswordErrors.push('At least 8 characters');
  if (newPassword && !/[A-Z]/.test(newPassword)) newPasswordErrors.push('One uppercase letter');
  if (newPassword && !/[0-9]/.test(newPassword)) newPasswordErrors.push('One number');
  if (newPassword && !/[^A-Za-z0-9]/.test(newPassword)) newPasswordErrors.push('One special character');
  const passwordRulesOk = newPasswordErrors.length === 0 && newPassword.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      showToast('Password changed. Please sign in again.', 'success');
      logout();
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to change password';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Change Password" subtitle="Enter your current password and a new one">
      <form onSubmit={handleSubmit}>
        <Input
          label="Current Password"
          type="password"
          placeholder="Enter current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />

        <Input
          label="New Password"
          type="password"
          placeholder="Minimum 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        {newPassword && (
          <div className="password-rules">
            {['At least 8 characters', 'One uppercase letter', 'One number', 'One special character'].map((rule) => {
              const passed =
                (rule === 'At least 8 characters' && newPassword.length >= 8) ||
                (rule === 'One uppercase letter' && /[A-Z]/.test(newPassword)) ||
                (rule === 'One number' && /[0-9]/.test(newPassword)) ||
                (rule === 'One special character' && /[^A-Za-z0-9]/.test(newPassword));
              return (
                <span key={rule} className={`rule ${passed ? 'rule-pass' : 'rule-fail'}`}>
                  {passed ? '✓' : '○'} {rule}
                </span>
              );
            })}
          </div>
        )}

        <Input
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={
            confirmPassword && newPassword !== confirmPassword
              ? 'Passwords do not match'
              : undefined
          }
          required
        />

        <Button
          type="submit"
          style={{ width: '100%', marginTop: '8px' }}
          disabled={isSubmitting || !currentPassword || !passwordRulesOk || newPassword !== confirmPassword}
        >
          {isSubmitting ? 'Changing...' : 'Change Password'}
        </Button>
      </form>

      <style>{`
        .password-rules {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: -8px 0 16px 4px;
        }
        .rule {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 500;
        }
        .rule-pass {
          color: var(--color-tertiary, #2a9d8f);
        }
        .rule-fail {
          color: var(--color-on-surface-variant);
        }
      `}</style>
    </AuthLayout>
  );
};

export default ChangePassword;