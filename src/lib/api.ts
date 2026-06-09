import { getMockAuthHeaders } from '@/features/auth/mockAuth'

const DEFAULT_API_URL = 'http://localhost:3000'
export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL

type ApiError = Error & {
  status?: number
  payload?: unknown
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

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: getMockAuthHeaders(),
  })

  return parseApiResponse<TResponse>(response)
}

export async function apiPost<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getMockAuthHeaders(),
    },
    body: JSON.stringify(body),
  })

  return parseApiResponse<TResponse>(response)
}

export async function apiPatch<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getMockAuthHeaders(),
    },
    body: JSON.stringify(body),
  })

  return parseApiResponse<TResponse>(response)
}

export async function apiDelete<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getMockAuthHeaders(),
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
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...getMockAuthHeaders(),
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
