// @vitest-environment jsdom
import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FichaClinicaFormPage from './FichaClinicaFormPage'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { saveDraft, clearDraft } from './draftStorage'

// No import needed for MockAuthProvider

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  apiGet: mocks.apiGet,
  apiPatch: mocks.apiPatch,
  apiPost: mocks.apiPost,
}))

vi.mock('./draftStorage', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual as any,
    saveDraft: vi.fn(),
    clearDraft: vi.fn(),
  }
})

// mock window.location
Object.defineProperty(window, 'location', {
  value: { search: '?visitaId=v1', href: '' },
  writable: true,
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/features/auth/AuthSessionContext', () => ({
  useAuthSession: () => ({
    session: { user: { id: 'u1', name: 'user' } },
    login: vi.fn(),
    logout: vi.fn(),
  }),
  useCurrentUser: () => ({ id: 'u1', name: 'user' })
}))

describe('FichaClinicaFormPage - Draft & Optimistic Locking Bug Fixes', () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount()
      })
    }
    if (container) {
      document.body.removeChild(container)
    }
    container = null
    root = null
  })

  const clickButtonByText = async (text: string) => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes(text))
    if (!btn) throw new Error(`Button not found: ${text}`)
    await act(async () => {
      if (btn.type === 'submit') {
        const form = btn.closest('form')
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      } else {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }
    })
  }

  it('no sobreescribe la version del backend con la del borrador local al cargar', async () => {
    window.localStorage.setItem('salud-en-casa:fichas:ficha-draft-v1', JSON.stringify({
      savedAt: new Date().toISOString(),
      value: {
        pacienteId: 'p1',
        visitaId: 'v1',
        plantillaFichaId: 'plantilla1',
        fields: { 'peso': 70 },
        observaciones: 'Borrador viejo',
        currentVersion: 1, // STALE
        fichaEstado: 'BORRADOR'
      }
    }))

    mocks.apiGet.mockImplementation(async (url) => {
      if (url === '/plantillas-ficha') return [{ id: 'plantilla1', activa: true, campos: [] }]
      if (url === '/pacientes') return []
      if (url.includes('/visitas/')) return { id: 'v1', pacienteId: 'p1' }
      if (url.includes('/fichas-clinicas?visitaId=v1')) {
        return [{
          id: 'ficha1',
          visitaId: 'v1',
          plantillaFichaId: 'plantilla1',
          estado: 'BORRADOR',
          version: 2 // CORRECT VERSION
        }]
      }
      return []
    })

    await act(async () => {
      root!.render(<FichaClinicaFormPage visitaId="v1" />)
    })
    
    expect(document.body.textContent).toContain('Editar ficha clínica')
    expect(document.body.textContent).toContain('v2')

    mocks.apiPatch.mockResolvedValue({ version: 3, estado: 'CERRADA' })
    
    await clickButtonByText('Guardar y cerrar ficha')

    expect(mocks.apiPatch).toHaveBeenCalledWith(
      '/fichas-clinicas/ficha1?version=2',
      expect.any(Object)
    )
  })

})
