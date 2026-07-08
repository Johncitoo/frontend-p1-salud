import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { AuthSessionProvider } from './features/auth/AuthSessionContext'

const queryClient = new QueryClient()

const root = document.getElementById('root')
const queryClient = new QueryClient()

if (root) {
  createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <App />
      </AuthSessionProvider>
    </QueryClientProvider>
  </StrictMode>,
  )
}
