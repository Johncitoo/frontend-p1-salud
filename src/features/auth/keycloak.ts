import Keycloak from 'keycloak-js'
import { clearAllDrafts } from '@/features/ficha-clinica/draftStorage'

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'sistema-centralizado',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'app-1',
})

let initPromise: Promise<boolean> | null = null

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, message: string) =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs)
    }),
  ])

export const initKeycloak = () => {
  if (!initPromise) {
    initPromise = keycloak.init({
      onLoad: 'login-required',
      pkceMethod: 'S256',
      checkLoginIframe: false,
    })
  }

  return initPromise
}

export const initKeycloakWithTimeout = (timeoutMs = 2500) =>
  withTimeout(
    initKeycloak(),
    timeoutMs,
    'Keycloak no respondió a tiempo. Revisa VITE_KEYCLOAK_URL o si el Proyecto 12 está arriba.',
  )

export const loginWithKeycloak = async () => {
  await initKeycloakWithTimeout()

  return keycloak.login({
    redirectUri: window.location.origin,
  })
}

export const logoutFromKeycloak = () => {
  // Datos clínicos (borradores de fichas) no deben sobrevivir al cierre de sesión en
  // un equipo compartido — ver draftStorage.ts.
  clearAllDrafts()

  return keycloak.logout({
    redirectUri: window.location.origin,
  })
}

export const getKeycloakAccessRoles = () =>
  keycloak.tokenParsed?.realm_access?.roles ?? []

export const hasKeycloakAccessRole = () => {
  const requiredRole = import.meta.env.VITE_KEYCLOAK_ACCESS_ROLE
  if (!requiredRole) return true

  return getKeycloakAccessRoles().includes(requiredRole)
}

export const getValidKeycloakToken = async () => {
  await initKeycloak()
  await keycloak.updateToken(30)

  if (!keycloak.token) {
    throw new Error('No hay token de Keycloak disponible.')
  }

  return keycloak.token
}

// Evento global para avisar que la sesión de Keycloak expiró (el refresh falló:
// refresh token vencido/revocado, o Keycloak no respondió). api.ts lo dispara en vez
// de mandar la petición sin Authorization; AuthSessionContext lo escucha para sacar
// al usuario a una pantalla de "sesión expirada" en vez de dejar que la petición
// falle con un 401 disfrazado de error de red genérico.
export const SESSION_EXPIRED_EVENT = 'kc-session-expired'

export const reportSessionExpired = (message: string) => {
  window.dispatchEvent(new CustomEvent<string>(SESSION_EXPIRED_EVENT, { detail: message }))
}
