import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthGuard from './components/auth/AuthGuard';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import WorkspaceList from './pages/WorkspaceList';
import WorkspaceView from './pages/WorkspaceView';
import ExpenseList from './pages/ExpenseList';
import ExpenseDetail from './pages/ExpenseDetail';
import SummaryView from './pages/SummaryView';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import ResetPassword from './pages/auth/ResetPassword';
import ChangePassword from './pages/auth/ChangePassword';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/workspaces" element={<AuthGuard><WorkspaceList /></AuthGuard>} />
          <Route path="/workspaces/:id" element={<AuthGuard><WorkspaceView /></AuthGuard>} />
          <Route path="/workspaces/:id/summary" element={<AuthGuard><SummaryView /></AuthGuard>} />
          <Route path="/expenses" element={<AuthGuard><ExpenseList /></AuthGuard>} />
          <Route path="/change-password" element={<AuthGuard><ChangePassword /></AuthGuard>} />
          <Route path="/expenses/:expenseId" element={<AuthGuard><ExpenseDetail /></AuthGuard>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
