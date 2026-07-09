import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Activity, Stethoscope, AlertTriangle, Plus, X, Search, RefreshCw, BatteryLow, Wifi, WifiOff, ChevronLeft, ChevronRight, Hash, Clock } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'

type PatientRow = {
  id: string
  rut: string
  nombres: string
  apellidos: string
  fechaNacimiento: string | null
  sexo: string | null
  telefono?: string | null
  email?: string | null
  direccion?: string | null
}

type MedicionRow = {
  id: string
  fechaMedicion: string
  valorNumero: number
  origen: string
  variableClinica?: {
    nombre: string
    unidad: string
  }
}

type AlertaRow = {
  id: string
  tipo: string
  mensaje: string
  prioridad: string
  estado: string
  createdAt: string
}

type DeviceRow = {
  id: string
  assetId: string
  sensorId: string
  sensorType: string
  isActive: boolean
  createdAt: string
}

// Dispositivo del catálogo del Grupo 8 (GET /iot/devices)
type CatalogDeviceRow = {
  sensorId: string
  assetId: string
  sensorType: string
  batteryLevel?: number
  connectionStatus?: string
  lastReadingAt?: string
}

type DeviceCatalogResponse = {
  data: CatalogDeviceRow[]
  page: number
  limit: number
  total: number
}

const SENSOR_TYPE_LABELS: Record<string, string> = {
  glucometer: 'Glucómetro',
  pulse_oximeter: 'Oxímetro de Pulso',
  thermometer: 'Termómetro',
  sphygmomanometer: 'Esfigmomanómetro',
}

const CATALOG_LIMIT = 25

type CatalogSortMode = 'sensorId' | 'lastReading'

