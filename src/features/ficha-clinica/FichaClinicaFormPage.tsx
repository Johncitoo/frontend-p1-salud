import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, ClipboardPen, Lock, RefreshCw, Save, Send } from 'lucide-react'

import { apiGet, apiPatch, apiPost } from '@/lib/api'
import type {
  FichaClinicaRow,
  FichaClinicaPayload,
  PlantillaFichaRow,
  PlantillaCampoRow,
  DynamicFieldValue,
} from './types'
import {
  buildFichaPayload,
  emptyFichaForm,
  fichaToFormValues,
  getEstadoBadgeClass,
  getInputType,
  validateDynamicFields,
} from './fichaFormUtils'

// ============================================================
const fieldClassName =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#3C6E71] focus:ring-2 focus:ring-[#3C6E71]/15 disabled:cursor-not-allowed disabled:bg-slate-100'
const labelClassName = 'text-sm font-medium text-slate-700'
const checkClassName = 'mt-1.5 size-5 rounded border-slate-300 text-[#3C6E71] focus:ring-[#3C6E71]/20'

type FichaClinicaFormPageProps = {
  fichaId?: string
  /** Si viene de una visita concreta, la precarga */
  visitaId?: string
}

const FichaClinicaFormPage = ({ fichaId, visitaId: propVisitaId }: FichaClinicaFormPageProps) => {
  const isEditing = Boolean(fichaId)

  // Estados
  const [plantillas, setPlantillas] = useState<PlantillaFichaRow[]>([])
  const [campos, setCampos] = useState<PlantillaCampoRow[]>([])
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
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [conflictWarning, setConflictWarning] = useState(false)

  // ---- carga inicial ----
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError('')

      try {
        // Cargar plantillas activas
        const pts = await apiGet<PlantillaFichaRow[]>('/plantillas-ficha')
        if (cancelled) return
        setPlantillas(pts.filter(p => p.activa))

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
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar datos.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [fichaId, propVisitaId])

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
        // Limpiar campos si es creación
        if (!fichaId) setFields({})
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

  const handleSubmit = async (e: FormEvent, cerrar: boolean) => {
    e.preventDefault()

    if (!visitaId) {
      setError('Selecciona una visita para asociar la ficha clínica.')
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

  const isClosed = fichaEstado === 'CERRADA'

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
              {/* Visita ID + Plantilla */}
              <div className='mb-6 grid gap-5 sm:grid-cols-2'>
                <label className={labelClassName}>
                  ID de visita <span className='text-red-600'>*</span>
                  <input
                    value={visitaId}
                    onChange={e => setVisitaId(e.target.value)}
                    placeholder='UUID de la visita'
                    disabled={isEditing || isClosed}
                    className={fieldClassName}
                  />
                </label>

                <label className={labelClassName}>
                  Plantilla clínica
                  <select
                    value={plantillaFichaId}
                    onChange={e => setPlantillaFichaId(e.target.value)}
                    disabled={isEditing || isClosed}
                    className={fieldClassName}
                  >
                    <option value=''>— Sin plantilla (formulario libre) —</option>
                    {plantillas.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.codigo})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* campos dinámicos */}
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
                        const opciones = campo.opciones as Record<string, string> | undefined
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
                              {opciones && Object.entries(opciones).map(([k, v]) => (
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
