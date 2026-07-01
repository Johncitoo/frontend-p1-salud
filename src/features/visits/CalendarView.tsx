import { useMemo, useState } from 'react'
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar'
import { CalendarClock, ChevronLeft, ChevronRight, ClipboardList, Clock, MapPin, Pencil, Phone, Stethoscope, UserRound, X } from 'lucide-react'
import { format, getDay, parse, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  es: es,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
})

export type CalendarVisitRow = {
  id: string
  estado: string
  prioridad: string
  fechaProgramada: string
  horaProgramada: string
  duracionEstimadaMin: number
  pacienteId: string
  pacienteNombres: string
  pacienteApellidos: string
  pacienteRut?: string | null
  pacienteTelefono?: string | null
  profesionalSaludId: string
  profesionalNombres: string
  profesionalApellidos: string
  profesionalProfesion?: string | null
  zonaId?: string | null
  zonaNombre?: string | null
  direccion?: string | null
  prestaciones?: Array<{
    id: string
    codigo?: string | null
    nombre?: string | null
    cantidad?: number | null
    estado?: string | null
    duracionEstimadaMin?: number | null
  }>
  googleCalendarSyncStatus: string | null
  startsAt: string
  endsAt: string
}

type CalendarViewProps = {
  visits: CalendarVisitRow[]
  onSelectVisit?: (visit: CalendarVisitRow) => void
}

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resource: CalendarVisitRow
}

const statusColor = (estado: string) => {
  switch (estado) {
    case 'REALIZADA':
      return '#059669'
    case 'EN_ATENCION':
      return '#2563eb'
    case 'CANCELADA':
      return '#dc2626'
    case 'REPROGRAMADA':
      return '#d97706'
    default:
      return '#3C6E71'
  }
}

const statusLabel = (estado: string) => {
  if (estado === 'EN_ATENCION') return 'En atencion'
  if (estado === 'REALIZADA') return 'Realizada'
  if (estado === 'CANCELADA') return 'Cancelada'
  if (estado === 'REPROGRAMADA') return 'Reprogramada'
  return 'Programada'
}

const CalendarToolbar = ({ label, view, onNavigate, onView }: any) => (
  <div className='agenda-calendar-toolbar'>
    <div className='agenda-calendar-nav'>
      <button type='button' onClick={() => onNavigate('TODAY')} className='agenda-calendar-today'>
        Hoy
      </button>
      <div className='agenda-calendar-arrows'>
        <button type='button' onClick={() => onNavigate('PREV')} aria-label='Periodo anterior'>
          <ChevronLeft className='size-4' />
        </button>
        <button type='button' onClick={() => onNavigate('NEXT')} aria-label='Periodo siguiente'>
          <ChevronRight className='size-4' />
        </button>
      </div>
      <h2>{label}</h2>
    </div>

    <div className='agenda-calendar-view-switch' aria-label='Vista de calendario'>
      {[
        { key: Views.MONTH, label: 'Mes' },
        { key: Views.WEEK, label: 'Semana' },
      ].map(item => (
        <button
          key={item.key}
          type='button'
          onClick={() => onView(item.key)}
          className={view === item.key ? 'is-active' : ''}
        >
          {item.label}
        </button>
      ))}
    </div>
  </div>
)

const CalendarEventContent = ({ event }: { event: CalendarEvent }) => {
  const visit = event.resource
  const timeRange = `${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`
  return (
    <div className='agenda-calendar-event-content'>
      <span className='agenda-calendar-event-time'>{timeRange}</span>
      <strong>{event.title}</strong>
      <span>{visit.zonaNombre || statusLabel(visit.estado)}</span>
    </div>
  )
}

