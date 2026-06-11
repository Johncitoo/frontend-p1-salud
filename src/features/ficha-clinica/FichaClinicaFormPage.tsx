import { FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarPlus, ClipboardPen, Lock, RefreshCw, Save, Send } from 'lucide-react'

import { apiGet, apiPatch, apiPost } from '@/lib/api'
import type {
  FichaClinicaRow,
  FichaClinicaPayload,
  PatientOptionRow,
  PlantillaFichaRow,
  PlantillaCampoRow,
  DynamicFieldValue,
  VisitaOptionRow,
} from './types'
import {
  buildFichaPayload,
  fichaToFormValues,
  getEstadoBadgeClass,
  getInputType,
  validateDynamicFields,
} from './fichaFormUtils'
import { clearDraft, readDraft, saveDraft } from './draftStorage'

// ============================================================
const fieldClassName =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#3C6E71] focus:ring-2 focus:ring-[#3C6E71]/15 disabled:cursor-not-allowed disabled:bg-slate-100'
const labelClassName = 'text-sm font-medium text-slate-700'
const checkClassName = 'mt-1.5 size-5 rounded border-slate-300 text-[#3C6E71] focus:ring-[#3C6E71]/20'

const formatVisitLabel = (visita: VisitaOptionRow) => {
  const fecha = visita.fechaRealizada ?? visita.fechaProgramada ?? visita.createdAt
  const fechaLabel = fecha
    ? new Date(fecha).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Sin fecha'

  return `${fechaLabel}${visita.estado ? ` · ${visita.estado}` : ''}`
}

const sortPlantillas = (plantillas: PlantillaFichaRow[]) =>
  [...plantillas].sort((a, b) => {
    if (a.codigo === 'CONTROL_DOMICILIARIO_GENERAL') return -1
    if (b.codigo === 'CONTROL_DOMICILIARIO_GENERAL') return 1
    return a.nombre.localeCompare(b.nombre, 'es')
  })

const getOptionEntries = (opciones?: Record<string, unknown>) =>
  Object.entries(opciones ?? {}).map(([key, value]) => [key, String(value)] as const)

type FichaClinicaFormPageProps = {
  fichaId?: string
  /** Si viene de una visita concreta, la precarga */
  visitaId?: string
}

type FichaFormDraft = {
  pacienteId: string
  visitaId: string
  plantillaFichaId: string
  fields: Record<string, DynamicFieldValue>
  observaciones: string
  currentVersion: number
  fichaEstado: string
}

