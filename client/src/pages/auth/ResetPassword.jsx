import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';

const passwordRules = [
  { test: (v) => v.length >= 8, label: 'Must be at least 8 characters' },
  { test: (v) => /[A-Z]/.test(v), label: 'Must contain at least one uppercase letter' },
  { test: (v) => /[0-9]/.test(v), label: 'Must contain at least one number' },
  { test: (v) => /[!@#$%^&*(),.?":{}|<>]/.test(v), label: 'Must contain at least one special character' },
];

const validatePassword = (val) => {
  if (!val) return true;
  for (const rule of passwordRules) {
    if (!rule.test(val)) return rule.label;
  }
  return true;
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!token) { setError('Invalid reset link'); return; }
    
    const passError = validatePassword(password);
    if (passError !== true) { setError(passError); return; }
    
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    setError('');
    try {
      await authService.resetPassword(token, password);
      showToast('Password reset successfully!', 'success');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="">
        <p style={{ textAlign: 'center', fontFamily: "'Space Grotesk', sans-serif", color: 'var(--color-on-surface-variant)', fontSize: 14, padding: '20px 0' }}>
          This reset link is invalid. <Link to="/forgot-password">Request a new one</Link>.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set new password" subtitle="Enter your new password below">
      <form onSubmit={onSubmit}>
        <Input
          label="New Password"
          type="password"
          placeholder="Minimum 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Resetting...' : 'Reset password'}
        </Button>
        <p className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
