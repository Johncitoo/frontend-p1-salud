import type { ReactNode } from 'react'
import {
  Activity,
  ClipboardList,
  FileText,
  Layers,
  LogOut,
  MapPin,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react'

import { getMockSession, logoutMock, type MockRole } from '@/features/auth/mockAuth'

type SidebarItem = {
  label: string
  href: string
  icon: ReactNode
  roles: MockRole[]
}

const sidebarItems: SidebarItem[] = [
  { label: 'Panel',           href: '/dashboard',     icon: <Layers className='size-5' />,       roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'] },
  { label: 'Pacientes',       href: '/patients',      icon: <Users className='size-5' />,         roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'] },
  { label: 'Registrar paciente', href: '/patients/new', icon: <ClipboardList className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
  { label: 'Usuarios',        href: '/users',         icon: <UserCog className='size-5' />,       roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Profesionales',   href: '/professionals',  icon: <Stethoscope className='size-5' />,  roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'] },
  { label: 'Zonas',           href: '/zones',         icon: <MapPin className='size-5' />,        roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'] },
  { label: 'Auditoría',       href: '/audit',         icon: <FileText className='size-5' />,      roles: ['ADMIN', 'SUPERVISOR'] },
]

type AppLayoutProps = {
  children: ReactNode
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const session = getMockSession()
  const pathname = window.location.pathname

  if (!session) {
    return <>{children}</>
  }

  const handleLogout = () => {
    logoutMock()
    window.location.href = '/'
  }

  const visibleItems = sidebarItems.filter(item => item.roles.includes(session.role))

  return (
    <div className='flex min-h-screen bg-slate-50'>
      {/* sidebar */}
      <aside className='fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r border-slate-200 bg-white'>
        {/* logo */}
        <div className='flex items-center gap-3 border-b border-slate-200 px-5 py-4'>
          <div className='flex items-center gap-2 rounded-lg bg-emerald-100 px-2.5 py-1.5'>
            <Activity className='size-4 text-emerald-700' />
            <span className='text-sm font-semibold text-emerald-800'>Salud Domiciliaria</span>
          </div>
        </div>

        {/* nav */}
        <nav className='flex-1 overflow-y-auto px-3 py-4'>
          <p className='mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400'>
            Navegación
          </p>
          <ul className='space-y-0.5'>
            {visibleItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* user + logout */}
        <div className='border-t border-slate-200 px-5 py-4'>
          <div className='mb-3'>
            <p className='text-sm font-medium text-slate-900'>{session.label}</p>
            <p className='text-xs text-slate-500'>{session.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className='flex w-full items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
          >
            <LogOut className='size-4' />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* main content */}
      <main className='ml-60 flex-1'>{children}</main>
    </div>
  )
}

export default AppLayout