const FichaClinicaFormPage = ({ fichaId, visitaId: propVisitaId }: FichaClinicaFormPageProps) => {
  const isEditing = Boolean(fichaId)
  const draftKey = `ficha-form:${fichaId ?? propVisitaId ?? 'new'}`
  const shouldSaveDraftRef = useRef(true)

  // Estados
  const [plantillas, setPlantillas] = useState<PlantillaFichaRow[]>([])
  const [campos, setCampos] = useState<PlantillaCampoRow[]>([])
  const [patients, setPatients] = useState<PatientOptionRow[]>([])
  const [visitas, setVisitas] = useState<VisitaOptionRow[]>([])
  const [pacienteId, setPacienteId] = useState('')
  const [visitaId, setVisitaId] = useState(propVisitaId ?? '')
  const [plantillaFichaId, setPlantillaFichaId] = useState('')
  const [fields, setFields] = useState<Record<string, DynamicFieldValue>>({})
  const [observaciones, setObservaciones] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Optimistic locking
  const [currentVersion, setCurrentVersion] = useState<number>(1)
  const [fichaEstado, setFichaEstado] = useState<string>('BORRADOR')

  // UI
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [conflictWarning, setConflictWarning] = useState(false)
  const [isLoadingVisits, setIsLoadingVisits] = useState(false)
  const [isCreatingVisit, setIsCreatingVisit] = useState(false)
  const isClosed = fichaEstado === 'CERRADA'

  // ---- carga inicial ----
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setHasLoaded(false)
      setError('')

      try {
        // Cargar datos base para construir la ficha sin pedir UUIDs a mano.
        const [pts, patientRows] = await Promise.all([
          apiGet<PlantillaFichaRow[]>('/plantillas-ficha'),
          apiGet<PatientOptionRow[]>('/pacientes'),
        ])
        if (cancelled) return
        const activePlantillas = sortPlantillas(pts.filter(p => p.activa))
        setPlantillas(activePlantillas)
        setPatients(patientRows)

        if (!fichaId && activePlantillas.length > 0 && !plantillaFichaId) {
          setPlantillaFichaId(activePlantillas[0].id)
        }

        if (fichaId) {
          // Modo edición: cargar ficha existente
          const ficha = await apiGet<FichaClinicaRow>(`/fichas-clinicas/${fichaId}`)
          if (cancelled) return

          setVisitaId(ficha.visitaId)
          setCurrentVersion(ficha.version)
          setFichaEstado(ficha.estado)

          if (ficha.plantillaFichaId) {
            setPlantillaFichaId(ficha.plantillaFichaId)

            // Cargar plantilla con campos
            const pt = await apiGet<PlantillaFichaRow>(
              `/plantillas-ficha/${ficha.plantillaFichaId}`,
            )
            if (cancelled) return

            const activeCampos = (pt.campos ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden)
            setCampos(activeCampos)

            const formValues = fichaToFormValues(ficha, activeCampos, ficha.visitaId)
            setFields(formValues.fields)
            setObservaciones(formValues.observaciones)
          }
        } else if (propVisitaId) {
          // Modo creación desde visita
          setVisitaId(propVisitaId)
        }

        const draft = readDraft<FichaFormDraft>(draftKey)
        if (draft) {
          setPacienteId(draft.value.pacienteId)
          setVisitaId(draft.value.visitaId)
          setPlantillaFichaId(draft.value.plantillaFichaId)
          setFields(draft.value.fields)
          setObservaciones(draft.value.observaciones)
          setCurrentVersion(draft.value.currentVersion)
          setFichaEstado(draft.value.fichaEstado)
          setSuccessMsg(`Borrador local restaurado. Ultimo guardado: ${new Date(draft.savedAt).toLocaleString('es-CL')}.`)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar datos.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          setHasLoaded(true)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [draftKey, fichaId, propVisitaId])

  useEffect(() => {
    if (!shouldSaveDraftRef.current || !hasLoaded || isLoading || isSaving || isClosed) return

    saveDraft<FichaFormDraft>(draftKey, {
      pacienteId,
      visitaId,
      plantillaFichaId,
      fields,
      observaciones,
      currentVersion,
      fichaEstado,
    })
  }, [currentVersion, draftKey, fichaEstado, fields, hasLoaded, isClosed, isLoading, isSaving, observaciones, pacienteId, plantillaFichaId, visitaId])

  // ---- al cambiar de paciente, cargar visitas legibles ----
  useEffect(() => {
    if (!pacienteId || isEditing) {
      if (!pacienteId) setVisitas([])
      return
    }

    let cancelled = false
    setIsLoadingVisits(true)
    setError('')

    apiGet<VisitaOptionRow[]>(`/pacientes/${pacienteId}/visitas`)
      .then(rows => {
        if (cancelled) return
        setVisitas(rows)
        setVisitaId(current => (rows.some(v => v.id === current) ? current : rows[0]?.id ?? ''))
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las visitas del paciente.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingVisits(false)
      })

    return () => { cancelled = true }
  }, [isEditing, pacienteId])

  // ---- al cambiar de plantilla, cargar sus campos ----
  useEffect(() => {
    if (!plantillaFichaId) {
      setCampos([])
      return
    }

    let cancelled = false
    apiGet<PlantillaFichaRow>(`/plantillas-ficha/${plantillaFichaId}`)
      .then(pt => {
        if (cancelled) return
        const activeCampos = (pt.campos ?? []).filter(c => c.activo).sort((a, b) => a.orden - b.orden)
        setCampos(activeCampos)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [plantillaFichaId, fichaId])

  // ---- handlers ----
  const updateField = (codigo: string, value: DynamicFieldValue) => {
    setFields(prev => ({ ...prev, [codigo]: value }))
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[codigo]
      return next
    })
    setError('')
    setConflictWarning(false)
  }

  const handleRetryWithLatest = async () => {
    if (!fichaId) return
    setConflictWarning(false)
    setError('')

    try {
      const ficha = await apiGet<FichaClinicaRow>(`/fichas-clinicas/${fichaId}`)
      setCurrentVersion(ficha.version)

      if (ficha.plantillaFichaId && campos.length > 0) {
        const formValues = fichaToFormValues(ficha, campos, ficha.visitaId)
        setFields(formValues.fields)
        setObservaciones(formValues.observaciones)
      }

      setSuccessMsg('Datos recargados con la última versión. Revisa e intenta guardar de nuevo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo recargar la ficha.')
    }
  }

  const handleCreateVisit = async () => {
    if (!pacienteId) {
      setError('Selecciona un paciente antes de crear una visita.')
      return
    }

    setIsCreatingVisit(true)
    setError('')

    try {
      const created = await apiPost<VisitaOptionRow, {
        pacienteId: string
        fechaProgramada: string
        observacion: string
      }>(`/pacientes/${pacienteId}/visitas`, {
        pacienteId,
        fechaProgramada: new Date().toISOString(),
        observacion: 'Visita creada desde ficha clinica',
      })

      setVisitas(prev => [created, ...prev])
      setVisitaId(created.id)
      setSuccessMsg('Visita creada y seleccionada para esta ficha.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la visita.')
    } finally {
      setIsCreatingVisit(false)
    }
  }

  const handleSubmit = async (e: FormEvent, cerrar: boolean) => {
    e.preventDefault()

    if (!visitaId) {
      setError('Selecciona una visita o crea una visita nueva para asociar la ficha clinica.')
      return
    }

    if (!plantillaFichaId) {
      setError('Selecciona una plantilla clinica para mostrar los campos de la ficha.')
      return
    }

    const errors = validateDynamicFields(fields, campos)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Completa los campos obligatorios antes de guardar.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccessMsg('')
    setConflictWarning(false)

    try {
      const payload = buildFichaPayload({
        visitaId,
        plantillaFichaId,
        fields,
        observaciones,
      })

      if (cerrar) payload.estado = 'CERRADA'

      if (isEditing) {
        // PATCH con version para optimistic locking
        const updated = await apiPatch<FichaClinicaRow, FichaClinicaPayload>(
          `/fichas-clinicas/${fichaId}?version=${currentVersion}`,
          payload,
        )
        setCurrentVersion(updated.version)
        if (cerrar) setFichaEstado('CERRADA')
        setSuccessMsg(cerrar ? 'Ficha clínica cerrada correctamente.' : 'Ficha clínica actualizada.')
        shouldSaveDraftRef.current = false
        clearDraft(draftKey)
      } else {
        const created = await apiPost<FichaClinicaRow, FichaClinicaPayload>(
          '/fichas-clinicas',
          payload,
        )
        setCurrentVersion(created.version)
        setFichaEstado(created.estado)

        if (cerrar) {
          // Cerrar después de crear
          const closed = await apiPatch<FichaClinicaRow, { estado: string }>(
            `/fichas-clinicas/${created.id}/cerrar`,
            { estado: 'CERRADA' },
          )
          setFichaEstado('CERRADA')
          setCurrentVersion(closed.version)
        }

        setSuccessMsg(cerrar ? 'Ficha clínica creada y cerrada.' : 'Ficha clínica creada correctamente.')
        shouldSaveDraftRef.current = false
        clearDraft(draftKey)
      }
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message

        if (err.message.includes('409') || msg.includes('modificada por otro') || msg.includes('Conflict')) {
          setConflictWarning(true)
          setError('⚠️ Conflicto de edición: otro profesional modificó esta ficha mientras editabas.')
        } else {
          setError(msg)
        }
      } else {
        setError('Error inesperado al guardar la ficha.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // ---- render ----
  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-5xl'>
        {/* breadcrumb */}
        <a
          href='/fichas-clinicas'
          className='mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#284B63] transition hover:text-[#3C6E71]'
        >
          <ArrowLeft className='size-4' />
          Volver a fichas clínicas
        </a>

        {/* header */}
        <header className='mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex flex-wrap items-center gap-3'>
            <span className='rounded-2xl bg-[#284B63] p-3 text-white'>
              <ClipboardPen className='size-6' />
            </span>
            <div className='flex-1'>
              <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#284B63]'>
                Ficha clínica
              </p>
              <h1 className='m-0 text-3xl font-semibold text-slate-900'>
                {isEditing ? 'Editar ficha clínica' : 'Nueva ficha clínica'}
              </h1>
              <p className='mt-2 text-sm text-slate-600'>
                {isEditing
                  ? 'Actualiza los datos de la atención domiciliaria. Los cambios se reflejarán en las mediciones normalizadas.'
                  : 'Registra una nueva atención usando la plantilla clínica correspondiente.'}
              </p>
            </div>
            {isEditing && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getEstadoBadgeClass(fichaEstado)}`}>
                {fichaEstado}
              </span>
            )}
          </div>

          {/* version indicator */}
          {isEditing && (
            <div className='mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500'>
              <Lock className='size-3.5' />
              Versión actual: <span className='font-mono font-semibold text-slate-700'>v{currentVersion}</span>
              <span className='text-slate-400'>— si otro profesional edita simultáneamente, se te notificará.</span>
            </div>
          )}
        </header>

        {/* error / success / conflict */}
        {error && (
          <div className={`mb-5 rounded-xl border px-5 py-4 text-sm ${conflictWarning ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <p className='font-semibold'>{error}</p>
            {conflictWarning && (
              <button
                type='button'
                onClick={handleRetryWithLatest}
                className='mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-200 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-300'
              >
                <RefreshCw className='size-3.5' />
                Recargar con la última versión
              </button>
            )}
          </div>
        )}

        {successMsg && (
          <div className='mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800'>
            {successMsg}
          </div>
        )}

        {/* formulario */}
        <form
          onSubmit={e => handleSubmit(e, false)}
          className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
        >
          {isLoading ? (
            <p className='py-10 text-center text-sm text-slate-500'>Cargando datos de la ficha...</p>
          ) : (
            <>
              {/* Paciente + Visita + Plantilla */}
              <div className='mb-6 grid gap-5 lg:grid-cols-3'>
                <label className={labelClassName}>
                  Paciente <span className='text-red-600'>*</span>
                  <select
                    value={pacienteId}
                    onChange={e => {
                      setPacienteId(e.target.value)
                      setVisitaId('')
                      setVisitas([])
                      setSuccessMsg('')
                    }}
                    disabled={isEditing || isClosed || Boolean(propVisitaId)}
                    className={fieldClassName}
                  >
                    <option value=''>Selecciona un paciente</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.nombres} {patient.apellidos} · {patient.rut}
                      </option>
                    ))}
                  </select>
                  {!isEditing && patients.length === 0 && (
                    <p className='mt-2 text-xs text-amber-300'>
                      No hay pacientes disponibles. Registra un paciente antes de crear la ficha.
                    </p>
                  )}
                </label>

                <div>
                  <label className={labelClassName}>
                    Visita asociada <span className='text-red-600'>*</span>
                    <select
                      value={visitaId}
                      onChange={e => setVisitaId(e.target.value)}
                      disabled={isEditing || isClosed || Boolean(propVisitaId) || !pacienteId || isLoadingVisits}
                      className={fieldClassName}
                    >
                      <option value=''>
                        {isLoadingVisits ? 'Cargando visitas...' : 'Selecciona una visita'}
                      </option>
                      {visitas.map(visita => (
                        <option key={visita.id} value={visita.id}>
                          {formatVisitLabel(visita)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!isEditing && pacienteId && visitas.length === 0 && !isLoadingVisits && (
                    <button
                      type='button'
                      onClick={handleCreateVisit}
                      disabled={isCreatingVisit || isClosed}
                      className='mt-2 inline-flex items-center gap-2 rounded-lg border border-[#3C6E71]/40 px-3 py-2 text-xs font-semibold text-[#CDE7EA] transition hover:bg-[#3C6E71]/20 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      <CalendarPlus className='size-3.5' />
                      {isCreatingVisit ? 'Creando visita...' : 'Crear visita para esta atencion'}
                    </button>
                  )}
                  <p className='mt-2 text-xs text-slate-400'>
                    La visita conecta esta ficha con el paciente atendido y permite guardar mediciones clinicas.
                  </p>
                </div>

                <label className={labelClassName}>
                  Plantilla clínica
                  <select
                    value={plantillaFichaId}
                    onChange={e => {
                      setPlantillaFichaId(e.target.value)
                      setFields({})
                      setFieldErrors({})
                      setSuccessMsg('')
                    }}
                    disabled={isEditing || isClosed}
                    className={fieldClassName}
                  >
                    <option value=''>Selecciona una plantilla</option>
                    {plantillas.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.codigo})
                      </option>
                    ))}
                  </select>
                  {plantillas.length === 0 && (
                    <p className='mt-2 text-xs text-amber-300'>
                      No hay plantillas activas. Crea o activa una plantilla para que aparezcan campos en la ficha.
                    </p>
                  )}
                </label>
              </div>

              {/* campos dinámicos */}
              {plantillaFichaId && campos.length === 0 && (
                <div className='mb-6 rounded-xl border border-amber-300/40 bg-amber-100/10 px-4 py-3 text-sm text-amber-100'>
                  La plantilla seleccionada no tiene campos activos. Agrega campos a la plantilla para poder completar la ficha.
                </div>
              )}

              {campos.length > 0 && (
                <div className='mb-6 border-t border-slate-200 pt-5'>
                  <h2 className='mb-4 text-lg font-semibold text-slate-800'>Campos clínicos</h2>
                  <div className='grid gap-5 md:grid-cols-2'>
                    {campos.map(campo => {
                      const inputType = getInputType(campo.tipoCampo)
                      const value = fields[campo.codigoCampo] ?? ''
                      const err = fieldErrors[campo.codigoCampo]

                      if (inputType === 'checkbox') {
                        return (
                          <label key={campo.id} className='flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3'>
                            <input
                              type='checkbox'
                              checked={Boolean(value)}
                              onChange={e => updateField(campo.codigoCampo, e.target.checked)}
                              disabled={isClosed}
                              className={checkClassName}
                            />
                            <span className='text-sm font-medium text-slate-700'>
                              {campo.etiqueta}
                              {campo.obligatorio && <span className='ml-1 text-red-500'>*</span>}
                            </span>
                          </label>
                        )
                      }

                      if (inputType === 'select') {
                        const opciones = getOptionEntries(campo.opciones)

                        if (campo.tipoCampo === 'MULTISELECT') {
                          const selectedValues = Array.isArray(value) ? value : []

                          return (
                            <fieldset key={campo.id} className='rounded-lg border border-slate-200 bg-slate-50 px-4 py-3'>
                              <legend className='px-1 text-sm font-medium text-slate-700'>
                                {campo.etiqueta}
                                {campo.obligatorio && <span className='text-red-600'>*</span>}
                              </legend>
                              <div className='mt-2 space-y-2'>
                                {opciones.map(([optionKey, optionLabel]) => (
                                  <label key={optionKey} className='flex items-center gap-2 text-sm text-slate-700'>
                                    <input
                                      type='checkbox'
                                      checked={selectedValues.includes(optionKey)}
                                      onChange={e => {
                                        const nextValues = e.target.checked
                                          ? [...selectedValues, optionKey]
                                          : selectedValues.filter(selected => selected !== optionKey)
                                        updateField(campo.codigoCampo, nextValues)
                                      }}
                                      disabled={isClosed}
                                      className='size-4 rounded border-slate-300 text-[#3C6E71] focus:ring-[#3C6E71]/20'
                                    />
                                    {optionLabel}
                                  </label>
                                ))}
                              </div>
                              {campo.ayudaTexto && <p className='mt-2 text-xs text-slate-400'>{campo.ayudaTexto}</p>}
                              {err && <span className='mt-2 block text-xs text-red-600'>{err}</span>}
                            </fieldset>
                          )
                        }

                        return (
                          <label key={campo.id} className={labelClassName}>
                            {campo.etiqueta}
                            {campo.obligatorio && <span className='text-red-600'>*</span>}
                            <select
                              value={String(value)}
                              onChange={e => updateField(campo.codigoCampo, e.target.value)}
                              disabled={isClosed}
                              className={fieldClassName}
                            >
                              <option value=''>Seleccionar</option>
                              {opciones.map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                            {campo.ayudaTexto && <p className='mt-1 text-xs text-slate-400'>{campo.ayudaTexto}</p>}
                            {err && <span className='mt-1 block text-xs text-red-600'>{err}</span>}
                          </label>
                        )
                      }

                      return (
                        <label key={campo.id} className={labelClassName}>
                          {campo.etiqueta}
                          {campo.obligatorio && <span className='text-red-600'>*</span>}
                          {campo.tipoCampo === 'VARIABLE_CLINICA' && (
                            <span className='ml-1.5 rounded bg-[#3C6E71]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#284B63]'>
                              normalizado
                            </span>
                          )}
                          <input
                            type={inputType}
                            value={inputType === 'number' ? (value as number || '') : String(value)}
                            onChange={e => {
                              const raw = e.target.value
                              updateField(
                                campo.codigoCampo,
                                inputType === 'number' ? (raw === '' ? '' : Number(raw)) : raw,
                              )
                            }}
                            step={inputType === 'number' ? 'any' : undefined}
                            disabled={isClosed}
                            placeholder={campo.ayudaTexto ?? campo.etiqueta}
                            className={fieldClassName}
                          />
                          {err && <span className='mt-1 block text-xs text-red-600'>{err}</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* observaciones generales */}
              <div className='mb-6 border-t border-slate-200 pt-5'>
                <label className={labelClassName}>
                  Observaciones generales
                  <textarea
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    rows={4}
                    disabled={isClosed}
                    placeholder='Anotaciones libres, comentarios clínicos, indicaciones...'
                    className={`${fieldClassName} resize-y`}
                  />
                </label>
              </div>

              {/* botones */}
              <div className='flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5'>
                <a
                  href='/fichas-clinicas'
                  onClick={() => {
                    shouldSaveDraftRef.current = false
                    clearDraft(draftKey)
                  }}
                  className='inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50'
                >
                  Cancelar
                </a>

                {isClosed ? (
                  <span className='inline-flex h-10 items-center rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-500'>
                    Ficha cerrada — solo lectura
                  </span>
                ) : (
                  <>
                    <button
                      type='submit'
                      disabled={isSaving}
                      className='inline-flex h-10 items-center gap-2 rounded-lg bg-[#3C6E71] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#284B63] disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      <Save className='size-4' />
                      {isSaving ? 'Guardando...' : 'Guardar borrador'}
                    </button>

                    <button
                      type='button'
                      disabled={isSaving}
                      onClick={e => handleSubmit(e, true)}
                      className='inline-flex h-10 items-center gap-2 rounded-lg bg-[#284B63] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#203C50] disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      <Send className='size-4' />
                      {isSaving ? 'Cerrando...' : 'Guardar y cerrar ficha'}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </form>
      </section>
    </main>
  )
}

export default FichaClinicaFormPage
