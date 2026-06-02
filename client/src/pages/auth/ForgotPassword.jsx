import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { Mail } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <AuthLayout title="Check your email" subtitle="">
        <div className="sent">
          <div className="sent-icon"><Mail size={32} /></div>
          <h2>Email sent</h2>
          <p>If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.</p>
          <Link to="/login" className="sent-btn">Back to sign in</Link>
        </div>
        <style>{`
          .sent { text-align: center; padding: 20px 0; }
          .sent-icon {
            width: 56px; height: 56px; margin: 0 auto 20px;
            background: var(--color-primary-container); color: var(--color-primary);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
          }
          .sent h2 {
            font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700;
            color: var(--color-on-surface); margin-bottom: 12px;
          }
          .sent p {
            font-family: 'Space Grotesk', sans-serif; font-size: 14px;
            color: var(--color-on-surface-variant); line-height: 1.6;
          }
          .sent-btn {
            display: inline-block; margin-top: 24px; padding: 12px 28px;
            background: var(--color-primary); color: #fff; text-decoration: none;
            border-radius: 10px; font-family: 'Space Grotesk', sans-serif;
            font-weight: 600; font-size: 14px;
          }
        `}</style>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Reset Password" 
      subtitle="Enter your email to receive a recovery link"
    >
      <form onSubmit={onSubmit}>
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          error={error}
        />
        
        <Button 
          type="submit" 
          style={{ width: '100%' }} 
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </Button>

        <p className="auth-footer">
          Remember password? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;
