import {
  Activity,
  ClipboardList,
  FileText,
  LogOut,
  MapPin,
  Shield,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react'

import { getMockSession, logoutMock } from '@/features/auth/mockAuth'

type NavCard = {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color: string
  roles: string[]
}

const cards: NavCard[] = [
  {
    title: 'Pacientes',
    description: 'Consulta y gestión de pacientes del sistema.',
    href: '/patients',
    icon: <Users className='size-5' />,
    color: 'bg-blue-100 text-blue-700',
    roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'],
  },
  {
    title: 'Registrar paciente',
    description: 'Formulario de ingreso de nuevo paciente.',
    href: '/patients/new',
    icon: <ClipboardList className='size-5' />,
    color: 'bg-blue-100 text-blue-700',
    roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'],
  },
  {
    title: 'Usuarios',
    description: 'Administración de usuarios y perfiles del sistema.',
    href: '/users',
    icon: <UserCog className='size-5' />,
    color: 'bg-red-100 text-red-700',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    title: 'Crear usuario',
    description: 'Registro de nuevo usuario con rol asignado.',
    href: '/users/new',
    icon: <UserCog className='size-5' />,
    color: 'bg-red-100 text-red-700',
    roles: ['ADMIN'],
  },
  {
    title: 'Profesionales',
    description: 'CRUD de profesionales de salud, especialidades y asignaciones.',
    href: '/professionals',
    icon: <Stethoscope className='size-5' />,
    color: 'bg-emerald-100 text-emerald-700',
    roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'],
  },
  {
    title: 'Zonas',
    description: 'Gestión de zonas de cobertura geográfica.',
    href: '/zones',
    icon: <MapPin className='size-5' />,
    color: 'bg-amber-100 text-amber-700',
    roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'],
  },
  {
    title: 'Crear zona',
    description: 'Registro de nueva zona de cobertura.',
    href: '/zones/new',
    icon: <MapPin className='size-5' />,
    color: 'bg-amber-100 text-amber-700',
    roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'],
  },
  {
    title: 'Auditoría',
    description: 'Registro de eventos y trazabilidad del sistema.',
    href: '/audit',
    icon: <FileText className='size-5' />,
    color: 'bg-purple-100 text-purple-700',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
]

const DashboardPage = () => {
  const session = getMockSession()

  const handleLogout = () => {
    logoutMock()
    window.location.href = '/'
  }

  const filteredCards = cards.filter(card =>
    session ? card.roles.includes(session.role) : false,
  )

  return (
    <main className='min-h-screen bg-slate-50'>
      {/* top bar */}
      <header className='border-b border-slate-200 bg-white'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-6 py-4'>
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1.5'>
              <Activity className='size-4 text-emerald-700' />
              <span className='text-sm font-semibold text-emerald-800'>
                Atención Domiciliaria
              </span>
            </div>
          </div>

          {session && (
            <div className='flex items-center gap-4'>
              <div className='text-right'>
                <p className='text-sm font-medium text-slate-900'>
                  {session.label}
                </p>
                <p className='text-xs text-slate-500'>{session.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className='inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'
              >
                <LogOut className='size-4' />
                Salir
              </button>
            </div>
          )}
        </div>
      </header>

      {/* content */}
      <section className='mx-auto max-w-7xl px-6 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-semibold text-slate-900'>
            Panel de control
          </h1>
          <p className='mt-2 text-sm text-slate-600'>
            Accede a los módulos del sistema según tu rol asignado.
          </p>
        </div>

        {/* RBAC info */}
        <div className='mb-8 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4'>
          <Shield className='mt-0.5 size-5 shrink-0 text-amber-600' />
          <div>
            <p className='text-sm font-semibold text-amber-900'>
              Principio del mínimo privilegio activo
            </p>
            <p className='text-sm text-amber-800'>
              Solo ves los módulos que tu rol tiene permitidos. Ciertas acciones
              como crear o eliminar pueden requerir permisos adicionales dentro
              de cada pantalla.
            </p>
          </div>
        </div>

        {/* cards grid */}
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {filteredCards.map(card => (
            <a
              key={card.href}
              href={card.href}
              className='group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md'
            >
              <span
                className={`inline-flex rounded-lg p-2.5 ${card.color}`}
              >
                {card.icon}
              </span>
              <h2 className='mt-4 text-base font-semibold text-slate-900 group-hover:text-emerald-700'>
                {card.title}
              </h2>
              <p className='mt-1 text-sm leading-5 text-slate-500'>
                {card.description}
              </p>
            </a>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className='rounded-xl border border-slate-200 bg-white px-6 py-12 text-center'>
            <Shield className='mx-auto mb-3 size-10 text-slate-300' />
            <p className='text-slate-500'>No hay módulos disponibles para tu rol.</p>
          </div>
        )}
      </section>
    </main>
  )
}

export default DashboardPage
