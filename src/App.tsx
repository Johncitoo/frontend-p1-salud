import LoginPage from './features/auth/LoginPage'
import PatientsListPage from './features/patients/PatientsListPage'

function App() {
  const pathname = window.location.pathname

  if (pathname === '/patients') {
    return <PatientsListPage />
  }

  return <LoginPage />
}

export default App
