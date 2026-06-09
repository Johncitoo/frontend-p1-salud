import Keycloak from 'keycloak-js'

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'sistema-centralizado',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'proyecto-test',
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
      onLoad: 'check-sso',
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
