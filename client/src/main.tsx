import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { BillingProvider } from './context/BillingContext'
import { UpgradeProvider } from './context/UpgradeContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'

// The router has to wrap every provider, not just <App />, because
// UpgradeProvider renders a component that calls useNavigate().
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BillingProvider>
              <UpgradeProvider>
                <App />
              </UpgradeProvider>
            </BillingProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
