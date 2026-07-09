import { useEffect, useState, type ReactNode } from 'react'

import AppLayout from '@/components/AppLayout'
import LoginPage from './features/auth/LoginPage'
import DashboardPage from './features/dashboard/DashboardPage'
import PatientsListPage from './features/patients/PatientsListPage'
import PatientRegistrationPage from './features/patients/PatientRegistrationPage'
import PatientProfilePage from './features/patients/PatientProfilePage'
import UserFormPage from './features/users/UserFormPage'
import UsersListPage from './features/users/UsersListPage'
import ZoneFormPage from './features/zones/ZoneFormPage'
import ZonesListPage from './features/zones/ZonesListPage'
import ProfessionalsPage from './features/professionals/ProfessionalsPage'
import AgendaPage from './features/visits/AgendaPage'
import AuditPage from './features/audit/AuditPage'
import CrmTicketsListPage from './features/crm/CrmTicketsListPage'
import SeguimientoPage from './features/seguimiento/SeguimientoPage'
import MedicamentosCatalogoPage from './features/medicamentos/MedicamentosCatalogoPage'
import FichaClinicaListPage from './features/ficha-clinica/FichaClinicaListPage'
import FichaClinicaFormPage from './features/ficha-clinica/FichaClinicaFormPage'
import PlantillaFichaBuilderPage from './features/ficha-clinica/PlantillaFichaBuilderPage'
import PlantillaFichaPreviewPage from './features/ficha-clinica/PlantillaFichaPreviewPage'
import { useAuthSession } from './features/auth/AuthSessionContext'
import { roleHomePath } from './lib/roleHome'
import { canAccessPath } from './lib/permissions'

const FullPageMessage = ({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) => (
  <main className='grid min-h-screen place-items-center bg-[#182F3F] px-6 text-white'>
    <section className='w-full max-w-md rounded-3xl border border-[#3C6E71]/50 bg-[#203C50] p-8 text-center shadow-xl shadow-black/20'>
      <p className='text-xs font-bold uppercase tracking-[0.2em] text-[#9CBFC1]'>MediHome</p>
      <h1 className='mt-3 text-2xl font-semibold text-white'>{title}</h1>
      <p className='mt-3 text-sm leading-6 text-[#D9D9D9]'>{message}</p>
      {action ? <div className='mt-6'>{action}</div> : null}
    </section>
  </main>
)

function App() {
  const [pathname, setPathname] = useState(window.location.pathname)
  const { status, profile, error, logout } = useAuthSession()

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname)

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor) return
      if (anchor.target || anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return

      const nextUrl = new URL(href, window.location.origin)
      if (nextUrl.origin !== window.location.origin) return

      event.preventDefault()
      window.history.pushState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
      setPathname(nextUrl.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleDocumentClick)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [])

  if (status === 'loading') {
    return <FullPageMessage title='Conectando con identidad' message='Estamos validando tu sesion en el Sistema de Identidad.' />
  }

  if (status === 'access-denied') {
    return (
      <FullPageMessage
        title='Acceso denegado'
        message='Tu cuenta existe en el Sistema de Identidad, pero no tiene el rol de acceso requerido para Proyecto 1.'
        action={
          <button
            type='button'
            onClick={logout}
            className='rounded-xl border border-[#3C6E71] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3C6E71]'
          >
            Cerrar sesion
          </button>
        }
      />
    )
  }

  if (status === 'error') {
    return (
      <FullPageMessage
        title='No pudimos cargar tu perfil'
        message={error || 'Tu identidad fue validada, pero no encontramos un usuario local activo asociado.'}
        action={
          <button
            type='button'
            onClick={logout}
            className='rounded-xl border border-[#3C6E71] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3C6E71]'
          >
            Cerrar sesion
          </button>
        }
      />
    )
  }

  if (pathname === '/' || pathname === '/auth/login') {
    window.location.href = roleHomePath(profile!.rol)
    return null
  }

  const getPage = () => {
    if (!canAccessPath(profile!.rol, pathname)) {
      return (
        <FullPageMessage
          title='Acceso restringido'
          message='Tu perfil no tiene permisos para acceder a esta sección.'
          action={
            <a
              href={roleHomePath(profile!.rol)}
              className='inline-flex rounded-xl bg-[#3C6E71] px-4 py-2 text-sm font-semibold text-white'
            >
              Volver a tu panel
            </a>
          }
        />
      )
    }

    if (pathname === '/dashboard') return <DashboardPage />
    if (pathname === '/coordinator' || pathname === '/supervisor' || pathname === '/professional') {
      return <DashboardPage />
    }

    if (pathname === '/patients') return <PatientsListPage />
    if (pathname === '/patients/new') return <PatientRegistrationPage />
    const patientViewMatch = pathname.match(/^\/patients\/([^/]+)$/)
    if (patientViewMatch && patientViewMatch[1] !== 'new') return <PatientProfilePage patientId={patientViewMatch[1]} />
    if (pathname === '/agenda' || pathname === '/visitas') return <AgendaPage />

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
    if (pathname === '/incidents') return <CrmTicketsListPage />
    if (pathname === '/seguimiento') return <SeguimientoPage />
    if (pathname === '/medicamentos-catalogo') return <MedicamentosCatalogoPage />

    // Fichas clínicas
    if (pathname === '/fichas-clinicas') return <FichaClinicaListPage />
    if (pathname === '/fichas-clinicas/new') return <PlantillaFichaBuilderPage />
    if (pathname === '/fichas-clinicas/llenar') {
      const visitaId = new URLSearchParams(window.location.search).get('visitaId') ?? undefined
      return <FichaClinicaFormPage visitaId={visitaId} />
    }
    const plantillaPreviewMatch = pathname.match(/^\/fichas-clinicas\/plantillas\/([^/]+)$/)
    if (plantillaPreviewMatch) return <PlantillaFichaPreviewPage plantillaId={plantillaPreviewMatch[1]} />
    const plantillaEditMatch = pathname.match(/^\/fichas-clinicas\/plantillas\/([^/]+)\/editar$/)
    if (plantillaEditMatch) return <PlantillaFichaBuilderPage plantillaId={plantillaEditMatch[1]} />
    const fichaEditMatch = pathname.match(/^\/fichas-clinicas\/([^/]+)\/editar$/)
    if (fichaEditMatch) return <FichaClinicaFormPage fichaId={fichaEditMatch[1]} />
    const fichaViewMatch = pathname.match(/^\/fichas-clinicas\/([^/]+)$/)
    if (fichaViewMatch) return <FichaClinicaFormPage fichaId={fichaViewMatch[1]} />

    window.location.href = '/dashboard'
    return null
  }

  return <AppLayout>{getPage()}</AppLayout>
}

export default App