export default function CalendarView({ visits, onSelectVisit }: CalendarViewProps) {
  const [selectedVisit, setSelectedVisit] = useState<CalendarVisitRow | null>(null)

  const events = useMemo(() => {
    return visits.map(visit => ({
      id: visit.id,
      title: `${visit.pacienteNombres} ${visit.pacienteApellidos}`,
      start: new Date(visit.startsAt),
      end: new Date(visit.endsAt),
      resource: visit,
    }))
  }, [visits])

  const eventStyleGetter = (event: CalendarEvent) => {
    const backgroundColor = statusColor(event.resource.estado)
    return {
      style: {
        backgroundColor,
        borderRadius: '7px',
        opacity: 1,
        color: 'white',
        border: `1px solid ${backgroundColor}`,
        display: 'block',
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.14)',
      },
    }
  }

  const selectedEvent = selectedVisit
    ? events.find(event => event.resource.id === selectedVisit.id)
    : null

  const selectedStart = selectedEvent?.start ? format(selectedEvent.start, 'dd-MM-yyyy HH:mm') : selectedVisit?.fechaProgramada
  const selectedEnd = selectedEvent?.end ? format(selectedEvent.end, 'HH:mm') : null

  return (
    <div className='agenda-calendar-shell'>
      <style>{`
        .agenda-calendar-shell {
          height: min(860px, calc(100svh - 9rem));
          min-height: 680px;
          width: 100%;
          overflow: hidden;
          border: 1px solid rgba(203, 213, 225, 0.95);
          border-radius: 8px;
          background: #ffffff !important;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.16);
          padding: 18px;
          color: #0f172a;
        }

        .rbc-calendar {
          font-family: inherit;
          color: #0f172a;
          background: #ffffff;
        }

        .agenda-calendar-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 0 16px;
        }

        .agenda-calendar-nav {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 12px;
        }

        .agenda-calendar-nav h2 {
          margin: 0;
          color: #0f172a !important;
          font-size: 20px;
          font-weight: 750;
          line-height: 1.2;
          letter-spacing: 0;
        }

        .agenda-calendar-today,
        .agenda-calendar-arrows button,
        .agenda-calendar-view-switch button {
          height: 38px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
          transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
        }

        .agenda-calendar-today:hover,
        .agenda-calendar-arrows button:hover,
        .agenda-calendar-view-switch button:hover {
          border-color: #3C6E71;
          color: #284B63;
          background: #f8fafc;
        }

        .agenda-calendar-today {
          border-radius: 999px;
          padding: 0 18px;
        }

        .agenda-calendar-arrows {
          display: flex;
          overflow: hidden;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: #ffffff;
        }

        .agenda-calendar-arrows button {
          display: grid;
          width: 38px;
          place-items: center;
          border: 0;
          border-radius: 0;
          padding: 0;
        }

        .agenda-calendar-view-switch {
          display: flex;
          gap: 4px;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: #f8fafc;
          padding: 4px;
        }

        .agenda-calendar-view-switch button {
          min-width: 88px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          padding: 0 14px;
        }

        .agenda-calendar-view-switch button.is-active {
          background: #284B63;
          color: #ffffff;
          box-shadow: none;
        }

        .rbc-time-view,
        .rbc-month-view {
          overflow: hidden;
          border: 1px solid #dbe4ea;
          border-radius: 8px;
          background: #ffffff;
        }

        .rbc-time-header {
          border-right: 0;
        }

        .rbc-time-header-gutter,
        .rbc-time-gutter {
          flex: 0 0 56px !important;
          width: 56px !important;
          min-width: 56px !important;
          max-width: 56px !important;
        }

        .rbc-time-header-content {
          border-left: 1px solid #dbe4ea;
        }

        .rbc-time-view .rbc-time-header-content > .rbc-row:not(:first-child),
        .rbc-time-view .rbc-allday-cell {
          display: none;
        }

        .rbc-time-view .rbc-time-header-gutter {
          border-bottom: 1px solid #dbe4ea;
        }

        .rbc-header {
          min-height: 46px;
          border-color: #dbe4ea !important;
          background: #f8fafc;
          color: #334155;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.02em;
          text-transform: capitalize;
        }

        .rbc-header a {
          color: #0f172a;
          text-decoration: none;
        }

        .rbc-time-header,
        .rbc-time-content,
        .rbc-month-row,
        .rbc-day-bg,
        .rbc-time-slot,
        .rbc-timeslot-group {
          border-color: #e2e8f0 !important;
        }

        .rbc-time-content {
          border-top: 1px solid #dbe4ea;
          scrollbar-color: #94a3b8 #f1f5f9;
        }

        .rbc-time-gutter,
        .rbc-label {
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }

        .rbc-time-gutter .rbc-timeslot-group {
          align-items: center;
        }

        .rbc-today {
          background: #eaf7f7 !important;
        }

        .rbc-off-range-bg {
          background: #f8fafc;
        }

        .rbc-off-range {
          color: #94a3b8;
        }

        .rbc-current-time-indicator {
          height: 2px;
          background: #ef4444;
        }

        .rbc-current-time-indicator::before {
          content: '';
          position: absolute;
          left: -5px;
          top: -4px;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #ef4444;
        }

        .rbc-event {
          min-height: 34px;
          padding: 5px 7px;
          cursor: pointer;
          transition: box-shadow 160ms ease, transform 160ms ease, filter 160ms ease;
        }

        .rbc-event:hover {
          filter: saturate(1.05);
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.22) !important;
        }

        .rbc-event:focus {
          outline: 3px solid rgba(60, 110, 113, 0.28);
        }

        .rbc-event-label {
          display: none;
        }

        .rbc-event-content {
          min-width: 0;
          height: 100%;
        }

        .agenda-calendar-event-content {
          display: grid;
          gap: 2px;
          min-width: 0;
          line-height: 1.05;
        }

        .agenda-calendar-event-content strong {
          overflow: hidden;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .agenda-calendar-event-content span {
          overflow: hidden;
          color: rgba(255, 255, 255, 0.9);
          font-size: 11px;
          font-weight: 650;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .agenda-calendar-event-content .agenda-calendar-event-time {
          color: rgba(255, 255, 255, 0.96);
          font-size: 11px;
          font-weight: 850;
        }

        .rbc-month-view .rbc-event {
          min-height: 26px;
          padding: 4px 6px;
        }

        .rbc-month-view .agenda-calendar-event-content {
          display: block;
        }

        .rbc-month-view .agenda-calendar-event-content .agenda-calendar-event-time,
        .rbc-month-view .agenda-calendar-event-content span:not(.agenda-calendar-event-time) {
          display: none;
        }

        .rbc-month-view .rbc-date-cell {
          padding: 8px 10px 0 0;
          color: #334155;
          font-size: 13px;
          font-weight: 800;
        }

        .rbc-month-view .rbc-row-content {
          z-index: 2;
        }

        .rbc-show-more {
          color: #284B63;
          font-size: 12px;
          font-weight: 800;
        }

        @media (max-width: 760px) {
          .agenda-calendar-shell {
            height: 720px;
            padding: 12px;
          }

          .agenda-calendar-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .agenda-calendar-nav {
            flex-wrap: wrap;
          }

          .agenda-calendar-view-switch button {
            flex: 1;
            min-width: 0;
          }
        }

        .agenda-visit-dialog-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: grid;
          place-items: center;
          background: rgba(15, 23, 42, 0.45);
          padding: 18px;
        }

        .agenda-visit-dialog {
          width: min(520px, 100%);
          overflow: hidden;
          border: 1px solid rgba(203, 213, 225, 0.95);
          border-radius: 10px;
          background: #ffffff;
          box-shadow: 0 28px 70px rgba(15, 23, 42, 0.32);
          color: #0f172a;
        }

        .agenda-visit-dialog header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid #e2e8f0;
          padding: 18px 20px;
        }

        .agenda-visit-dialog h3 {
          margin: 0;
          color: #0f172a;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0;
        }

        .agenda-visit-dialog-close {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: #ffffff;
          color: #475569;
        }

        .agenda-visit-dialog-close:hover {
          background: #f8fafc;
          color: #0f172a;
        }

        .agenda-visit-dialog-body {
          display: grid;
          gap: 12px;
          padding: 18px 20px 20px;
        }

        .agenda-visit-detail-row {
          display: grid;
          grid-template-columns: 24px 1fr;
          gap: 10px;
          align-items: start;
          border-radius: 8px;
          background: #f8fafc;
          padding: 11px 12px;
        }

        .agenda-visit-detail-row svg {
          margin-top: 1px;
          color: #3C6E71;
        }

        .agenda-visit-detail-row span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .agenda-visit-detail-row strong {
          display: block;
          margin-top: 2px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 750;
        }

        .agenda-visit-detail-row small {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 650;
        }

        .agenda-visit-prestations {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .agenda-visit-prestations strong {
          margin: 0;
          border-radius: 999px;
          background: #eaf7f7;
          padding: 5px 8px;
          color: #284B63;
          font-size: 12px;
          font-weight: 800;
        }

        .agenda-visit-dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          border-top: 1px solid #e2e8f0;
          padding: 14px 20px 18px;
        }

        .agenda-visit-dialog-footer button {
          display: inline-flex;
          height: 40px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 8px;
          padding: 0 14px;
          font-size: 13px;
          font-weight: 800;
        }

        .agenda-visit-edit-button {
          border: 1px solid #284B63;
          background: #284B63;
          color: #ffffff;
        }

        .agenda-visit-edit-button:hover {
          background: #203C50;
        }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor='start'
        endAccessor='end'
        style={{ height: '100%' }}
        culture='es'
        defaultView={Views.WEEK}
        views={[Views.MONTH, Views.WEEK]}
        firstDay={1}
        min={new Date(1970, 0, 1, 5, 0)}
        max={new Date(1970, 0, 1, 23, 0)}
        step={30}
        timeslots={2}
        popup
        showMultiDayTimes
        allDayAccessor={() => false}
        allDaySlot={false}
        formats={{
          dayFormat: 'dd EEE',
          weekdayFormat: 'EEEE',
          timeGutterFormat: 'HH:mm',
          eventTimeRangeFormat: ({ start, end }, culture, formatter) =>
            `${formatter?.format(start, 'HH:mm', culture)} - ${formatter?.format(end, 'HH:mm', culture)}`,
        }}
        components={{
          toolbar: CalendarToolbar,
          event: CalendarEventContent,
        }}
        messages={{
          next: 'Siguiente',
          previous: 'Anterior',
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          noEventsInRange: 'No hay visitas programadas en este rango.',
          showMore: (total) => `+${total} más`,
        }}
        eventPropGetter={eventStyleGetter}
        onSelectEvent={event => setSelectedVisit(event.resource as CalendarVisitRow)}
      />

      {selectedVisit ? (
        <div className='agenda-visit-dialog-backdrop' role='dialog' aria-modal='true' onMouseDown={() => setSelectedVisit(null)}>
          <section className='agenda-visit-dialog' onMouseDown={event => event.stopPropagation()}>
            <header>
              <div>
                <h3>{selectedVisit.pacienteNombres} {selectedVisit.pacienteApellidos}</h3>
                <p className='mt-1 text-sm font-semibold text-slate-500'>{statusLabel(selectedVisit.estado)} · {selectedVisit.prioridad}</p>
              </div>
              <button type='button' className='agenda-visit-dialog-close' onClick={() => setSelectedVisit(null)} aria-label='Cerrar detalle'>
                <X className='size-4' />
              </button>
            </header>

            <div className='agenda-visit-dialog-body'>
              <div className='agenda-visit-detail-row'>
                <CalendarClock className='size-5' />
                <div>
                  <span>Horario</span>
                  <strong>{selectedStart}{selectedEnd ? ` - ${selectedEnd}` : ''} · {selectedVisit.duracionEstimadaMin ?? 60} min</strong>
                </div>
              </div>
              <div className='agenda-visit-detail-row'>
                <UserRound className='size-5' />
                <div>
                  <span>Paciente</span>
                  <strong>{selectedVisit.pacienteRut || 'Sin RUT registrado'}</strong>
                  <small>{selectedVisit.pacienteTelefono || 'Sin telefono registrado'}</small>
                </div>
              </div>
              <div className='agenda-visit-detail-row'>
                <Stethoscope className='size-5' />
                <div>
                  <span>Profesional</span>
                  <strong>{selectedVisit.profesionalNombres || selectedVisit.profesionalApellidos ? `${selectedVisit.profesionalNombres} ${selectedVisit.profesionalApellidos}` : 'Sin profesional registrado'}</strong>
                  <small>{selectedVisit.profesionalProfesion || 'Sin profesion registrada'}</small>
                </div>
              </div>
              <div className='agenda-visit-detail-row'>
                <MapPin className='size-5' />
                <div>
                  <span>Zona</span>
                  <strong>{selectedVisit.zonaNombre || 'Sin zona asignada'}</strong>
                  <small>{selectedVisit.direccion || 'Sin direccion registrada'}</small>
                </div>
              </div>
              <div className='agenda-visit-detail-row'>
                <ClipboardList className='size-5' />
                <div>
                  <span>Prestaciones</span>
                  {selectedVisit.prestaciones?.length ? (
                    <div className='agenda-visit-prestations'>
                      {selectedVisit.prestaciones.map(prestacion => (
                        <strong key={prestacion.id}>
                          {prestacion.nombre || prestacion.codigo || 'Prestacion'}
                          {prestacion.cantidad && prestacion.cantidad > 1 ? ` x${prestacion.cantidad}` : ''}
                        </strong>
                      ))}
                    </div>
                  ) : (
                    <strong>Sin prestaciones registradas</strong>
                  )}
                </div>
              </div>
              <div className='agenda-visit-detail-row'>
                <Clock className='size-5' />
                <div>
                  <span>Sincronizacion</span>
                  <strong>{selectedVisit.googleCalendarSyncStatus || 'Sin informacion de Google Calendar'}</strong>
                </div>
              </div>
            </div>

            {onSelectVisit ? (
              <footer className='agenda-visit-dialog-footer'>
                <button
                  type='button'
                  className='agenda-visit-edit-button'
                  onClick={() => {
                    onSelectVisit(selectedVisit)
                    setSelectedVisit(null)
                  }}
                >
                  <Pencil className='size-4' />
                  Editar visita
                </button>
              </footer>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}
