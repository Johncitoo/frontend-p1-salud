import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import {
  getKeycloakAccessRoles,
  hasKeycloakAccessRole,
  initKeycloakWithTimeout,
  keycloak,
  logoutFromKeycloak,
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
