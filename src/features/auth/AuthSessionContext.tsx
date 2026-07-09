import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { createLocalMockProfile, getMockSession } from './mockAuth'
import {
  getKeycloakAccessRoles,
  hasKeycloakAccessRole,
  initKeycloakWithTimeout,
  keycloak,
  logoutFromKeycloak,
  SESSION_EXPIRED_EVENT,
} from './keycloak'
import { fetchCurrentUser, type CurrentUserProfile } from '@/lib/api'

export type AppRole = 'ADMIN' | 'COORDINADOR' | 'PROFESIONAL' | 'SUPERVISOR'

type AuthStatus = 'loading' | 'authenticated' | 'access-denied' | 'error'

type AuthSessionContextValue = {
  status: AuthStatus
  profile: CurrentUserProfile | null
  keycloakRoles: string[]
  error: string | null
  logout: () => void
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE as string
const IS_MOCK = AUTH_MODE === 'mock'

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null)
  const [keycloakRoles, setKeycloakRoles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      setStatus('loading')
      setError(null)

      // ── Modo mock: no tocar Keycloak ──
      if (IS_MOCK) {
        const session = getMockSession()
        if (!cancelled) {
          if (session) {
            setProfile(createLocalMockProfile(session))
            setStatus('authenticated')
          } else {
            // Sin sesión mock → la landing redirige al login normalmente
            setStatus('authenticated')
          }
        }
        return
      }

      // ── Modo Keycloak real ──
      try {
        const authenticated = await initKeycloakWithTimeout(6000)
        if (cancelled) return

        if (!authenticated) {
          keycloak.login({ redirectUri: window.location.origin })
          return
        }

        const roles = getKeycloakAccessRoles()
        setKeycloakRoles(roles)

        if (!hasKeycloakAccessRole()) {
          setStatus('access-denied')
          return
        }

        const currentUser = await fetchCurrentUser(keycloak.token)
        if (cancelled) return

        setProfile(currentUser)
        setStatus('authenticated')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'No fue posible iniciar sesion.')
        setStatus('error')
      }
    }

    boot()

    return () => {
      cancelled = true
    }
  }, [])

  // api.ts dispara esto cuando el refresh de Keycloak falla a mitad de una petición
  // (sesión expirada): en vez de dejar que esa petición siga con un 401 disfrazado de
  // error de red, sacamos al usuario a la pantalla de error con un mensaje claro y el
  // botón "Cerrar sesion" (ya presente para access-denied/error) para volver a loguearse.
  useEffect(() => {
    if (IS_MOCK) return

    const handleSessionExpired = (event: Event) => {
      const message = (event as CustomEvent<string>).detail
      setProfile(null)
      setError(message || 'Tu sesión expiró. Inicia sesión de nuevo.')
      setStatus('error')
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [])

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      status,
      profile,
      keycloakRoles,
      error,
      logout: logoutFromKeycloak,
    }),
    [error, keycloakRoles, profile, status],
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext)
  if (!context) throw new Error('useAuthSession debe usarse dentro de AuthSessionProvider')

  return context
}

export function useCurrentUser() {
  const { profile } = useAuthSession()
  if (!profile) throw new Error('No hay perfil autenticado disponible')

  return profile
}
