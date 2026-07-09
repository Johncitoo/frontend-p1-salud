import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CircleCheck, Pencil, Search, XCircle, Calendar as CalendarIcon, List, Link as LinkIcon, RefreshCcw } from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import CalendarView, { CalendarVisitRow } from './CalendarView'
import SeguimientoAgendaPanel from './SeguimientoAgendaPanel'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

type VisitRow = {
  id: string
  pacienteId: string
  profesionalSaludId: string
  zonaId?: string | null
  fechaProgramada: string
  horaProgramada: string
  duracionEstimadaMin?: number | null
  estado: string
  prioridad: string
}

type PatientRow = {
  id: string
  rut: string
  nombres: string
  apellidos: string
}

type ProfessionalRow = {
  id: string
  usuarioId: string
  profesion: string
  numeroRegistro?: string | null
  activo: boolean
}

type ZoneRow = {
  id: string
  nombre: string
  comuna: string
  region: string
  activa: boolean
}

type PrestacionRow = {
  id: string
  codigo: string
  nombre: string
  descripcion?: string | null
  duracionEstimadaMin?: number | null
  activa: boolean
}

type VisitPrestacionRow = {
  id: string
  visitaId: string
  prestacionId: string
  cantidad: number
  estado: string
  observacion?: string | null
  prestacion?: PrestacionRow
}

type AvailableUser = {
  id: string
  nombres: string
  apellidos: string
  email: string
  rut: string
}

type VisitForm = {
  pacienteId: string
  profesionalSaludId: string
  zonaId: string
  fechaProgramada: string
  horaProgramada: string
  duracionEstimadaMin: string
  prioridad: string
  prestacionIds: string[]
}

type SearchableOption = {
  value: string
  label: string
  helper?: string
  searchText: string
}

const today = new Date().toISOString().slice(0, 10)

const emptyForm: VisitForm = {
  pacienteId: '',
  profesionalSaludId: '',
  zonaId: '',
  fechaProgramada: today,
  horaProgramada: '09:00',
  duracionEstimadaMin: '60',
  prioridad: 'NORMAL',
  prestacionIds: [],
}

