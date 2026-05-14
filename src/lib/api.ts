const DEFAULT_API_URL = 'http://localhost:3000'

export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL

type ApiError = Error & {
  status?: number
  payload?: unknown
}

export async function apiPost<TResponse, TBody>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = (isJson ? await response.json() : await response.text()) as
    | TResponse
    | { message?: string }

  if (!response.ok) {
    const error = new Error(
      typeof payload === 'string'
        ? payload
        : payload?.message || `Request failed with status ${response.status}`,
    ) as ApiError
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload as TResponse
}
