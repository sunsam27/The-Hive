import { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';
import { useToast } from '../hooks/useToast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) { setLoading(false); return; }

    authService.getMe()
      .then((res) => { setUser(res.data.user); setToken(savedToken); })
      .catch((err) => { localStorage.removeItem('token'); showToast(err?.response?.data?.error || 'Session expired', 'error'); })
      .finally(() => setLoading(false));
  }, [showToast]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    setToken(res.data.token);
    return res.data.user;
  };

  const signup = async (data) => {
    await authService.signup(data.name, data.email, data.password, data.role);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, signup, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
