import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthSessionProvider } from './features/auth/AuthSessionContext'

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
  <StrictMode>
    <AuthSessionProvider>
      <App />
    </AuthSessionProvider>
  </StrictMode>,
  )
}
