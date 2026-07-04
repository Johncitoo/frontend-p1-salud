// @vitest-environment jsdom

import React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

let lastCalendarProps: any = null

vi.mock('react-big-calendar', () => ({
  Views: { MONTH: 'month', WEEK: 'week' },
  dateFnsLocalizer: () => ({}),
  Calendar: (props: any) => {
    lastCalendarProps = props
    return (
      <div data-testid='calendar'>
        <button type='button' onClick={() => props.onSelectEvent?.(props.events[0])}>
          Abrir visita
        </button>
        <span>{props.events[0]?.title}</span>
      </div>
    )
  },
}))

import CalendarView, { CalendarVisitRow } from './CalendarView'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const visit: CalendarVisitRow = {
  id: 'visit-1',
  estado: 'PROGRAMADA',
  prioridad: 'NORMAL',
  fechaProgramada: '2026-07-01',
  horaProgramada: '09:00:00',
  duracionEstimadaMin: 60,
  pacienteId: 'patient-1',
  pacienteNombres: 'Maria',
  pacienteApellidos: 'Rojas',
  pacienteRut: '12.345.678-9',
  pacienteTelefono: '+56911111111',
  profesionalSaludId: 'professional-1',
  profesionalNombres: 'Ana',
  profesionalApellidos: 'Silva',
  profesionalProfesion: 'ENFERMERIA',
  zonaId: 'zone-1',
  zonaNombre: 'Zona Norte',
  direccion: 'Los Robles 45',
  prestaciones: [{ id: 'prest-1', nombre: 'Control de signos vitales', cantidad: 1 }],
  googleCalendarSyncStatus: 'SYNCED',
  startsAt: '2026-07-01T09:00:00',
  endsAt: '2026-07-01T10:00:00',
}

const render = async (ui: React.ReactElement) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(ui)
  })
  return { host, root }
}

const click = async (element: Element | null) => {
  if (!element) throw new Error('Elemento no encontrado')
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

let mounted: Root[] = []

afterEach(() => {
  for (const root of mounted) {
    act(() => root.unmount())
  }
  mounted = []
  document.body.innerHTML = ''
  lastCalendarProps = null
})

describe('CalendarView', () => {
  it('configura calendario semanal/mensual lunes-domingo y horario operativo', async () => {
    const rendered = await render(<CalendarView visits={[visit]} />)
    mounted.push(rendered.root)

    expect(lastCalendarProps.defaultView).toBe('week')
    expect(lastCalendarProps.views).toEqual(['month', 'week'])
    expect(lastCalendarProps.firstDay).toBe(1)
    expect(lastCalendarProps.allDaySlot).toBe(false)
    expect(lastCalendarProps.min.getHours()).toBe(5)
    expect(lastCalendarProps.max.getHours()).toBe(23)
    expect(lastCalendarProps.events[0]).toEqual(expect.objectContaining({
      id: visit.id,
      title: 'Maria Rojas',
      resource: visit,
    }))
  })

  it('abre detalle con datos enriquecidos y permite editar la visita seleccionada', async () => {
    const onSelectVisit = vi.fn()
    const rendered = await render(<CalendarView visits={[visit]} onSelectVisit={onSelectVisit} />)
    mounted.push(rendered.root)

    await click(rendered.host.querySelector('button'))

    expect(document.body.textContent).toContain('Maria Rojas')
    expect(document.body.textContent).toContain('12.345.678-9')
    expect(document.body.textContent).toContain('ENFERMERIA')
    expect(document.body.textContent).toContain('Los Robles 45')
    expect(document.body.textContent).toContain('Control de signos vitales')

    const editButton = Array.from(document.body.querySelectorAll('button'))
      .find(button => button.textContent?.includes('Editar visita'))
    await click(editButton ?? null)

    expect(onSelectVisit).toHaveBeenCalledWith(visit)
  })

  it('colorea eventos por estado para distinguir agenda visualmente', async () => {
    const rendered = await render(<CalendarView visits={[{ ...visit, estado: 'CANCELADA' }]} />)
    mounted.push(rendered.root)

    const style = lastCalendarProps.eventPropGetter(lastCalendarProps.events[0]).style
    expect(style.backgroundColor).toBe('#dc2626')
    expect(style.color).toBe('white')
  })
})
