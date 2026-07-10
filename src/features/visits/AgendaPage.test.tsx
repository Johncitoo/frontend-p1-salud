// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  currentUser: {
    id: 'user-1',
    identityUserId: 'identity-1',
    nombres: 'Claudia',
    apellidos: 'Coordinadora',
    email: 'coord@test.cl',
    rol: 'COORDINADOR',
    activo: true,
  },
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('@/features/auth/AuthSessionContext', () => ({
  useCurrentUser: () => mocks.currentUser,
}))

vi.mock('@/lib/api', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiPatch: mocks.apiPatch,
  apiDelete: mocks.apiDelete,
}))

vi.mock('./CalendarView', () => ({
  default: ({ visits, onSelectVisit }: any) => (
    <section data-testid='calendar-view'>
      <span>Calendario mock</span>
      <span>{visits.length} visitas</span>
      <button type='button' onClick={() => onSelectVisit?.(visits[0])}>
        Seleccionar visita calendario
      </button>
    </section>
  ),
}))

import AgendaPage from './AgendaPage'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const visit = {
  id: 'visit-1',
  pacienteId: 'patient-1',
  profesionalSaludId: 'professional-1',
  zonaId: 'zone-1',
  fechaProgramada: '2026-07-01',
  horaProgramada: '09:00:00',
  duracionEstimadaMin: 60,
  estado: 'PROGRAMADA',
  prioridad: 'NORMAL',
}

const calendarVisit = {
  ...visit,
  pacienteNombres: 'Maria',
  pacienteApellidos: 'Rojas',
  profesionalNombres: 'Ana',
  profesionalApellidos: 'Silva',
  zonaNombre: 'Zona Norte',
  startsAt: '2026-07-01T09:00:00',
  endsAt: '2026-07-01T10:00:00',
  googleCalendarSyncStatus: 'SYNCED',
}

const patient = {
  id: 'patient-1',
  rut: '12.345.678-9',
  nombres: 'Maria',
  apellidos: 'Rojas',
}

const professional = {
  id: 'professional-1',
  usuarioId: 'professional-user-1',
  profesion: 'ENFERMERIA',
  numeroRegistro: 'REG-1',
  activo: true,
}

const zone = {
  id: 'zone-1',
  nombre: 'Zona Norte',
  comuna: 'Santiago',
  region: 'Metropolitana',
  activa: true,
}

const prestacion = {
  id: 'prest-1',
  codigo: 'CONTROL',
  nombre: 'Control de signos vitales',
  duracionEstimadaMin: 20,
  activa: true,
}

const visitPrestacion = {
  id: 'vp-1',
  visitaId: visit.id,
  prestacionId: prestacion.id,
  cantidad: 1,
  estado: 'PROGRAMADA',
  prestacion,
}

const setupApi = () => {
  mocks.apiGet.mockImplementation(async (path: string) => {
    if (path.startsWith('/visitas/calendario')) return [calendarVisit]
    if (path.startsWith('/visitas/') && path.endsWith('/prestaciones')) return [visitPrestacion]
    if (path.startsWith('/visitas')) return [visit]
    if (path === '/pacientes') return [patient]
    if (path === '/profesionales') return [professional]
    if (path === '/zonas') return [zone]
    if (path === '/prestaciones?activa=true') return [prestacion]
    if (path === '/google-calendar/status') return { isConnected: false, syncEnabled: false }
    if (path === '/usuarios') return []
    if (path.startsWith('/alertas')) return []
    throw new Error(`GET no mockeado: ${path}`)
  })
  mocks.apiPost.mockImplementation(async (path: string, body: any) => {
    if (path === '/visitas') return { ...visit, id: 'created-visit', ...body }
    if (path === '/visitas/created-visit/prestaciones') return { id: 'created-vp', visitaId: 'created-visit', ...body }
    throw new Error(`POST no mockeado: ${path}`)
  })
  mocks.apiPatch.mockImplementation(async (path: string, body: any) => ({ ...visit, ...body, id: path.split('/')[2] }))
  mocks.apiDelete.mockResolvedValue({ ok: true })
}

const render = async (ui: React.ReactElement) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(ui)
  })
  await act(async () => undefined)
  return { host, root }
}

