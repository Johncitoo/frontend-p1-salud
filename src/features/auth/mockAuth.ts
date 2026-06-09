import type { CurrentUserProfile } from '@/lib/api'

export type MockRole = 'ADMIN' | 'COORDINADOR' | 'PROFESIONAL' | 'SUPERVISOR'

export type MockUserOption = {
  role: MockRole
  label: string
  description: string
  identityUserId: string
}

const STORAGE_KEY = 'proyecto1_mock_auth'

export const mockUsers: MockUserOption[] = [
  {
    role: 'COORDINADOR',
    label: 'Coordinador',
    description: 'Gestiona pacientes, visitas y zonas operativas.',
    identityUserId: 'mock-coordinador',
  },
  {
    role: 'PROFESIONAL',
    label: 'Profesional',
    description: 'Consulta pacientes, zonas y datos asignados.',
    identityUserId: 'mock-profesional',
  },
  {
    role: 'SUPERVISOR',
    label: 'Supervisor',
    description: 'Supervisa operacion y puede cerrar registros sensibles.',
    identityUserId: 'mock-supervisor',
  },
  {
    role: 'ADMIN',
    label: 'Administrador',
    description: 'Administra usuarios y configuracion de seguridad.',
    identityUserId: 'mock-admin',
  },
]

export const getMockSession = (): MockUserOption | null => {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  return mockUsers.find(user => user.role === stored) ?? null
}

export const loginWithMockRole = (role: MockRole): MockUserOption => {
  const user = mockUsers.find(option => option.role === role)
  if (!user) throw new Error('Rol mock invalido')

  window.localStorage.setItem(STORAGE_KEY, user.role)
  return user
}

export const logoutMock = () => {
  window.localStorage.removeItem(STORAGE_KEY)
}

export const getMockAuthHeaders = (): Record<string, string> => {
  const session = getMockSession()
  if (!session) return {}

  return {
    'x-identity-user-id': session.identityUserId,
    'x-mock-role': session.role,
  }
}

export const createLocalMockProfile = (session: MockUserOption): CurrentUserProfile => ({
  id: session.identityUserId,
  identityUserId: session.identityUserId,
  nombres: 'Usuario',
  apellidos: session.label,
  email: `${session.role.toLowerCase()}@mock.local`,
  rol: session.role,
  activo: true,
})

export const getMockProfileFromStorage = (): CurrentUserProfile | null => {
  const session = getMockSession()
  return session ? createLocalMockProfile(session) : null
}
