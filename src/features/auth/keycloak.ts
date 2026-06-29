import Keycloak from 'keycloak-js'

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

export const logoutFromKeycloak = () =>
  keycloak.logout({
    redirectUri: window.location.origin,
  })

export const getKeycloakAccessRoles = () =>
  keycloak.tokenParsed?.realm_access?.roles ?? []

export const hasKeycloakAccessRole = () => {
  const requiredRole = import.meta.env.VITE_KEYCLOAK_ACCESS_ROLE
  if (!requiredRole) return true

  return getKeycloakAccessRoles().includes(requiredRole)
}

// Roles de aplicación del Grupo 12: resource_access.<clientId>.roles
// Ej: resource_access.p1.roles = ["admin"]
export const getKeycloakAppRoles = (): string[] => {
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'p1'
  const resourceAccess = keycloak.tokenParsed?.resource_access as
    | Record<string, { roles?: string[] }>
    | undefined
  return resourceAccess?.[clientId]?.roles ?? []
}

export const getKeycloakAppRole = (): string | null => {
  const roles = getKeycloakAppRoles()
  return roles[0] ?? null
}

export const getValidKeycloakToken = async () => {
  await initKeycloak()
  await keycloak.updateToken(30)

  if (!keycloak.token) {
    throw new Error('No hay token de Keycloak disponible.')
  }

  return keycloak.token
}
