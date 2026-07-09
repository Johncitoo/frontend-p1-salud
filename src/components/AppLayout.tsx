import type { ReactNode } from 'react'
import {
  ClipboardList,
  ClipboardPen,
  CalendarClock,
  CalendarDays,
  FileText,
  HeartPulse,
  Layers,
  LogOut,
  MapPin,
  Pill,
  Stethoscope,
  UserCog,
  Users,
  AlertTriangle,
} from 'lucide-react'

import { useAuthSession, type AppRole } from '@/features/auth/AuthSessionContext'
import { roleHomePath } from '@/lib/roleHome'

type SidebarItem = {
  label: string
  href: string
  icon: ReactNode
  roles: AppRole[]
}

const sidebarItems: SidebarItem[] = [
  { label: 'Panel', href: '/dashboard', icon: <Layers className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'] },
  { label: 'Pacientes', href: '/patients', icon: <Users className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'] },
  { label: 'Registrar paciente', href: '/patients/new', icon: <ClipboardList className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL'] },
  { label: 'Agenda', href: '/agenda', icon: <CalendarDays className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'] },
  { label: 'Usuarios', href: '/users', icon: <UserCog className='size-5' />, roles: ['ADMIN', 'SUPERVISOR'] },
  { label: 'Profesionales', href: '/professionals', icon: <Stethoscope className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
  { label: 'Zonas', href: '/zones', icon: <MapPin className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
  { label: 'Fichas Clínicas', href: '/fichas-clinicas', icon: <ClipboardPen className='size-5' />, roles: ['ADMIN', 'PROFESIONAL', 'SUPERVISOR'] },
  { label: 'Pacientes de Seguimiento', href: '/seguimiento', icon: <CalendarClock className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'] },
  { label: 'Catálogo de Medicamentos', href: '/medicamentos-catalogo', icon: <Pill className='size-5' />, roles: ['ADMIN', 'COORDINADOR'] },
  { label: 'Incidentes', href: '/incidents', icon: <AlertTriangle className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
  { label: 'Auditoría', href: '/audit', icon: <FileText className='size-5' />, roles: ['ADMIN', 'SUPERVISOR'] },
]

type AppLayoutProps = {
  children: ReactNode
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { profile, logout } = useAuthSession()
  const pathname = window.location.pathname

  if (!profile) return <>{children}</>

  const handleLogout = () => {
    logout()
  }

  const homePath = roleHomePath(profile.rol as AppRole)
  const visibleItems = sidebarItems
    .filter(item => item.roles.includes(profile.rol as AppRole))
    .map(item => item.label === 'Panel' ? { ...item, href: homePath } : item)

  return (
    <div className='app-dark min-h-screen bg-[#182F3F] text-white lg:flex'>
      <aside className='border-b border-[#3C6E71]/60 bg-[#203C50] text-white shadow-xl shadow-black/20 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r'>
        <div className='flex items-center justify-between px-5 py-5 lg:block lg:px-6 lg:py-7'>
          <a href={homePath} className='flex items-center gap-3'>
            <span className='grid size-11 place-items-center rounded-2xl bg-white shadow-md shadow-[#284B63]/15 overflow-hidden'>
              <img src="/favicon.png" alt="MediHome Logo" className="size-full object-cover p-1" />
            </span>
            <span>
              <span className='block text-[10px] font-bold uppercase tracking-[0.2em] text-[#3C6E71]'>Atención domiciliaria</span>
              <span className='block text-base font-semibold tracking-tight text-white'>MediHome</span>
            </span>
          </a>
          
          <div className='flex items-center gap-3 lg:mt-5'>
            <div className='rounded-full bg-[#3C6E71] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white lg:inline-flex'>
              {profile.rol}
            </div>
            <button
              onClick={handleLogout}
              title='Cerrar sesión'
              className='grid size-8 place-items-center rounded-full bg-[#3C6E71]/20 text-white transition-colors hover:bg-[#3C6E71] lg:hidden'
            >
              <LogOut className='size-4' />
            </button>
          </div>
        </div>

        <nav className='overflow-x-auto px-3 pb-4 lg:flex-1 lg:overflow-y-auto lg:px-4 lg:py-3'>
          <p className='mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9CBFC1] lg:block'>Navegación</p>
          <ul className='flex gap-1 lg:block lg:space-y-1'>
            {visibleItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <li key={item.href} className='shrink-0'>
                  <a
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#3C6E71] text-white shadow-md shadow-black/10'
                        : 'text-[#D9D9D9] hover:bg-[#3C6E71]/35 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className='hidden border-t border-[#3C6E71]/45 p-4 lg:block'>
          <div className='mb-3 rounded-2xl border border-[#3C6E71]/35 bg-[#284B63] p-3.5'>
            <p className='text-sm font-semibold text-white'>{profile.nombres} {profile.apellidos}</p>
            <p className='mt-1 text-xs font-medium text-[#D9D9D9]'>{profile.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className='flex w-full items-center justify-center gap-2 rounded-xl border border-[#3C6E71] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#3C6E71]'
          >
            <LogOut className='size-4' />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className='min-w-0 flex-1 lg:ml-64'>{children}</main>
    </div>
  )
}

export default AppLayout
