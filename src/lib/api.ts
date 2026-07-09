import { getMockAuthHeaders } from '@/features/auth/mockAuth'
import { getValidKeycloakToken, reportSessionExpired } from '@/features/auth/keycloak'

const DEFAULT_API_URL = 'http://localhost:3000'
export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL

// Debe coincidir con el chequeo de AuthSessionContext (ver AUTH_MODE ahí): en modo
// mock nunca se debe intentar Keycloak, y en modo keycloak un fallo real de sesión
// nunca debe caer a headers mock (el backend en AUTH_MODE=keycloak los ignora de
// todas formas, así que solo produce un 401 disfrazado de "error de red").
const IS_MOCK = (import.meta.env.VITE_AUTH_MODE as string) === 'mock'

const FETCH_TIMEOUT_MS = 30_000 // 30 seconds

type ApiError = Error & {
  status?: number
  payload?: unknown
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La solicitud excedió el tiempo de espera')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

async function parseApiResponse<TResponse>(response: Response): Promise<TResponse> {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = (isJson ? await response.json() : await response.text()) as
    | TResponse
    | { message?: string | string[] }

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : Array.isArray(payload?.message)
          ? payload.message.join(', ')
          : payload?.message || `Request failed with status ${response.status}`

    const error = new Error(message) as ApiError
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload as TResponse
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (IS_MOCK) {
    return getMockAuthHeaders()
  }

  try {
    const token = await getValidKeycloakToken()
    return { Authorization: `Bearer ${token}` }
  } catch (error) {
    // El refresh de Keycloak falló (refresh token vencido/revocado, o Keycloak no
    // respondió): esto es una sesión expirada, no un error de red genérico. Avisamos
    // a AuthSessionContext para que redirija a login con un mensaje claro, en vez de
    // mandar la petición sin Authorization y dejar que el backend la rechace con un
    // 401 que el usuario ve como un fallo aleatorio.
    console.error('Fallo al renovar el token de Keycloak:', error)
    const message = 'Tu sesión expiró. Inicia sesión de nuevo para continuar.'
    reportSessionExpired(message)
    throw new Error(message)
  }
}

export async function apiPostForm<TResponse>(
  path: string,
  body: FormData,
): Promise<TResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body,
  })

  return parseApiResponse<TResponse>(response)
}

export async function apiGetBlob(path: string): Promise<{ blob: Blob; filename: string }> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    headers: await getAuthHeaders(),
  })

  if (!response.ok) {
    await parseApiResponse<never>(response)
  }

  const disposition = response.headers.get('content-disposition') ?? ''
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i)
  const filename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : 'documento'

  return {
    blob: await response.blob(),
    filename,
  }
}

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    headers: await getAuthHeaders(),
  })

  return parseApiResponse<TResponse>(response)
}

export async function apiPost<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify(body),
  })

  return parseApiResponse<TResponse>(response)
}

export async function apiPatch<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify(body),
  })

  return parseApiResponse<TResponse>(response)
}

export async function apiDelete<TResponse>(path: string): Promise<TResponse> {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: await getAuthHeaders(),
  })

  return parseApiResponse<TResponse>(response)
}

export interface CurrentUserProfile {
  id: string
  identityUserId: string
  nombres: string
  apellidos: string
  email: string
  rol: string
  activo: boolean
}

export async function fetchCurrentUser(accessToken?: string): Promise<CurrentUserProfile> {
  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : await getAuthHeaders()),
    },
  })

  const payload = (await response.json()) as CurrentUserProfile | { message?: string }

  if (!response.ok) {
    throw new Error(
      'message' in payload && payload.message
        ? payload.message
        : `Request failed with status ${response.status}`,
    )
  }

  return payload as CurrentUserProfile
}
