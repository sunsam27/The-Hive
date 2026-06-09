import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import AuthLayout from '../../components/layout/AuthLayout';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (!token) { setStatus('invalid'); return; }

    authService.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        const msg = err.response?.data?.error || '';
        setStatus(msg === 'Email already verified' ? 'already-verified' : 'error');
      });
  }, []);

  return (
    <AuthLayout title="Email Verification" subtitle="">
      <div className="verify-wrap">
        {status === 'loading' && (
          <>
            <Loader2 size={40} className="spin" />
            <p>Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="v-icon success"><CheckCircle2 size={32} /></div>
            <h2>Email verified!</h2>
            <p>Your account is now active. You can sign in.</p>
            <Link to="/login" className="v-btn">Sign in</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="v-icon error"><XCircle size={32} /></div>
            <h2>Verification failed</h2>
            <p>The link is invalid or expired. Your account may already be verified — try signing in.</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link to="/login" className="v-btn">Sign in</Link>
              <Link to="/signup" className="v-btn" style={{ background: 'var(--color-surface-container)', color: 'var(--color-on-surface-variant)' }}>Create account</Link>
            </div>
          </>
        )}
        {status === 'already-verified' && (
          <>
            <div className="v-icon success"><CheckCircle2 size={32} /></div>
            <h2>Already verified</h2>
            <p>Your email has already been verified. You can sign in now.</p>
            <Link to="/login" className="v-btn">Sign in</Link>
          </>
        )}
        {status === 'invalid' && (
          <>
            <div className="v-icon error"><XCircle size={32} /></div>
            <h2>Invalid link</h2>
            <p>No verification token found in the URL.</p>
            <Link to="/login" className="v-btn">Sign in</Link>
          </>
        )}
      </div>
      <style>{`
        .verify-wrap { text-align: center; padding: 20px 0; }
        .v-icon {
          width: 56px; height: 56px; margin: 0 auto 20px;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
        .v-icon.success { background: var(--color-tertiary-container); color: var(--color-tertiary); }
        .v-icon.error { background: var(--color-error-container); color: var(--color-error); }
        .verify-wrap h2 {
          font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700;
          color: var(--color-on-surface); margin-bottom: 12px;
        }
        .verify-wrap p {
          font-family: 'Space Grotesk', sans-serif; font-size: 14px;
          color: var(--color-on-surface-variant); margin-bottom: 24px;
        }
        .v-btn {
          display: inline-block; padding: 12px 28px;
          background: var(--color-primary); color: #fff; text-decoration: none;
          border-radius: 10px; font-family: 'Space Grotesk', sans-serif;
          font-weight: 600; font-size: 14px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; margin: 0 auto 20px; color: var(--color-primary); display: block; }
      `}</style>
    </AuthLayout>
  );
}
