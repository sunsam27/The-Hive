import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import Button from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '24px',
        textAlign: 'center',
        padding: '60px 24px',
      }}>
        <p style={{
          fontSize: '96px',
          fontWeight: 700,
          lineHeight: 1,
          color: 'var(--color-primary)',
          margin: 0,
        }}>
          404
        </p>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: 'var(--color-on-surface)',
          margin: 0,
        }}>
          Page not found
        </h1>
        <p style={{
          fontSize: '15px',
          color: 'var(--color-on-surface-variant)',
          maxWidth: '360px',
          lineHeight: 1.6,
          margin: 0,
        }}>
          The page you were looking for doesn't exist or has been moved.
        </p>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </AppShell>
  );
}
