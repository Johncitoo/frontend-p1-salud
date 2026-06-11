type StoredDraft<T> = {
  savedAt: string
  value: T
}

const DRAFT_PREFIX = 'salud-en-casa:fichas:'

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
    return JSON.parse(raw) as StoredDraft<T>
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
