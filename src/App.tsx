import AppLayout from '@/components/AppLayout'
import LoginPage from './features/auth/LoginPage'
import DashboardPage from './features/dashboard/DashboardPage'
import PatientsListPage from './features/patients/PatientsListPage'
import PatientRegistrationPage from './features/patients/PatientRegistrationPage'
import UserFormPage from './features/users/UserFormPage'
import UsersListPage from './features/users/UsersListPage'
import ZoneFormPage from './features/zones/ZoneFormPage'
import ZonesListPage from './features/zones/ZonesListPage'
import ProfessionalsPage from './features/professionals/ProfessionalsPage'
import AuditPage from './features/audit/AuditPage'
import { getMockSession } from './features/auth/mockAuth'

function App() {
  const pathname = window.location.pathname
  const session = getMockSession()

  // login sin sidebar
  if (pathname === '/' || pathname === '/auth/login') {
    if (session) {
      window.location.href = '/dashboard'
      return null
    }
    return <LoginPage />
  }

  // proteger rutas internas
  if (!session) {
    window.location.href = '/'
    return null
  }

  const getPage = () => {
    if (pathname === '/dashboard') return <DashboardPage />

    if (pathname === '/patients') return <PatientsListPage />
    if (pathname === '/patients/new') return <PatientRegistrationPage />

    if (pathname === '/users') return <UsersListPage />
    if (pathname === '/users/new') return <UserFormPage />
    const userEditMatch = pathname.match(/^\/users\/([^/]+)\/edit$/)
    if (userEditMatch) return <UserFormPage userId={userEditMatch[1]} />

    if (pathname === '/zones') return <ZonesListPage />
    if (pathname === '/zones/new') return <ZoneFormPage />
    const zoneEditMatch = pathname.match(/^\/zones\/([^/]+)\/edit$/)
    if (zoneEditMatch) return <ZoneFormPage zoneId={zoneEditMatch[1]} />

    if (pathname === '/professionals') return <ProfessionalsPage />
    const professionalEditMatch = pathname.match(/^\/professionals\/([^/]+)\/edit$/)
    if (professionalEditMatch) return <ProfessionalsPage editId={professionalEditMatch[1]} />

    if (pathname === '/audit') return <AuditPage />

    window.location.href = '/dashboard'
    return null
  }

  return <AppLayout>{getPage()}</AppLayout>
}

export default App
