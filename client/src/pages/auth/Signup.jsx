import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { Mail } from 'lucide-react';

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

const Signup = () => {
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting, isValid } } = useForm({ mode: 'onTouched' });
  const { signup } = useAuth();
  const { showToast } = useToast();

  const password = watch('password', '');

  const onSubmit = async (data) => {
    try {
      await signup(data);
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      showToast(msg, 'error');
    }
  };

  if (submitted) {
    return (
      <AuthLayout title="Check your email" subtitle="">
        <div className="verify-sent">
          <div className="verify-icon"><Mail size={32} /></div>
          <h2>Verify your email</h2>
          <p>We sent a verification link to your email. Click the link to activate your account.</p>
          <p className="verify-note">Didn't get it? Check your spam folder.</p>
          <Link to="/login" className="verify-btn">Go to sign in</Link>
        </div>
        <style>{`
          .verify-sent { text-align: center; padding: 20px 0; }
          .verify-icon {
            width: 56px; height: 56px; margin: 0 auto 20px;
            background: var(--color-primary-container); color: var(--color-primary);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
          }
          .verify-sent h2 {
            font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700;
            color: var(--color-on-surface); margin-bottom: 12px;
          }
          .verify-sent p {
            font-family: 'Space Grotesk', sans-serif; font-size: 14px;
            color: var(--color-on-surface-variant); line-height: 1.6; margin-bottom: 8px;
          }
          .verify-note { font-size: 13px; margin-top: 16px; }
          .verify-btn {
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
      title="Create Account" 
      subtitle="Join thousands of freelancers managing expenses easily"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          {...register('name', { 
            required: 'Name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' }
          })}
          error={errors.name}
        />
        <Input
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          {...register('email', { 
            required: 'Email is required',
            pattern: { value: /^\S+@\S+$/i, message: 'Enter a valid email address' }
          })}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Minimum 8 characters"
          onFocus={() => setPasswordTouched(true)}
          {...register('password', { 
            required: 'Password is required',
            validate: validatePassword
          })}
          error={errors.password}
        />

        {passwordTouched && password.length > 0 && (
          <div className="password-rules">
            {passwordRules.map((rule, i) => {
              const passed = rule.test(password);
              return (
                <div key={i} className={`rule ${passed ? 'pass' : ''}`}>
                  <span className="rule-icon">{passed ? '✓' : '○'}</span>
                  <span>{rule.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          {...register('confirmPassword', { 
            required: 'Please confirm your password',
            validate: (val) => val === password || 'Passwords do not match'
          })}
          error={errors.confirmPassword}
        />

        <Button 
          type="submit" 
          style={{ width: '100%', marginTop: '8px' }} 
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>

      <style>{`
        .password-rules {
          margin: -8px 0 12px;
          padding: 10px 14px;
          background: var(--color-surface-container);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .rule {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          color: var(--color-on-surface-variant);
          transition: color 0.15s ease;
        }
        .rule.pass { color: var(--color-tertiary); }
        .rule-icon { width: 14px; text-align: center; font-size: 11px; flex-shrink: 0; }
      `}</style>
    </AuthLayout>
  );
};

export default Signup;