const click = async (element: Element | null) => {
  if (!element) throw new Error('Elemento no encontrado')
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

const focus = async (element: Element | null) => {
  if (!element) throw new Error('Elemento no encontrado')
  await act(async () => {
    element.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    element.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
  })
}

const submit = async (form: HTMLFormElement | null) => {
  if (!form) throw new Error('Formulario no encontrado')
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

const findButton = (text: string) =>
  Array.from(document.body.querySelectorAll('button'))
    .find(button => button.textContent?.includes(text))

const typeInto = async (element: HTMLTextAreaElement | HTMLInputElement | null, value: string) => {
  if (!element) throw new Error('Elemento no encontrado')
  const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  await act(async () => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const findLabel = (text: string) =>
  Array.from(document.body.querySelectorAll('label'))
    .find(label => label.textContent?.includes(text))

let mounted: Root[] = []

beforeEach(() => {
  vi.clearAllMocks()
  setupApi()
  mocks.currentUser.rol = 'COORDINADOR'
  window.scrollTo = vi.fn()
})

afterEach(() => {
  for (const root of mounted) {
    act(() => root.unmount())
  }
  mounted = []
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('AgendaPage calendar flow', () => {
  it('carga calendario como vista predeterminada y consulta endpoint semanal/mensual', async () => {
    const rendered = await render(<AgendaPage />)
    mounted.push(rendered.root)

    expect(document.body.textContent).toContain('Calendario mock')
    expect(document.body.textContent).toContain('1 visitas')
    expect(mocks.apiGet).toHaveBeenCalledWith(expect.stringContaining('/visitas/calendario?'))
    expect(mocks.apiGet).toHaveBeenCalledWith('/pacientes')
    expect(mocks.apiGet).toHaveBeenCalledWith('/profesionales')
  })

  it('crea visita desde buscadores de paciente/profesional y sincroniza prestaciones seleccionadas', async () => {
    const rendered = await render(<AgendaPage />)
    mounted.push(rendered.root)

    await focus(rendered.host.querySelector('input[placeholder="Buscar paciente por nombre o RUT"]'))
    await click(findButton('Maria Rojas'))
    await focus(rendered.host.querySelector('input[placeholder="Buscar profesional o registro"]'))
    await click(findButton('ENFERMERIA'))
    await click(findLabel('Control de signos vitales') ?? null)
    await submit(rendered.host.querySelector('form'))

    expect(mocks.apiPost).toHaveBeenCalledWith('/visitas', expect.objectContaining({
      pacienteId: patient.id,
      profesionalSaludId: professional.id,
      fechaProgramada: expect.any(String),
      horaProgramada: '09:00',
      duracionEstimadaMin: 60,
      prioridad: 'NORMAL',
    }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/visitas/created-visit/prestaciones', { prestacionId: prestacion.id })
  })

  it('permite editar una visita al seleccionarla desde calendario', async () => {
    const rendered = await render(<AgendaPage />)
    mounted.push(rendered.root)

    await click(findButton('Seleccionar visita calendario'))
    await submit(rendered.host.querySelector('form'))

    expect(mocks.apiPatch).toHaveBeenCalledWith(`/visitas/${visit.id}`, expect.objectContaining({
      pacienteId: patient.id,
      profesionalSaludId: professional.id,
      fechaProgramada: '2026-07-01',
      horaProgramada: '09:00',
      duracionEstimadaMin: 60,
    }))
  })

  it('cancela una visita desde la lista abriendo el modal de motivo', async () => {
    const rendered = await render(<AgendaPage />)
    mounted.push(rendered.root)

    await click(findButton('Lista'))
    await click(findButton('Cancelar'))

    expect(document.body.textContent).toContain('Cancelar visita')
    await click(findButton('Cancelar visita'))

    expect(mocks.apiPatch).toHaveBeenCalledWith(`/visitas/${visit.id}/cancelar`, {
      observacionCancelacion: 'Cancelada desde agenda',
    })
  })

  it('incluye el motivo escrito por el usuario al cancelar', async () => {
    const rendered = await render(<AgendaPage />)
    mounted.push(rendered.root)

    await click(findButton('Lista'))
    await click(findButton('Cancelar'))

    const textarea = document.body.querySelector('textarea')
    await typeInto(textarea, 'Paciente hospitalizado')
    await click(findButton('Cancelar visita'))

    expect(mocks.apiPatch).toHaveBeenCalledWith(`/visitas/${visit.id}/cancelar`, {
      observacionCancelacion: 'Paciente hospitalizado',
    })
  })

  it('no cancela si el usuario cierra el modal con "Volver"', async () => {
    const rendered = await render(<AgendaPage />)
    mounted.push(rendered.root)

    await click(findButton('Lista'))
    await click(findButton('Cancelar'))
    await click(findButton('Volver'))

    expect(document.body.textContent).not.toContain('Cancelar visita')
    expect(mocks.apiPatch).not.toHaveBeenCalledWith(`/visitas/${visit.id}/cancelar`, expect.anything())
  })

  it('para profesional consulta Google Calendar y oculta formulario de creación', async () => {
    mocks.currentUser.rol = 'PROFESIONAL'
    const rendered = await render(<AgendaPage />)
    mounted.push(rendered.root)

    expect(mocks.apiGet).toHaveBeenCalledWith('/google-calendar/status')
    expect(document.body.textContent).toContain('Conectar Google Calendar')
    expect(rendered.host.querySelector('form')).toBeNull()
  })
})