const statusClass = (estado: string) => {
  if (estado === 'REALIZADA') return 'bg-emerald-100 text-emerald-800'
  if (estado === 'EN_ATENCION') return 'bg-blue-100 text-blue-800'
  if (estado === 'CANCELADA') return 'bg-red-100 text-red-800'
  if (estado === 'REPROGRAMADA') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('es-CL')

type SearchableSelectProps = {
  label: string
  value: string
  placeholder: string
  emptyLabel?: string
  options: SearchableOption[]
  onChange: (value: string) => void
}

const SearchableSelect = ({ label, value, placeholder, emptyLabel, options, onChange }: SearchableSelectProps) => {
  const selectedOption = options.find(option => option.value === value)
  const [query, setQuery] = useState(selectedOption?.label ?? '')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setQuery(selectedOption?.label ?? '')
  }, [selectedOption?.label])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleOptions = normalizedQuery
    ? options.filter(option => option.searchText.includes(normalizedQuery)).slice(0, 8)
    : options.slice(0, 8)

  return (
    <div className='relative text-sm font-semibold text-[#D9D9D9]'>
      <span>{label}</span>
      <div className='mt-1 flex h-11 items-center gap-2 rounded-lg border border-[#6f929b]/45 bg-[#173344]/75 px-3 text-white shadow-inner shadow-black/5 transition focus-within:border-[#9CBFC1] focus-within:bg-[#142f3f] focus-within:ring-2 focus-within:ring-[#9CBFC1]/15'>
        <Search className='size-4 shrink-0 text-[#9CBFC1]' />
        <input
          type='text'
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            setIsOpen(true)
            if (value) onChange('')
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          placeholder={placeholder}
          className='min-w-0 flex-1 border-none !bg-transparent p-0 text-sm font-semibold text-white outline-none placeholder:text-[#9CBFC1]'
          autoComplete='off'
        />
        {value ? (
          <button
            type='button'
            onMouseDown={event => event.preventDefault()}
            onClick={() => {
              onChange('')
              setQuery('')
              setIsOpen(true)
            }}
            className='rounded-md px-1.5 py-0.5 text-xs font-bold text-[#9CBFC1] hover:bg-white/10 hover:text-white'
            aria-label={`Limpiar ${label.toLowerCase()}`}
          >
            ×
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className='absolute left-0 right-0 z-40 mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#9CBFC1]/25 bg-[#f8fafc] p-1.5 shadow-xl shadow-slate-950/25'>
          {emptyLabel ? (
            <button
              type='button'
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                onChange('')
                setQuery('')
                setIsOpen(false)
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition hover:bg-[#e7f1f2] ${
                !value ? 'bg-[#d8e9ea] text-[#173344]' : 'text-[#36515d]'
              }`}
            >
              {emptyLabel}
            </button>
          ) : null}
          {visibleOptions.map(option => (
            <button
              key={option.value}
              type='button'
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                onChange(option.value)
                setQuery(option.label)
                setIsOpen(false)
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left transition hover:bg-[#e7f1f2] ${
                value === option.value ? 'bg-[#d8e9ea]' : ''
              }`}
            >
              <span className='block text-sm font-semibold text-[#173344]'>{option.label}</span>
              {option.helper ? <span className='mt-0.5 block text-xs font-medium text-[#5b7380]'>{option.helper}</span> : null}
            </button>
          ))}
          {visibleOptions.length === 0 ? (
            <p className='px-3 py-3 text-sm font-medium text-[#5b7380]'>Sin resultados.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

const AgendaPage = () => {
  const session = useCurrentUser()
  const canWrite = session.rol === 'ADMIN' || session.rol === 'COORDINADOR'
  const canChangeState = canWrite || session.rol === 'PROFESIONAL'
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([])
  const [zones, setZones] = useState<ZoneRow[]>([])
  const [prestaciones, setPrestaciones] = useState<PrestacionRow[]>([])
  const [allUsers, setAllUsers] = useState<AvailableUser[]>([])
  const [visitPrestaciones, setVisitPrestaciones] = useState<Record<string, VisitPrestacionRow[]>>({})
  const [form, setForm] = useState<VisitForm>(emptyForm)
  const [query, setQuery] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [fechaDesde, setFechaDesde] = useState(today)
  const [fechaHasta, setFechaHasta] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null)
  const [motivoModal, setMotivoModal] = useState<{ visit: VisitRow; accion: 'cancelar' | 'reprogramar' } | null>(null)
  const [motivoTexto, setMotivoTexto] = useState('')
  const [reprogFecha, setReprogFecha] = useState('')
  const [reprogHora, setReprogHora] = useState('')

  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('CALENDAR')
  const [calendarVisits, setCalendarVisits] = useState<CalendarVisitRow[]>([])
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<{ isConnected: boolean; syncEnabled: boolean } | null>(null)

  const patientById = useMemo(() => new Map(patients.map(patient => [patient.id, patient])), [patients])
  const professionalById = useMemo(() => new Map(professionals.map(professional => [professional.id, professional])), [professionals])
  const zoneById = useMemo(() => new Map(zones.map(zone => [zone.id, zone])), [zones])

  const patientOptions = useMemo<SearchableOption[]>(() => patients.map(patient => {
    const label = `${patient.nombres} ${patient.apellidos}`
    const helper = patient.rut
    return {
      value: patient.id,
      label,
      helper,
      searchText: `${label} ${helper}`.toLowerCase(),
    }
  }), [patients])

  const professionalOptions = useMemo<SearchableOption[]>(() => professionals.map(professional => {
    const user = allUsers.find(u => u.id === professional.usuarioId)
    const label = user ? `${user.nombres} ${user.apellidos} - ${professional.profesion}` : professional.profesion
    const helper = professional.numeroRegistro || 'Sin registro'
    return {
      value: professional.id,
      label,
      helper,
      searchText: `${label} ${helper}`.toLowerCase(),
    }
  }), [professionals, allUsers])

  const zoneOptions = useMemo<SearchableOption[]>(() => zones.map(zone => {
    const label = zone.nombre
    const helper = `${zone.comuna}, ${zone.region}`
    return {
      value: zone.id,
      label,
      helper,
      searchText: `${label} ${helper}`.toLowerCase(),
    }
  }), [zones])

  const loadData = () => {
    setIsLoading(true)
    setError('')

    const params = new URLSearchParams()
    if (estadoFilter) params.set('estado', estadoFilter)
    if (fechaDesde) params.set('fechaDesde', fechaDesde)
    if (fechaHasta) params.set('fechaHasta', fechaHasta)

    const calParams = new URLSearchParams()
    if (estadoFilter) calParams.set('estado', estadoFilter)
    if (fechaDesde) calParams.set('desde', fechaDesde)
    const calHasta = fechaHasta || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10)
    calParams.set('hasta', calHasta)

    const promises: Promise<any>[] = [
      apiGet<VisitRow[]>(`/visitas${params.toString() ? `?${params.toString()}` : ''}`),
      apiGet<CalendarVisitRow[]>(`/visitas/calendario${calParams.toString() ? `?${calParams.toString()}` : ''}`),
      apiGet<PatientRow[]>('/pacientes'),
      apiGet<ProfessionalRow[]>('/profesionales'),
      apiGet<ZoneRow[]>('/zonas'),
      apiGet<PrestacionRow[]>('/prestaciones?activa=true'),
      apiGet<AvailableUser[]>('/usuarios'),
    ]

    if (session.rol === 'PROFESIONAL') {
      promises.push(apiGet('/google-calendar/status').catch(() => null))
    }

    Promise.all(promises)
      .then(async ([visitRows, calRows, patientRows, professionalRows, zoneRows, prestacionRows, userRows, googleStatus]) => {
        const prestacionesEntries = await Promise.all(
          visitRows.map(async visit => {
            const rows = await apiGet<VisitPrestacionRow[]>(`/visitas/${visit.id}/prestaciones`)
            return [visit.id, rows] as const
          }),
        )

        setVisits(visitRows)
        setCalendarVisits(calRows)
        if (googleStatus) setGoogleCalendarStatus(googleStatus)
        setPatients(patientRows)
        setAllUsers(userRows)
        setProfessionals(professionalRows.filter(professional => professional.activo))
        setZones(zoneRows.filter(zone => zone.activa))
        setPrestaciones(prestacionRows.filter(prestacion => prestacion.activa))
        setVisitPrestaciones(Object.fromEntries(prestacionesEntries))
      })
      .catch(err => setError(err instanceof Error ? err.message : 'No fue posible cargar la agenda.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredVisits = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return visits

    return visits.filter(visit => {
      const patient = patientById.get(visit.pacienteId)
      const professional = professionalById.get(visit.profesionalSaludId)
      const zone = visit.zonaId ? zoneById.get(visit.zonaId) : null
      const haystack = [
        patient?.rut,
        patient?.nombres,
        patient?.apellidos,
        professional?.profesion,
        zone?.nombre,
        zone?.comuna,
        visit.estado,
        visit.prioridad,
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(normalized)
    })
  }, [patientById, professionalById, query, visits, zoneById])

  const syncVisitPrestaciones = async (visitId: string, selectedPrestacionIds: string[]) => {
    const currentRows = visitPrestaciones[visitId] ?? []
    const currentIds = new Set(currentRows.map(row => row.prestacionId))
    const selectedIds = new Set(selectedPrestacionIds)

    await Promise.all([
      ...selectedPrestacionIds
        .filter(prestacionId => !currentIds.has(prestacionId))
        .map(prestacionId =>
          apiPost<VisitPrestacionRow, { prestacionId: string }>(`/visitas/${visitId}/prestaciones`, { prestacionId }),
        ),
      ...currentRows
        .filter(row => !selectedIds.has(row.prestacionId))
        .map(row => apiDelete<VisitPrestacionRow>(`/visitas/${visitId}/prestaciones/${row.prestacionId}`)),
    ])
  }

  const resetVisitForm = () => {
    setForm(emptyForm)
    setEditingVisitId(null)
  }

  const handleEdit = (visit: VisitRow) => {
    setError('')
    setSuccessMsg('')
    setEditingVisitId(visit.id)
    setForm({
      pacienteId: visit.pacienteId,
      profesionalSaludId: visit.profesionalSaludId,
      zonaId: visit.zonaId ?? '',
      fechaProgramada: visit.fechaProgramada,
      horaProgramada: visit.horaProgramada?.slice(0, 5) ?? '09:00',
      duracionEstimadaMin: String(visit.duracionEstimadaMin ?? 60),
      prioridad: visit.prioridad,
      prestacionIds: (visitPrestaciones[visit.id] ?? [])
        .filter(item => item.estado !== 'CANCELADA')
        .map(item => item.prestacionId),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmitVisit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.pacienteId || !form.profesionalSaludId || !form.fechaProgramada || !form.horaProgramada) {
      setError('Completa paciente, profesional, fecha y hora.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccessMsg('')

    try {
      const payload = {
        pacienteId: form.pacienteId,
        profesionalSaludId: form.profesionalSaludId,
        zonaId: form.zonaId || undefined,
        fechaProgramada: form.fechaProgramada,
        horaProgramada: form.horaProgramada,
        duracionEstimadaMin: Number(form.duracionEstimadaMin || 60),
        prioridad: form.prioridad,
      }

      if (editingVisitId) {
        await apiPatch<VisitRow, Record<string, unknown>>(`/visitas/${editingVisitId}`, payload)
        await syncVisitPrestaciones(editingVisitId, form.prestacionIds)
        setSuccessMsg('Visita actualizada correctamente.')
      } else {
        const created = await apiPost<VisitRow, Record<string, unknown>>('/visitas', payload)
        await syncVisitPrestaciones(created.id, form.prestacionIds)
        setSuccessMsg('Visita creada correctamente.')
      }

      resetVisitForm()
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar la visita.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangeState = async (visit: VisitRow, estado: string) => {
    setError('')
    setSuccessMsg('')
    try {
      if (estado === 'REALIZADA') {
        const puntual = window.confirm('¿La visita fue puntual?')
        await apiPatch<VisitRow, { puntual: boolean }>(`/visitas/${visit.id}/completar`, { puntual })
        setSuccessMsg(puntual ? 'Visita marcada como realizada y puntual.' : 'Visita marcada como realizada.')
        loadData()
        return
      }

      await apiPatch<VisitRow, { estado: string }>(`/visitas/${visit.id}/estado`, { estado })
      setSuccessMsg(`Visita marcada como ${estado}.`)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar la visita.')
    }
  }

  const handleCancel = (visit: VisitRow) => {
    setMotivoTexto('')
    setMotivoModal({ visit, accion: 'cancelar' })
  }

  const handleReprogramar = (visit: VisitRow) => {
    setMotivoTexto('')
    setReprogFecha(visit.fechaProgramada)
    setReprogHora(visit.horaProgramada?.slice(0, 5) ?? '09:00')
    setMotivoModal({ visit, accion: 'reprogramar' })
  }

  const handleConfirmMotivo = async () => {
    if (!motivoModal) return
    const { visit, accion } = motivoModal
    setError('')
    setSuccessMsg('')
    try {
      if (accion === 'cancelar') {
        await apiPatch<VisitRow, { observacionCancelacion: string }>(`/visitas/${visit.id}/cancelar`, {
          observacionCancelacion: motivoTexto.trim() || 'Cancelada desde agenda',
        })
        setSuccessMsg('Visita cancelada.')
      } else {
        if (!reprogFecha || !reprogHora) {
          setError('Indica la nueva fecha y hora de la visita.')
          return
        }
        await apiPatch<VisitRow, { fechaProgramadaNueva: string; horaProgramadaNueva: string; observacion?: string }>(
          `/visitas/${visit.id}/reprogramar`,
          {
            fechaProgramadaNueva: reprogFecha,
            horaProgramadaNueva: reprogHora,
            ...(motivoTexto.trim() ? { observacion: motivoTexto.trim() } : {}),
          },
        )
        setSuccessMsg('Visita reprogramada.')
      }
      setMotivoModal(null)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar la visita.')
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-7xl space-y-6'>
        <header className='flex flex-col justify-between gap-4 lg:flex-row lg:items-end'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>Agenda y visitas</p>
            <h1 className='m-0 text-3xl font-semibold text-slate-900'>Agenda operativa</h1>
            <p className='mt-2 text-sm text-slate-600'>
              Programa visitas, asigna profesionales y controla el estado de la atención domiciliaria.
            </p>
          </div>
          <div className='flex items-center gap-3'>
            {session.rol === 'PROFESIONAL' && googleCalendarStatus && (
              <a
                href={googleCalendarStatus.isConnected ? '#' : 'http://localhost:3000/google-calendar/connect'}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
                  googleCalendarStatus.isConnected
                    ? 'bg-emerald-100 text-emerald-800 cursor-default'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LinkIcon className='size-4' />
                {googleCalendarStatus.isConnected ? 'Google Calendar Conectado' : 'Conectar Google Calendar'}
              </a>
            )}
            <div className='flex items-center rounded-xl border border-slate-300 bg-white p-1 shadow-sm'>
              <button
                type='button'
                onClick={() => setViewMode('CALENDAR')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === 'CALENDAR' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <CalendarIcon className='size-4' />
                Calendario
              </button>
              <button
                type='button'
                onClick={() => setViewMode('LIST')}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === 'LIST' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <List className='size-4' />
                Lista
              </button>
            </div>
            <button
              type='button'
              onClick={loadData}
              className='inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800'
            >
              <RefreshCcw className='size-4' />
              Actualizar
            </button>
          </div>
        </header>

        {error && <div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>}
        {successMsg && <div className='rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>{successMsg}</div>}

        {/* VISTAS */}
        {viewMode === 'CALENDAR' ? (
          <CalendarView
            visits={calendarVisits}
            onSelectVisit={(visit) => {
              if (canWrite) {
                const found = visits.find(v => v.id === visit.id)
                if (found) handleEdit(found)
              }
            }}
            canEditVisit={canWrite}
            canFillFicha={session?.rol === 'ADMIN' || session?.rol === 'PROFESIONAL'}
          />
        ) : (
          <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='mb-4 grid gap-3 md:grid-cols-4'>
            <div className='flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 md:col-span-2'>
              <Search className='size-4 text-slate-500' />
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder='Buscar por paciente, profesional, zona o estado' className='w-full border-none bg-transparent text-sm text-slate-900 outline-none' />
            </div>
            <select value={estadoFilter} onChange={event => setEstadoFilter(event.target.value)} className='rounded-lg border border-slate-300 px-3 py-2 text-sm'>
              <option value=''>Todos los estados</option>
              <option value='PROGRAMADA'>Programada</option>
              <option value='EN_ATENCION'>En atención</option>
              <option value='REALIZADA'>Realizada</option>
              <option value='CANCELADA'>Cancelada</option>
            </select>
            <button onClick={loadData} className='rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>Aplicar filtros</button>
          </div>
          <div className='mb-4 grid gap-3 md:grid-cols-2'>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
              Desde
              <input type='date' value={fechaDesde} onChange={event => setFechaDesde(event.target.value)} className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900' />
            </label>
            <label className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
              Hasta
              <input type='date' value={fechaHasta} onChange={event => setFechaHasta(event.target.value)} className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-900' />
            </label>
          </div>

          <div className='overflow-x-auto rounded-xl border border-slate-200'>
            <table className='w-full min-w-[1100px] text-left text-sm'>
              <thead className='bg-slate-100 text-xs uppercase tracking-wide text-slate-600'>
                <tr>
                  <th className='px-4 py-3'>Fecha</th>
                  <th className='px-4 py-3'>Hora</th>
                  <th className='px-4 py-3'>Paciente</th>
                  <th className='px-4 py-3'>Profesional</th>
                  <th className='px-4 py-3'>Zona</th>
                  <th className='px-4 py-3'>Prestaciones</th>
                  <th className='px-4 py-3'>Estado</th>
                  <th className='px-4 py-3'>Prioridad</th>
                  <th className='px-4 py-3'>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className='px-4 py-8 text-center text-slate-500'>Cargando agenda...</td></tr>
                ) : null}
                {filteredVisits.map(visit => {
                  const patient = patientById.get(visit.pacienteId)
                  const professional = professionalById.get(visit.profesionalSaludId)
                  const zone = visit.zonaId ? zoneById.get(visit.zonaId) : null
                  const prestacionesVisita = visitPrestaciones[visit.id] ?? []
                  return (
                    <tr key={visit.id} className='border-t border-slate-200 text-slate-800 transition hover:bg-slate-50'>
                      <td className='px-4 py-3 font-medium'>{formatDate(visit.fechaProgramada)}</td>
                      <td className='px-4 py-3'>{visit.horaProgramada?.slice(0, 5)}</td>
                      <td className='px-4 py-3'>{patient ? `${patient.nombres} ${patient.apellidos}` : visit.pacienteId}</td>
                      <td className='px-4 py-3'>{professional?.profesion ?? visit.profesionalSaludId}</td>
                      <td className='px-4 py-3'>{zone ? `${zone.nombre} (${zone.comuna})` : '-'}</td>
                      <td className='px-4 py-3'>
                        {prestacionesVisita.length > 0 ? (
                          <div className='flex flex-wrap gap-1.5'>
                            {prestacionesVisita.map(item => (
                              <span key={item.id} className='rounded-full bg-[#3C6E71]/10 px-2 py-1 text-xs font-semibold text-[#284B63]'>
                                {item.prestacion?.nombre ?? item.prestacionId}
                              </span>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className='px-4 py-3'><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(visit.estado)}`}>{visit.estado}</span></td>
                      <td className='px-4 py-3'>{visit.prioridad}</td>
                      <td className='px-4 py-3'>
                        <div className='flex flex-wrap gap-2'>
                          {(session?.rol === 'ADMIN' || session?.rol === 'PROFESIONAL') && (
                            <a href={`/fichas-clinicas/llenar?visitaId=${visit.id}`} className='rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100'>Ficha</a>
                          )}
                          {canWrite && !['CANCELADA', 'REALIZADA'].includes(visit.estado) ? (
                            <button onClick={() => handleEdit(visit)} className='inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100'>
                              <Pencil className='size-3' /> Editar
                            </button>
                          ) : null}
                          {canChangeState && visit.estado === 'PROGRAMADA' ? (
                            <button onClick={() => handleChangeState(visit, 'EN_ATENCION')} className='inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50'>
                              <CalendarDays className='size-3' /> Iniciar
                            </button>
                          ) : null}
                          {canChangeState && visit.estado === 'EN_ATENCION' ? (
                            <button onClick={() => handleChangeState(visit, 'REALIZADA')} className='inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50'>
                              <CircleCheck className='size-3' /> Realizada
                            </button>
                          ) : null}
                          {canWrite && !['CANCELADA', 'REALIZADA'].includes(visit.estado) ? (
                            <button onClick={() => handleReprogramar(visit)} className='inline-flex items-center gap-1 rounded-md border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50'>
                              <RefreshCcw className='size-3' /> Reprogramar
                            </button>
                          ) : null}
                          {canWrite && !['CANCELADA', 'REALIZADA'].includes(visit.estado) ? (
                            <button onClick={() => handleCancel(visit)} className='inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50'>
                              <XCircle className='size-3' /> Cancelar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!isLoading && filteredVisits.length === 0 ? (
                  <tr><td colSpan={9} className='px-4 py-8 text-center text-slate-500'>No hay visitas para los filtros seleccionados.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {canWrite ? (
          <div className='grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start'>
            <SeguimientoAgendaPanel
              onSelectPaciente={pacienteId => setForm(current => ({ ...current, pacienteId }))}
            />
            <form onSubmit={handleSubmitVisit} className='rounded-xl border border-[#9CBFC1]/35 bg-[#203C50]/92 p-6 shadow-xl shadow-black/10'>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
              <div className='flex items-center gap-2'>
                <CalendarDays className='size-5 text-[#9CBFC1]' />
                <h2 className='m-0 text-lg font-semibold text-white'>
                  {editingVisitId ? 'Editar visita' : 'Crear visita'}
                </h2>
              </div>
              {editingVisitId ? (
                <button type='button' onClick={resetVisitForm} className='rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50'>
                  Cancelar edición
                </button>
              ) : null}
            </div>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <SearchableSelect
                label='Paciente'
                value={form.pacienteId}
                placeholder='Buscar paciente por nombre o RUT'
                options={patientOptions}
                onChange={pacienteId => setForm(current => ({ ...current, pacienteId }))}
              />
              <SearchableSelect
                label='Profesional'
                value={form.profesionalSaludId}
                placeholder='Buscar profesional o registro'
                options={professionalOptions}
                onChange={profesionalSaludId => setForm(current => ({ ...current, profesionalSaludId }))}
              />
              <SearchableSelect
                label='Zona'
                value={form.zonaId}
                placeholder='Buscar zona o comuna'
                emptyLabel='Sin zona'
                options={zoneOptions}
                onChange={zonaId => setForm(current => ({ ...current, zonaId }))}
              />
              <label className='text-sm font-semibold text-[#D9D9D9]'>
                Prioridad
                <select value={form.prioridad} onChange={event => setForm(current => ({ ...current, prioridad: event.target.value }))} className='mt-1 h-11 w-full rounded-lg border border-[#6f929b]/45 !bg-[#173344] px-3 text-sm font-semibold text-white shadow-inner shadow-black/5 transition focus:border-[#9CBFC1] focus:!bg-[#142f3f] focus:outline-none focus:ring-2 focus:ring-[#9CBFC1]/15'>
                  <option value='BAJA'>Baja</option>
                  <option value='NORMAL'>Normal</option>
                  <option value='ALTA'>Alta</option>
                  <option value='URGENTE'>Urgente</option>
                </select>
              </label>
              <label className='text-sm font-semibold text-[#D9D9D9]'>
                Fecha
                <input type='date' value={form.fechaProgramada} onChange={event => setForm(current => ({ ...current, fechaProgramada: event.target.value }))} className='mt-1 h-11 w-full rounded-lg border border-[#6f929b]/45 !bg-[#173344] px-3 text-sm font-semibold text-white shadow-inner shadow-black/5 transition focus:border-[#9CBFC1] focus:!bg-[#142f3f] focus:outline-none focus:ring-2 focus:ring-[#9CBFC1]/15' />
              </label>
              <label className='text-sm font-semibold text-[#D9D9D9]'>
                Hora
                <input type='time' value={form.horaProgramada} onChange={event => setForm(current => ({ ...current, horaProgramada: event.target.value }))} className='mt-1 h-11 w-full rounded-lg border border-[#6f929b]/45 !bg-[#173344] px-3 text-sm font-semibold text-white shadow-inner shadow-black/5 transition focus:border-[#9CBFC1] focus:!bg-[#142f3f] focus:outline-none focus:ring-2 focus:ring-[#9CBFC1]/15' />
              </label>
              <label className='text-sm font-semibold text-[#D9D9D9]'>
                Duración estimada
                <input type='number' min='1' value={form.duracionEstimadaMin} onChange={event => setForm(current => ({ ...current, duracionEstimadaMin: event.target.value }))} className='mt-1 h-11 w-full rounded-lg border border-[#6f929b]/45 !bg-[#173344] px-3 text-sm font-semibold text-white shadow-inner shadow-black/5 transition focus:border-[#9CBFC1] focus:!bg-[#142f3f] focus:outline-none focus:ring-2 focus:ring-[#9CBFC1]/15' />
              </label>
              <div className='flex items-end'>
                <button type='submit' disabled={isSaving} className='h-11 w-full rounded-lg bg-[#4c8587] px-4 text-sm font-bold text-white shadow-sm shadow-black/10 transition hover:bg-[#5b999b] focus:outline-none focus:ring-2 focus:ring-[#9CBFC1]/30 disabled:opacity-60'>
                  {isSaving ? 'Guardando...' : editingVisitId ? 'Actualizar visita' : 'Crear visita'}
                </button>
              </div>
            </div>
            <fieldset className='mt-6 rounded-xl border border-[#9CBFC1]/28 bg-[#173344]/45 p-4'>
              <legend className='px-1 text-sm font-semibold text-white'>Prestaciones de la visita</legend>
              <div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                {prestaciones.map(prestacion => {
                  const checked = form.prestacionIds.includes(prestacion.id)
                  return (
                    <label key={prestacion.id} className={`group flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm transition ${
                      checked
                        ? 'border-[#9CBFC1]/75 bg-[#3C6E71]/28 shadow-sm shadow-black/10'
                        : 'border-[#9CBFC1]/24 bg-[#203C50]/65 hover:border-[#9CBFC1]/55 hover:bg-[#284B63]/55'
                    }`}>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={event => setForm(current => ({
                          ...current,
                          prestacionIds: event.target.checked
                            ? [...current.prestacionIds, prestacion.id]
                            : current.prestacionIds.filter(id => id !== prestacion.id),
                        }))}
                        className='peer sr-only'
                      />
                      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition ${
                        checked
                          ? 'border-[#9CBFC1] bg-[#9CBFC1] text-[#173344]'
                          : 'border-[#9CBFC1]/65 bg-[#173344] text-transparent group-hover:border-[#D9D9D9]'
                      }`}>
                        <span className='text-sm font-black leading-none'>✓</span>
                      </span>
                      <span>
                        <span className='block font-semibold text-white'>{prestacion.nombre}</span>
                        <span className='text-xs font-medium text-[#D9D9D9]'>
                          {prestacion.duracionEstimadaMin ? `${prestacion.duracionEstimadaMin} min` : 'Sin duración estimada'}
                        </span>
                      </span>
                    </label>
                  )
                })}
                {prestaciones.length === 0 ? (
                  <p className='text-sm text-slate-500'>No hay prestaciones activas disponibles.</p>
                ) : null}
              </div>
            </fieldset>
            </form>
          </div>
        ) : null}

      </section>

      <Dialog open={motivoModal !== null} onOpenChange={(open) => { if (!open) setMotivoModal(null) }}>
        <DialogContent className='border border-[#6f929b]/35 !bg-[#1c374a] text-white shadow-2xl shadow-black/40'>
          <DialogHeader>
            <DialogTitle className='text-white'>
              {motivoModal?.accion === 'cancelar' ? 'Cancelar visita' : 'Reprogramar visita'}
            </DialogTitle>
            <DialogDescription className='text-[#B7C4C5]'>
              {motivoModal?.accion === 'cancelar'
                ? '¿Seguro que quieres cancelar esta visita? El motivo se incluye en el correo al paciente.'
                : 'Indica la nueva fecha y hora de la visita. El paciente y el profesional recibirán un correo con el cambio.'}
            </DialogDescription>
          </DialogHeader>
          {motivoModal?.accion === 'reprogramar' ? (
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='text-xs font-semibold text-[#D9D9D9]'>Nueva fecha</label>
                <input
                  type='date'
                  value={reprogFecha}
                  onChange={(e) => setReprogFecha(e.target.value)}
                  className='mt-1 h-10 w-full rounded-lg border border-[#6f929b]/45 !bg-[#173344] px-3 text-sm text-white focus:border-[#9CBFC1] focus:!bg-[#142f3f] focus:outline-none focus:ring-2 focus:ring-[#9CBFC1]/15'
                />
              </div>
              <div>
                <label className='text-xs font-semibold text-[#D9D9D9]'>Nueva hora</label>
                <input
                  type='time'
                  value={reprogHora}
                  onChange={(e) => setReprogHora(e.target.value)}
                  className='mt-1 h-10 w-full rounded-lg border border-[#6f929b]/45 !bg-[#173344] px-3 text-sm text-white focus:border-[#9CBFC1] focus:!bg-[#142f3f] focus:outline-none focus:ring-2 focus:ring-[#9CBFC1]/15'
                />
              </div>
            </div>
          ) : null}
          <Textarea
            autoFocus={motivoModal?.accion === 'cancelar'}
            rows={3}
            placeholder='Motivo (opcional)'
            value={motivoTexto}
            onChange={(e) => setMotivoTexto(e.target.value)}
            className='border-[#6f929b]/45 !bg-[#173344] text-white placeholder:text-[#9CBFC1] focus-visible:border-[#9CBFC1] focus-visible:ring-[#9CBFC1]/15'
          />
          <DialogFooter>
            <Button
              variant='outline'
              className='border-[#6f929b]/45 bg-transparent text-white hover:bg-white/10'
              onClick={() => setMotivoModal(null)}
            >
              Volver
            </Button>
            <Button
              className={
                motivoModal?.accion === 'cancelar'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-[#3C6E71] text-white hover:bg-[#355F62]'
              }
              onClick={handleConfirmMotivo}
            >
              {motivoModal?.accion === 'cancelar' ? 'Cancelar visita' : 'Confirmar reprogramación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default AgendaPage