export default function PatientProfilePage({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<PatientRow | null>(null)
  const [mediciones, setMediciones] = useState<MedicionRow[]>([])
  const [alertas, setAlertas] = useState<AlertaRow[]>([])
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sensorType, setSensorType] = useState('glucometer')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Catálogo de dispositivos (Grupo 8)
  const [catalog, setCatalog] = useState<CatalogDeviceRow[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<CatalogDeviceRow | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [sortMode, setSortMode] = useState<CatalogSortMode>('sensorId')

  const loadData = () => {
    Promise.all([
      apiGet<PatientRow>(`/pacientes/${patientId}`),
      apiGet<MedicionRow[]>(`/mediciones-clinicas?pacienteId=${patientId}`),
      apiGet<AlertaRow[]>(`/alertas?pacienteId=${patientId}`),
      apiGet<DeviceRow[]>(`/iot/paciente-sensores/${patientId}`),
    ]).then(([pat, meds, alts, devs]) => {
      setPatient(pat)
      setMediciones(meds)
      setAlertas(alts.filter(a => a.tipo.startsWith('IOT_')))
      setDevices(devs)
      setIsLoading(false)
    }).catch(console.error)
  }

  useEffect(() => {
    loadData()
  }, [patientId])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await apiPost(`/iot/sync-patient/${patientId}`, {})
      loadData() // Recargar los signos vitales
    } catch (err) {
      console.error('Error sincronizando', err)
    } finally {
      setIsSyncing(false)
    }
  }

  // Cargar el catálogo COMPLETO de ese tipo de sensor al abrir el modal o al
  // cambiar tipo/búsqueda. Traemos todas las páginas (la API pagina por última
  // lectura, no por ID) para poder ordenar y paginar del lado nuestro y que el
  // orden "Por ID" salga continuo (001, 002, 003...) en vez de con huecos.
  // Se debouncea la búsqueda para no llamar en cada tecla.
  useEffect(() => {
    if (!isModalOpen) return

    let cancelled = false
    setCatalogLoading(true)
    setCatalogError('')
    setPage(1)

    const timer = window.setTimeout(async () => {
      try {
        const FETCH_LIMIT = 100 // máximo permitido por la API del Grupo 8
        const MAX_PAGES = 10 // tope de seguridad (hasta 1000 dispositivos)
        let all: CatalogDeviceRow[] = []
        let apiWasNull = false
        let p = 1

        while (p <= MAX_PAGES) {
          const params = new URLSearchParams({ limit: String(FETCH_LIMIT), page: String(p), sensorType })
          if (search.trim()) params.set('search', search.trim())

          const res = await apiGet<DeviceCatalogResponse | null>(`/iot/devices?${params.toString()}`)
          if (cancelled) return
          if (!res) { apiWasNull = true; break }

          all = all.concat(res.data ?? [])
          if (!res.data?.length || all.length >= (res.total ?? all.length)) break
          p++
        }

        if (cancelled) return
        setCatalog(all)
        setTotal(all.length)
        if (apiWasNull && all.length === 0) {
          setCatalogError('No se pudo obtener el catálogo del Grupo 8 (IoT deshabilitado o su API caída).')
        }
      } catch (err) {
        if (cancelled) return
        setCatalog([])
        setTotal(0)
        setCatalogError(err instanceof Error ? err.message : 'Error al cargar el catálogo de dispositivos.')
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [isModalOpen, sensorType, search])

  // Orden completo del catálogo según sortMode (sobre TODOS los dispositivos,
  // no solo una página): por sensorId (numérico, OXI-002 antes que OXI-010) o
  // por última lectura (más reciente primero).
  const sortedCatalog = useMemo(() => {
    const rows = [...catalog]
    if (sortMode === 'lastReading') {
      return rows.sort((a, b) => (b.lastReadingAt ?? '').localeCompare(a.lastReadingAt ?? ''))
    }
    return rows.sort((a, b) => a.sensorId.localeCompare(b.sensorId, undefined, { numeric: true }))
  }, [catalog, sortMode])

  const totalPages = Math.max(1, Math.ceil(total / CATALOG_LIMIT))

  // Paginación del lado nuestro sobre la lista ya ordenada completa.
  const pagedCatalog = useMemo(
    () => sortedCatalog.slice((page - 1) * CATALOG_LIMIT, page * CATALOG_LIMIT),
    [sortedCatalog, page],
  )

  const openModal = () => {
    setSelectedDevice(null)
    setSearch('')
    setSensorType('glucometer')
    setSortMode('sensorId')
    setPage(1)
    setCatalog([])
    setTotal(0)
    setCatalogError('')
    setIsModalOpen(true)
  }

  const handleAssignDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDevice) return
    setIsSubmitting(true)
    try {
      await apiPost('/iot/paciente-sensores', {
        pacienteId: patientId,
        assetId: selectedDevice.assetId,
        sensorId: selectedDevice.sensorId,
        sensorType: selectedDevice.sensorType,
      })
      setIsModalOpen(false)
      setSelectedDevice(null)
      // Reload devices
      const devs = await apiGet<DeviceRow[]>(`/iot/paciente-sensores/${patientId}`)
      setDevices(devs)
    } catch (err) {
      console.error(err)
      alert("Error al asignar dispositivo")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className='p-10 text-center'>Cargando perfil...</div>
  if (!patient) return <div className='p-10 text-center text-red-500'>Paciente no encontrado</div>

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-5xl'>
        <a href='/patients' className='mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#284B63] hover:text-[#3C6E71]'>
          <ArrowLeft className='size-4' /> Volver a pacientes
        </a>
        
        <header className='mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <h1 className='text-3xl font-semibold text-slate-900'>{patient.nombres} {patient.apellidos}</h1>
            <div className='mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8 text-sm'>
              <div className='flex flex-col gap-1'>
                <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>RUT</span>
                <span className='font-medium text-slate-700'>{patient.rut}</span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>Nacimiento</span>
                <span className='font-medium text-slate-700'>
                  {patient.fechaNacimiento ? new Date(`${patient.fechaNacimiento}T00:00:00`).toLocaleDateString('es-CL') : '-'}
                </span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>Sexo</span>
                <span className='font-medium text-slate-700'>{patient.sexo || '-'}</span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>Teléfono</span>
                <span className='font-medium text-slate-700'>{patient.telefono || '-'}</span>
              </div>
              <div className='flex flex-col gap-1'>
                <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>Email</span>
                <span className='font-medium text-slate-700'>{patient.email || '-'}</span>
              </div>
              <div className='flex flex-col gap-1 sm:col-span-2 lg:col-span-1'>
                <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>Dirección</span>
                <span className='font-medium text-slate-700'>{patient.direccion || '-'}</span>
              </div>
            </div>
          </div>
          <div className='bg-[#3C6E71] text-white px-4 py-2 rounded-xl font-bold uppercase text-xs tracking-wider shrink-0 w-fit'>
            Perfil Clínico
          </div>
        </header>

        <div className='grid gap-6 md:grid-cols-2'>
          {/* PANEL IOT */}
          <div className='rounded-2xl border border-slate-200 bg-slate-800 p-6 shadow-sm flex-1'>
            <div className='mb-4 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Activity className='h-5 w-5 text-[#3C6E71]' />
                <h3 className='font-bold text-lg text-slate-100'>Dispositivos IoT Activos</h3>
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className='flex items-center gap-1 bg-slate-700 text-slate-100 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-slate-600 disabled:opacity-50 transition-colors'
                >
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                </button>
                <button
                  onClick={openModal}
                  className='flex items-center gap-1 bg-[#3C6E71] text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#2F5658] transition-colors'
                >
                  <Plus className='h-4 w-4' />
                  Vincular
                </button>
              </div>
            </div>
            
            {devices.length === 0 ? (
              <div className='bg-black/10 rounded-xl p-4 border border-slate-600/30 text-center'>
                <p className='text-sm text-slate-400'>No hay dispositivos vinculados.</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {devices.map(dev => (
                  <div key={dev.id} className='bg-black/10 rounded-xl p-4 border border-slate-600/30 flex justify-between items-center'>
                    <div>
                      <p className='text-sm text-slate-200 font-bold'>{dev.sensorType.toUpperCase()}</p>
                      <p className='text-xs text-slate-400 mt-1'>Asset: {dev.assetId} | Sensor: {dev.sensorId}</p>
                    </div>
                    <span className='px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase rounded-md border border-green-500/30'>
                      Activo
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <h3 className='text-md font-semibold text-slate-100 mt-6 mb-3 flex items-center gap-2'>
              <AlertTriangle className='text-amber-500 size-4' /> Alertas IoT Recientes
            </h3>
            {alertas.length === 0 ? (
              <p className='text-sm text-slate-400'>No hay alertas registradas.</p>
            ) : (
              <div className='space-y-3'>
                {alertas.slice(0, 5).map(alerta => (
                  <div key={alerta.id} className='bg-red-50 border border-red-100 p-3 rounded-lg flex justify-between items-start'>
                    <div>
                      <p className='text-sm font-semibold text-red-800'>{alerta.mensaje}</p>
                      <p className='text-xs text-red-600 mt-1'>{new Date(alerta.createdAt).toLocaleString()}</p>
                    </div>
                    <span className='px-2 py-1 bg-red-200 text-red-900 rounded-md text-[10px] font-bold uppercase'>
                      {alerta.prioridad}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mediciones Clínicas */}
          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4'>
              <Stethoscope className='text-[#284B63]' />
              Historial de Signos Vitales
            </h2>
            <div className='overflow-hidden rounded-xl border border-slate-200'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-slate-100'>
                  <tr>
                    <th className='px-4 py-2'>Fecha</th>
                    <th className='px-4 py-2'>Variable</th>
                    <th className='px-4 py-2'>Valor</th>
                    <th className='px-4 py-2'>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {mediciones.length === 0 ? (
                    <tr><td colSpan={4} className='p-4 text-center text-slate-500'>No hay mediciones</td></tr>
                  ) : (
                    mediciones.sort((a,b) => new Date(b.fechaMedicion).getTime() - new Date(a.fechaMedicion).getTime()).slice(0,10).map(m => (
                      <tr key={m.id} className='border-t border-slate-200'>
                        <td className='px-4 py-3'>{new Date(m.fechaMedicion).toLocaleString()}</td>
                        <td className='px-4 py-3'>{m.variableClinica?.nombre}</td>
                        <td className='px-4 py-3 font-semibold'>
                          {m.valorNumero} {m.variableClinica?.unidad}
                        </td>
                        <td className='px-4 py-3'>
                          {m.origen === 'IOT' ? (
                            <span className='bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold'>Automático (IoT)</span>
                          ) : (
                            <span className='bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs'>Manual</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Modal Asignar Dispositivo */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
          <div className='flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-xl'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-bold text-slate-900'>Vincular Dispositivo IoT</h2>
              <button onClick={() => setIsModalOpen(false)} className='text-slate-400 hover:text-slate-600'>
                <X className='size-5' />
              </button>
            </div>

            <form onSubmit={handleAssignDevice} className='flex min-h-0 flex-1 flex-col'>
              {/* Filtros */}
              <div className='mb-3 grid gap-3 sm:grid-cols-2'>
                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700'>Tipo de Sensor</label>
                  <select
                    value={sensorType}
                    onChange={(e) => { setSensorType(e.target.value); setSelectedDevice(null); setPage(1) }}
                    className='w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm'
                  >
                    {Object.entries(SENSOR_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='mb-1 block text-sm font-medium text-slate-700'>Buscar</label>
                  <div className='relative'>
                    <Search className='pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400' />
                    <input
                      type='text'
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                      className='w-full rounded-lg border border-slate-300 py-2.5 pl-8 pr-3 text-sm'
                      placeholder='Ej. OXI-001'
                    />
                  </div>
                </div>
              </div>

              {/* Orden + contador */}
              <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
                <p className='text-xs text-slate-500'>
                  Catálogo del Equipo 08. Solo aparecen sensores con lecturas registradas.
                </p>
                <div className='inline-flex overflow-hidden rounded-lg border border-slate-300 text-xs'>
                  <button
                    type='button'
                    onClick={() => setSortMode('sensorId')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 font-medium transition ${
                      sortMode === 'sensorId' ? 'bg-[#3C6E71] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Hash className='size-3.5' /> Por ID
                  </button>
                  <button
                    type='button'
                    onClick={() => setSortMode('lastReading')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 font-medium transition ${
                      sortMode === 'lastReading' ? 'bg-[#3C6E71] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className='size-3.5' /> Última lectura
                  </button>
                </div>
              </div>

              {/* Lista de dispositivos */}
              <div className='min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200'>
                {catalogLoading ? (
                  <div className='flex items-center justify-center gap-2 py-10 text-sm text-slate-500'>
                    <RefreshCw className='size-4 animate-spin' /> Cargando dispositivos...
                  </div>
                ) : catalogError ? (
                  <div className='px-4 py-8 text-center text-sm text-amber-700'>{catalogError}</div>
                ) : catalog.length === 0 ? (
                  <div className='px-4 py-8 text-center text-sm text-slate-500'>
                    No hay dispositivos de este tipo{search.trim() ? ' para esa búsqueda' : ''}.
                  </div>
                ) : (
                  <ul className='divide-y divide-slate-100'>
                    {pagedCatalog.map(device => {
                      const isSelected = selectedDevice?.sensorId === device.sensorId
                      const offline = device.connectionStatus && device.connectionStatus !== 'connected'
                      return (
                        <li key={device.sensorId}>
                          <button
                            type='button'
                            onClick={() => setSelectedDevice(device)}
                            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                              isSelected ? 'bg-[#3C6E71]/10' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className='min-w-0'>
                              <p className='text-sm font-semibold text-slate-900'>{device.sensorId}</p>
                              <p className='text-xs text-slate-500'>
                                Asset: {device.assetId} · {SENSOR_TYPE_LABELS[device.sensorType] ?? device.sensorType}
                              </p>
                            </div>
                            <div className='flex shrink-0 items-center gap-2 text-xs text-slate-500'>
                              {typeof device.batteryLevel === 'number' && (
                                <span className={`inline-flex items-center gap-1 ${device.batteryLevel <= 20 ? 'text-red-600' : ''}`}>
                                  <BatteryLow className='size-3.5' /> {device.batteryLevel}%
                                </span>
                              )}
                              {offline ? (
                                <WifiOff className='size-3.5 text-red-500' />
                              ) : (
                                <Wifi className='size-3.5 text-emerald-500' />
                              )}
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* Paginación */}
              {!catalogLoading && !catalogError && total > 0 && (
                <div className='mt-2 flex items-center justify-between gap-2 text-xs text-slate-500'>
                  <span>
                    {total} dispositivo{total === 1 ? '' : 's'} · página {page} de {totalPages}
                  </span>
                  <div className='flex items-center gap-1'>
                    <button
                      type='button'
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className='inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
                    >
                      <ChevronLeft className='size-3.5' /> Anterior
                    </button>
                    <button
                      type='button'
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className='inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40'
                    >
                      Siguiente <ChevronRight className='size-3.5' />
                    </button>
                  </div>
                </div>
              )}

              <div className='flex justify-end gap-3 pt-4'>
                <button
                  type='button'
                  onClick={() => setIsModalOpen(false)}
                  className='rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  disabled={isSubmitting || !selectedDevice}
                  className='rounded-lg bg-[#3C6E71] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2A4D4F] disabled:opacity-50'
                >
                  {isSubmitting ? 'Guardando...' : selectedDevice ? `Vincular ${selectedDevice.sensorId}` : 'Selecciona un dispositivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
