type StoredDraft<T> = {
  savedAt: string
  value: T
}

const DRAFT_PREFIX = 'salud-en-casa:fichas:'

// Los borradores contienen datos clínicos de pacientes en texto plano dentro de
// localStorage. En equipos compartidos (tablets institucionales, cambio de turno) no
// deben sobrevivir más que un turno de trabajo: expiran solos (ver readDraft) y se
// borran por completo al cerrar sesión (ver clearAllDrafts, usado por keycloak.ts y
// mockAuth.ts).
const DRAFT_TTL_MS = 8 * 60 * 60 * 1000 // 8 horas

const getDraftKey = (key: string) => `${DRAFT_PREFIX}${key}`

export const saveDraft = <T>(key: string, value: T) => {
  try {
    const payload: StoredDraft<T> = {
      savedAt: new Date().toISOString(),
      value,
    }
    window.localStorage.setItem(getDraftKey(key), JSON.stringify(payload))
  } catch {
    // Si el navegador bloquea localStorage, la app sigue funcionando sin borrador local.
  }
}

export const readDraft = <T>(key: string): StoredDraft<T> | null => {
  try {
    const raw = window.localStorage.getItem(getDraftKey(key))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDraft<T>

    const savedAtMs = new Date(parsed.savedAt).getTime()
    if (!Number.isFinite(savedAtMs) || Date.now() - savedAtMs > DRAFT_TTL_MS) {
      window.localStorage.removeItem(getDraftKey(key))
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const clearDraft = (key: string) => {
  try {
    window.localStorage.removeItem(getDraftKey(key))
  } catch {
    // Nada que limpiar si localStorage no esta disponible.
  }
}

// Borra TODOS los borradores de fichas clínicas guardados en este navegador. Se llama
// al cerrar sesión: en un equipo compartido no deben quedar datos clínicos de un
// profesional legibles para el siguiente que use el mismo navegador/tablet.
export const clearAllDrafts = () => {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key?.startsWith(DRAFT_PREFIX)) keysToRemove.push(key)
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // Nada que limpiar si localStorage no esta disponible.
  }
}
