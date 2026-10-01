import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { BillingProvider } from './context/BillingContext'
import { UpgradeProvider } from './context/UpgradeContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
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
  </StrictMode>,
)
