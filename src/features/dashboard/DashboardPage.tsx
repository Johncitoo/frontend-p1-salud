import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  BriefcaseMedical,
  CalendarDays,
  CalendarCheck2,
  ClipboardList,
  ClipboardPen,
  FileText,
  MapPin,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
  AlertTriangle,
} from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiGet } from '@/lib/api'

type NavCard = {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  emphasis?: boolean
  roles: string[]
}

const cards: NavCard[] = [
  { title: 'Pacientes', description: 'Consulta fichas y datos de atención.', href: '/patients', icon: <Users className='size-5' />, emphasis: true, roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'] },
  { title: 'Registrar paciente', description: 'Incorpora un nuevo paciente.', href: '/patients/new', icon: <ClipboardList className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL'] },
  { title: 'Agenda', description: 'Programa visitas y controla atenciones.', href: '/agenda', icon: <CalendarDays className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'] },
  { title: 'Profesionales', description: 'Gestiona equipos y asignaciones.', href: '/professionals', icon: <Stethoscope className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
  { title: 'Zonas', description: 'Administra áreas de cobertura.', href: '/zones', icon: <MapPin className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'SUPERVISOR'] },
  { title: 'Usuarios', description: 'Administra perfiles del sistema.', href: '/users', icon: <UserCog className='size-5' />, roles: ['ADMIN', 'SUPERVISOR'] },
  { title: 'Crear usuario', description: 'Registra un usuario y su rol.', href: '/users/new', icon: <UserCog className='size-5' />, roles: ['ADMIN'] },
  { title: 'Crear zona', description: 'Añade una zona de cobertura.', href: '/zones/new', icon: <MapPin className='size-5' />, roles: ['ADMIN', 'COORDINADOR'] },
  { title: 'Fichas Clínicas', description: 'Registra atenciones con formularios guiados.', href: '/fichas-clinicas', icon: <ClipboardPen className='size-5' />, roles: ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'SUPERVISOR'] },
  { title: 'Auditoría', description: 'Revisa eventos y trazabilidad.', href: '/audit', icon: <FileText className='size-5' />, roles: ['ADMIN', 'SUPERVISOR'] },
]

type AlertaRow = {
  id: string
  tipo: string
  mensaje: string
  prioridad: string
  estado: string
  createdAt: string
  pacienteId: string
}

const DashboardPage = () => {
  const session = useCurrentUser()
  const filteredCards = cards.filter(card => card.roles.includes(session.rol))
  const [alertas, setAlertas] = useState<AlertaRow[]>([])

  useEffect(() => {
    let isMounted = true
    if (session.rol === 'ADMIN' || session.rol === 'COORDINADOR' || session.rol === 'PROFESIONAL') {
      apiGet<AlertaRow[]>('/alertas').then(data => {
        if (isMounted) {
          // Filtrar alertas IoT
          setAlertas(data.filter(a => a.tipo.startsWith('IOT_') && a.estado !== 'CERRADA' && a.estado !== 'RESUELTA'))
        }
      }).catch(console.error)
    }
    return () => { isMounted = false }
  }, [session.rol])

  return (
    <main className='min-h-screen bg-[#182F3F] px-4 py-5 sm:px-6 sm:py-7 xl:px-10 xl:py-9'>
      <section className='mx-auto w-full max-w-[1400px]'>
        <header className='mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.2em] text-[#3C6E71]'>Panel operativo</p>
            <h1 className='m-0 mt-2 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl'>Hola, {session.nombres}</h1>
            <p className='mt-3 max-w-2xl text-sm font-medium leading-6 text-[#D9D9D9] sm:text-base'>
              Revisa el estado general y accede a los módulos disponibles para tu perfil.
            </p>
          </div>
          <div className='inline-flex w-fit items-center gap-2 rounded-full border border-[#3C6E71] bg-[#203C50] px-4 py-2 text-xs font-bold text-white shadow-sm'>
            <span className='size-2 rounded-full bg-[#3C6E71]' />
            Sistema operativo
          </div>
        </header>

        <section className='mb-6 grid gap-4 md:grid-cols-3'>
          <article className='relative overflow-hidden rounded-[24px] border border-[#284B63] bg-[#284B63] p-6 text-white shadow-lg shadow-[#284B63]/15 md:col-span-2'>
            <div className='absolute -right-14 -top-20 size-56 rounded-full border-[38px] border-[#3C6E71]/50' aria-hidden='true' />
            <div className='relative z-10 flex h-full min-h-44 flex-col justify-between gap-8 sm:flex-row sm:items-end'>
              <div className='max-w-lg'>
                <span className='mb-5 grid size-11 place-items-center rounded-2xl bg-white/10'>
                  <BriefcaseMedical className='size-6' aria-hidden='true' />
                </span>
                <p className='text-sm font-semibold text-white'>Gestión centralizada</p>
                <h2 className='m-0 mt-2 text-2xl font-semibold leading-tight tracking-[-0.025em] text-white sm:text-3xl'>
                  Todo lo necesario para coordinar la atención domiciliaria.
                </h2>
              </div>
              <a href='/patients' className='inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#284B63] transition hover:bg-[#D9D9D9]'>
                Ver pacientes <ArrowUpRight className='size-4' />
              </a>
            </div>
          </article>

          <article className='flex min-h-44 flex-col justify-between rounded-[24px] border border-[#3C6E71] bg-[#203C50] p-6 text-white shadow-md shadow-black/15'>
            <div className='flex items-center justify-between'>
              <span className='grid size-11 place-items-center rounded-2xl bg-[#3C6E71] text-white'>
                <ShieldCheck className='size-6' aria-hidden='true' />
              </span>
              <span className='rounded-full bg-[#3C6E71] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white'>Activo</span>
            </div>
            <div>
              <p className='text-3xl font-semibold tracking-tight'>{filteredCards.length}</p>
              <p className='mt-1 text-sm font-medium text-[#D9D9D9]'>módulos habilitados para tu rol</p>
            </div>
          </article>
        </section>

        <section className='mb-8 grid gap-4 sm:grid-cols-3'>
          {[
            { label: 'Atenciones del día', value: '24', icon: CalendarCheck2 },
            { label: 'Equipos disponibles', value: '08', icon: Stethoscope },
            { label: 'Zonas operativas', value: '06', icon: MapPin },
          ].map(metric => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className='flex items-center gap-4 rounded-2xl border border-[#3C6E71]/50 bg-[#203C50] p-5 shadow-sm transition hover:border-[#3C6E71] hover:bg-[#284B63] hover:shadow-md'>
                <span className='grid size-11 place-items-center rounded-xl bg-[#3C6E71] text-white'>
                  <Icon className='size-5' aria-hidden='true' />
                </span>
                <div>
                  <p className='text-2xl font-semibold tracking-tight text-white'>{metric.value}</p>
                  <p className='text-xs font-semibold text-[#D9D9D9]'>{metric.label}</p>
                </div>
              </article>
            )
          })}
        </section>

        <section>
          <div className='mb-4 flex items-end justify-between gap-4'>
            <div>
              <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>Accesos rápidos</p>
              <h2 className='m-0 mt-1 text-2xl font-semibold tracking-[-0.025em] text-white'>Módulos disponibles</h2>
            </div>
            <p className='hidden text-xs font-semibold text-[#D9D9D9] sm:block'>Permisos según perfil {session.rol}</p>
          </div>

          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {filteredCards.map(card => (
              <a
                key={card.href}
                href={card.href}
                className={`group flex min-h-44 flex-col justify-between rounded-[22px] border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                  card.emphasis
                    ? 'border-[#3C6E71] bg-[#3C6E71] text-white shadow-md shadow-[#3C6E71]/15'
                    : 'border-[#3C6E71]/45 bg-[#203C50] text-white shadow-sm hover:border-[#3C6E71] hover:bg-[#284B63]'
                }`}
              >
                <div className='flex items-start justify-between'>
                  <span className={`grid size-11 place-items-center rounded-xl ${card.emphasis ? 'bg-white/20 text-white' : 'bg-[#3C6E71] text-white'}`}>
                    {card.icon}
                  </span>
                  <ArrowUpRight className={`size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${card.emphasis ? 'text-white' : 'text-[#3C6E71]'}`} />
                </div>
                <div>
                  <h3 className='text-base font-semibold text-white'>{card.title}</h3>
                  <p className={`mt-1 text-xs font-medium leading-5 ${card.emphasis ? 'text-white' : 'text-[#D9D9D9]'}`}>{card.description}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {alertas.length > 0 && (
          <section className='mt-8 rounded-[24px] border border-amber-200 bg-amber-50 p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <AlertTriangle className='text-amber-600 size-6' />
              <h2 className='text-xl font-semibold text-amber-900'>Alertas Domiciliarias (IoT) Activas</h2>
            </div>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {alertas.map(alerta => (
                <div key={alerta.id} className='bg-white rounded-xl p-4 shadow-sm border border-amber-100 flex flex-col justify-between'>
                  <div>
                    <span className='px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-md'>
                      Prioridad {alerta.prioridad}
                    </span>
                    <p className='mt-3 text-sm font-semibold text-slate-800'>{alerta.mensaje}</p>
                  </div>
                  <div className='mt-4 flex items-center justify-between'>
                    <span className='text-xs text-slate-500'>{new Date(alerta.createdAt).toLocaleString('es-CL')}</span>
                    <a href={`/patients/${alerta.pacienteId}`} className='text-xs font-semibold text-[#3C6E71] hover:underline'>Ver paciente</a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

export default DashboardPage
