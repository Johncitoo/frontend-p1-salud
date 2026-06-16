import { FormEvent, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CircleCheck, Search, XCircle } from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiGet, apiPatch, apiPost } from '@/lib/api'

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

const AgendaPage = () => {
  const session = useCurrentUser()
  const canWrite = session.rol === 'ADMIN' || session.rol === 'COORDINADOR'
  const canChangeState = canWrite || session.rol === 'PROFESIONAL'
  const [visits, setVisits] = useState<VisitRow[]>([])
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([])
  const [zones, setZones] = useState<ZoneRow[]>([])
  const [prestaciones, setPrestaciones] = useState<PrestacionRow[]>([])
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

  const patientById = useMemo(() => new Map(patients.map(patient => [patient.id, patient])), [patients])
  const professionalById = useMemo(() => new Map(professionals.map(professional => [professional.id, professional])), [professionals])
  const zoneById = useMemo(() => new Map(zones.map(zone => [zone.id, zone])), [zones])

  const loadData = () => {
    setIsLoading(true)
    setError('')

    const params = new URLSearchParams()
    if (estadoFilter) params.set('estado', estadoFilter)
    if (fechaDesde) params.set('fechaDesde', fechaDesde)
    if (fechaHasta) params.set('fechaHasta', fechaHasta)

    Promise.all([
      apiGet<VisitRow[]>(`/visitas${params.toString() ? `?${params.toString()}` : ''}`),
      apiGet<PatientRow[]>('/pacientes'),
      apiGet<ProfessionalRow[]>('/profesionales'),
      apiGet<ZoneRow[]>('/zonas'),
      apiGet<PrestacionRow[]>('/prestaciones?activa=true'),
    ])
      .then(async ([visitRows, patientRows, professionalRows, zoneRows, prestacionRows]) => {
        const prestacionesEntries = await Promise.all(
          visitRows.map(async visit => {
            const rows = await apiGet<VisitPrestacionRow[]>(`/visitas/${visit.id}/prestaciones`)
            return [visit.id, rows] as const
          }),
        )

        setVisits(visitRows)
        setPatients(patientRows)
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

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.pacienteId || !form.profesionalSaludId || !form.fechaProgramada || !form.horaProgramada) {
      setError('Completa paciente, profesional, fecha y hora.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccessMsg('')

    try {
      const created = await apiPost<VisitRow, Record<string, unknown>>('/visitas', {
        pacienteId: form.pacienteId,
        profesionalSaludId: form.profesionalSaludId,
        zonaId: form.zonaId || undefined,
        fechaProgramada: form.fechaProgramada,
        horaProgramada: form.horaProgramada,
        duracionEstimadaMin: Number(form.duracionEstimadaMin || 60),
        prioridad: form.prioridad,
      })

      await Promise.all(
        form.prestacionIds.map(prestacionId =>
          apiPost<VisitPrestacionRow, { prestacionId: string }>(`/visitas/${created.id}/prestaciones`, { prestacionId }),
        ),
      )

      setForm(emptyForm)
      setSuccessMsg('Visita creada correctamente.')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear la visita.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangeState = async (visit: VisitRow, estado: string) => {
    setError('')
    setSuccessMsg('')
    try {
      await apiPatch<VisitRow, { estado: string }>(`/visitas/${visit.id}/estado`, { estado })
      setSuccessMsg(`Visita marcada como ${estado}.`)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar la visita.')
    }
  }

  const handleCancel = async (visit: VisitRow) => {
    if (!window.confirm('¿Cancelar esta visita?')) return
    setError('')
    setSuccessMsg('')
    try {
      await apiPatch<VisitRow, { observacionCancelacion: string }>(`/visitas/${visit.id}/cancelar`, {
        observacionCancelacion: 'Cancelada desde agenda',
      })
      setSuccessMsg('Visita cancelada.')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cancelar la visita.')
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
          <button
            type='button'
            onClick={loadData}
            className='inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100'
          >
            <CalendarDays className='size-4' />
            Actualizar agenda
          </button>
        </header>

        {error && <div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>}
        {successMsg && <div className='rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>{successMsg}</div>}

        {canWrite ? (
          <form onSubmit={handleCreate} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <div className='mb-4 flex items-center gap-2'>
              <CalendarDays className='size-5 text-[#3C6E71]' />
              <h2 className='m-0 text-lg font-semibold text-slate-900'>Crear visita</h2>
            </div>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <label className='text-sm font-semibold text-slate-700'>
                Paciente
                <select value={form.pacienteId} onChange={event => setForm(current => ({ ...current, pacienteId: event.target.value }))} className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'>
                  <option value=''>Selecciona paciente</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.nombres} {patient.apellidos} - {patient.rut}</option>
                  ))}
                </select>
              </label>
              <label className='text-sm font-semibold text-slate-700'>
                Profesional
                <select value={form.profesionalSaludId} onChange={event => setForm(current => ({ ...current, profesionalSaludId: event.target.value }))} className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'>
                  <option value=''>Selecciona profesional</option>
                  {professionals.map(professional => (
                    <option key={professional.id} value={professional.id}>{professional.profesion} · {professional.numeroRegistro || 'sin registro'}</option>
                  ))}
                </select>
              </label>
              <label className='text-sm font-semibold text-slate-700'>
                Zona
                <select value={form.zonaId} onChange={event => setForm(current => ({ ...current, zonaId: event.target.value }))} className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'>
                  <option value=''>Sin zona</option>
                  {zones.map(zone => (
                    <option key={zone.id} value={zone.id}>{zone.nombre} - {zone.comuna}</option>
                  ))}
                </select>
              </label>
              <label className='text-sm font-semibold text-slate-700'>
                Prioridad
                <select value={form.prioridad} onChange={event => setForm(current => ({ ...current, prioridad: event.target.value }))} className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'>
                  <option value='BAJA'>Baja</option>
                  <option value='NORMAL'>Normal</option>
                  <option value='ALTA'>Alta</option>
                  <option value='URGENTE'>Urgente</option>
                </select>
              </label>
              <label className='text-sm font-semibold text-slate-700'>
                Fecha
                <input type='date' value={form.fechaProgramada} onChange={event => setForm(current => ({ ...current, fechaProgramada: event.target.value }))} className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' />
              </label>
              <label className='text-sm font-semibold text-slate-700'>
                Hora
                <input type='time' value={form.horaProgramada} onChange={event => setForm(current => ({ ...current, horaProgramada: event.target.value }))} className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' />
              </label>
              <label className='text-sm font-semibold text-slate-700'>
                Duración estimada
                <input type='number' min='1' value={form.duracionEstimadaMin} onChange={event => setForm(current => ({ ...current, duracionEstimadaMin: event.target.value }))} className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm' />
              </label>
              <div className='flex items-end'>
                <button type='submit' disabled={isSaving} className='w-full rounded-lg bg-[#3C6E71] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#284B63] disabled:opacity-60'>
                  {isSaving ? 'Creando...' : 'Crear visita'}
                </button>
              </div>
            </div>
            <fieldset className='mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4'>
              <legend className='px-1 text-sm font-semibold text-slate-800'>Prestaciones de la visita</legend>
              <div className='mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                {prestaciones.map(prestacion => {
                  const checked = form.prestacionIds.includes(prestacion.id)
                  return (
                    <label key={prestacion.id} className='flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700'>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={event => setForm(current => ({
                          ...current,
                          prestacionIds: event.target.checked
                            ? [...current.prestacionIds, prestacion.id]
                            : current.prestacionIds.filter(id => id !== prestacion.id),
                        }))}
                        className='mt-1 size-4 rounded border-slate-300 text-[#3C6E71] focus:ring-[#3C6E71]/20'
                      />
                      <span>
                        <span className='block font-semibold text-slate-800'>{prestacion.nombre}</span>
                        <span className='text-xs text-slate-500'>
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
        ) : null}

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
                          <a href={`/fichas-clinicas/llenar?visitaId=${visit.id}`} className='rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100'>Ficha</a>
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
      </section>
    </main>
  )
}

export default AgendaPage
