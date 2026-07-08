import type { AppRole } from '@/features/auth/AuthSessionContext'

export const canAccessPath = (role: AppRole, pathname: string) => {
  if (role === 'ADMIN') return true

  if (pathname === '/dashboard') return true
  if (pathname === '/coordinator') return role === 'COORDINADOR'
  if (pathname === '/supervisor') return role === 'SUPERVISOR'
  if (pathname === '/professional') return role === 'PROFESIONAL'

  if (pathname === '/patients') return true
  if (pathname === '/patients/new') return role === 'COORDINADOR' || role === 'PROFESIONAL'
  if (pathname === '/agenda' || pathname === '/visitas') return true

  if (pathname === '/fichas-clinicas') return true
  if (pathname === '/fichas-clinicas/llenar') return role === 'COORDINADOR' || role === 'PROFESIONAL'
  if (pathname === '/fichas-clinicas/new') return role === 'COORDINADOR'
  if (/^\/fichas-clinicas\/plantillas\/[^/]+\/editar$/.test(pathname)) return role === 'COORDINADOR'
  if (/^\/fichas-clinicas\/plantillas\/[^/]+$/.test(pathname)) return true
  if (/^\/fichas-clinicas\/[^/]+\/editar$/.test(pathname)) return role === 'COORDINADOR' || role === 'PROFESIONAL'
  if (/^\/fichas-clinicas\/[^/]+$/.test(pathname)) return true

  if (pathname === '/professionals') return role === 'COORDINADOR' || role === 'SUPERVISOR'
  if (/^\/professionals\/[^/]+\/edit$/.test(pathname)) return role === 'COORDINADOR'

  if (pathname === '/zones') return role === 'COORDINADOR' || role === 'SUPERVISOR'
  if (pathname === '/zones/new' || /^\/zones\/[^/]+\/edit$/.test(pathname)) return role === 'COORDINADOR'

  if (pathname === '/users') return role === 'SUPERVISOR'
  if (pathname === '/audit') return role === 'SUPERVISOR'

  if (pathname === '/seguimiento') return role === 'COORDINADOR' || role === 'PROFESIONAL' || role === 'SUPERVISOR'

  return false
}
