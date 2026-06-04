
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/layout/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';

const Login = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting, isValid } } = useForm({ mode: 'onTouched' });
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      showToast('Welcome back!', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid credentials';
      showToast(msg, 'error');
    }
  };

  return (
    <AuthLayout 
      title="Welcome to The Hive" 
      subtitle="Manage your expenses with confidence"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
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
          placeholder="••••••••"
          {...register('password', { 
            required: 'Password is required'
          })}
          error={errors.password}
        />
        
        <div className="auth-actions">
          <Link to="/forgot-password" className="forgot-password">
            Forgot password?
          </Link>
        </div>

        <Button 
          type="submit" 
          style={{ width: '100%', marginTop: '8px' }} 
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>
      </form>

      <style>{`
        .auth-actions {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
        }
        .forgot-password {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: var(--color-primary);
          text-decoration: none;
        }
        .auth-footer {
          text-align: center;
          margin-top: 24px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          color: var(--color-on-surface-variant);
        }
        .auth-footer a {
          color: var(--color-primary);
          text-decoration: none;
          font-weight: 600;
        }
      `}</style>
    </AuthLayout>
  );
};

export default Login;
