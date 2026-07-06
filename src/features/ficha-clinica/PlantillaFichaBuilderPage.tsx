import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ClipboardPen, Plus, Save, Trash2, ArrowUp, ArrowDown } from 'lucide-react'

import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import type { PlantillaCampoRow, PlantillaFichaRow, VariableClinicaRow } from './types'
import { clearDraft, readDraft, saveDraft } from './draftStorage'

type FieldType =
  | 'TEXTO_LIBRE'
  | 'NUMERO_LIBRE'
  | 'BOOLEANO'
  | 'FECHA'
  | 'SELECT'
  | 'MULTISELECT'
  | 'JSON'
  | 'ARCHIVO'
  | 'IMAGEN'
  | 'VARIABLE_CLINICA'

type DraftCampo = {
  localId: string
  id?: string
  codigoCampo: string
  etiqueta: string
  tipoCampo: FieldType
  variableClinicaId?: string
  opciones: string[]
  obligatorio: boolean
  orden: number
  ayudaTexto?: string
}

type CreatePlantillaPayload = {
  codigo: string
  nombre: string
  descripcion?: string
  tipoAtencion?: string
  activa: boolean
}

type CreateCampoPayload = {
  codigoCampo: string
  etiqueta: string
  tipoCampo: FieldType
  variableClinicaId?: string | null
  opciones?: Record<string, string>
  obligatorio: boolean
  orden: number
  ayudaTexto?: string | null
}

type PlantillaFichaBuilderPageProps = {
  plantillaId?: string
}

type BuilderDraft = {
  nombre: string
  descripcion: string
  campos: DraftCampo[]
  removedCampoIds: string[]
}

const fieldClassName =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#3C6E71] focus:ring-2 focus:ring-[#3C6E71]/15'
const labelClassName = 'block text-xs font-bold uppercase tracking-wider text-[#9CBFC1]'

const fieldTypes: Array<{ value: FieldType; label: string; description: string }> = [
  { value: 'MULTISELECT', label: 'Lista de verificación / Checklist', description: 'Casillas múltiples para marcar tareas o procedimientos realizados.' },
  { value: 'VARIABLE_CLINICA', label: 'Signo Vital / Catálogo de Mediciones', description: 'Parámetro clínico normalizado (Temperatura, Presión, SatO2, etc.).' },
  { value: 'TEXTO_LIBRE', label: 'Notas de Evolución / Comentarios (Texto)', description: 'Observaciones generales o evolución del paciente.' },
  { value: 'BOOLEANO', label: 'Sí / No (Confirmación única)', description: 'Preguntas de descarte o estado binario (ej: presenta dolor).' },
  { value: 'SELECT', label: 'Menú de Selección Única', description: 'Elegir una sola opción de una lista de alternativas.' },
  { value: 'NUMERO_LIBRE', label: 'Medición Numérica Simple', description: 'Valores numéricos libres no normalizados.' },
  { value: 'FECHA', label: 'Fecha', description: 'Fecha de evento o registro.' },
  { value: 'ARCHIVO', label: 'Archivo Adjunto', description: 'Documentos, informes o PDFs.' },
  { value: 'IMAGEN', label: 'Imagen / Registro Fotográfico', description: 'Captura fotográfica de heridas o entornos.' },
]

const normalizeCode = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const makeLocalId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`
const fieldSupportsOptions = (tipoCampo: FieldType) => tipoCampo === 'SELECT' || tipoCampo === 'MULTISELECT'
const optionsToRecord = (opciones: string[]) =>
  opciones
    .map(option => option.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, option, index) => {
      acc[`opcion_${index + 1}`] = option
      return acc
    }, {})

const readOptions = (opciones?: Record<string, unknown>) =>
  Object.values(opciones ?? {})
    .map(option => String(option ?? '').trim())
    .filter(Boolean)

const emptyCampo = (orden: number): DraftCampo => ({
  localId: makeLocalId(),
  codigoCampo: '',
  etiqueta: '',
  tipoCampo: 'TEXTO_LIBRE',
  opciones: [],
  obligatorio: false,
  orden,
  ayudaTexto: '',
})

const ensureFieldCodes = (campos: DraftCampo[]) =>
  campos.map(campo => ({
    ...campo,
    codigoCampo: campo.tipoCampo === 'VARIABLE_CLINICA'
      ? campo.codigoCampo
      : normalizeCode(campo.etiqueta || campo.codigoCampo),
  }))

const PlantillaFichaBuilderPage = ({ plantillaId }: PlantillaFichaBuilderPageProps) => {
  const isEditing = Boolean(plantillaId)
  const draftKey = `plantilla-builder:${plantillaId ?? 'new'}`
  const shouldSaveDraftRef = useRef(true)
  const [nombre, setNombre] = useState('')
  const [existingCode, setExistingCode] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [campos, setCampos] = useState<DraftCampo[]>([emptyCampo(1)])
  const [variables, setVariables] = useState<VariableClinicaRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [removedCampoIds, setRemovedCampoIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    Promise.all([
      apiGet<VariableClinicaRow[]>('/variables-clinicas?activa=true'),
      plantillaId ? apiGet<PlantillaFichaRow>(`/plantillas-ficha/${plantillaId}`) : Promise.resolve(null),
    ])
      .then(([variableRows, plantilla]) => {
        if (cancelled) return

        setVariables(variableRows.filter(variable => variable.activa))

        if (plantilla) {
          setNombre(plantilla.nombre)
          setExistingCode(plantilla.codigo)
          setDescripcion(plantilla.descripcion ?? '')
          setCampos(
            (plantilla.campos ?? [])
              .filter(campo => campo.activo)
              .sort((a, b) => a.orden - b.orden)
              .map((campo, index) => ({
                id: campo.id,
                localId: campo.id,
                codigoCampo: campo.codigoCampo,
                etiqueta: campo.etiqueta,
                tipoCampo: campo.tipoCampo as FieldType,
                variableClinicaId: campo.variableClinicaId ?? undefined,
                opciones: readOptions(campo.opciones),
                obligatorio: campo.obligatorio,
                orden: index + 1,
                ayudaTexto: campo.ayudaTexto ?? '',
              })),
          )
        }

        const draft = readDraft<BuilderDraft>(draftKey)
        if (draft) {
          setNombre(draft.value.nombre)
          setDescripcion(draft.value.descripcion)
          setCampos(draft.value.campos.length > 0 ? draft.value.campos : [emptyCampo(1)])
          setRemovedCampoIds(draft.value.removedCampoIds)
          setSuccessMsg(`Borrador local restaurado. Ultimo guardado: ${new Date(draft.savedAt).toLocaleString('es-CL')}.`)
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el constructor de ficha.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [plantillaId, draftKey])

  useEffect(() => {
    if (!shouldSaveDraftRef.current || isLoading || isSaving) return

    saveDraft<BuilderDraft>(draftKey, {
      nombre,
      descripcion,
      campos,
      removedCampoIds,
    })
  }, [campos, descripcion, draftKey, isLoading, isSaving, nombre, removedCampoIds])

  const variableById = useMemo(
    () => new Map(variables.map(variable => [variable.id, variable])),
    [variables],
  )
  const generatedCode = normalizeCode(nombre).toUpperCase()
  const displayCode = isEditing ? existingCode : generatedCode

  const updateCampo = (localId: string, patch: Partial<DraftCampo>) => {
    setCampos(prev => prev.map(campo => {
      if (campo.localId !== localId) return campo

      const next = { ...campo, ...patch }
      if (patch.tipoCampo && patch.tipoCampo !== 'VARIABLE_CLINICA') {
        next.variableClinicaId = undefined
      }
      if (patch.tipoCampo && !fieldSupportsOptions(patch.tipoCampo)) {
        next.opciones = []
      }
      if (patch.tipoCampo && fieldSupportsOptions(patch.tipoCampo) && next.opciones.length === 0) {
        next.opciones = ['']
      }

      return next
    }))
  }

  const updateOption = (localId: string, optionIndex: number, value: string) => {
    setCampos(prev => prev.map(campo => {
      if (campo.localId !== localId) return campo
      const opciones = [...campo.opciones]
      opciones[optionIndex] = value
      return { ...campo, opciones }
    }))
  }

  const addOption = (localId: string) => {
    setCampos(prev => prev.map(campo => (
      campo.localId === localId ? { ...campo, opciones: [...campo.opciones, ''] } : campo
    )))
  }

  const removeOption = (localId: string, optionIndex: number) => {
    setCampos(prev => prev.map(campo => {
      if (campo.localId !== localId) return campo
      return { ...campo, opciones: campo.opciones.filter((_, index) => index !== optionIndex) }
    }))
  }

  const applyVariableToCampo = (localId: string, variableId: string) => {
    const variable = variableById.get(variableId)
    updateCampo(localId, {
      variableClinicaId: variableId,
      codigoCampo: variable?.codigo ?? '',
      etiqueta: variable?.nombre ?? '',
      tipoCampo: 'VARIABLE_CLINICA',
    })
  }

  const addCampo = () => {
    setCampos(prev => [...prev, emptyCampo(prev.length + 1)])
  }

  const removeCampo = (localId: string) => {
    setCampos(prev => {
      const removed = prev.find(campo => campo.localId === localId)
      if (removed?.id) setRemovedCampoIds(ids => [...ids, removed.id as string])

      return prev.filter(campo => campo.localId !== localId).map((campo, index) => ({
        ...campo,
        orden: index + 1,
      }))
    })
  }

  const moveCampoUp = (index: number) => {
    if (index === 0) return
    setCampos(prev => {
      const next = [...prev]
      const temp = next[index]
      next[index] = next[index - 1]
      next[index - 1] = temp
      return next.map((campo, idx) => ({ ...campo, orden: idx + 1 }))
    })
  }

  const moveCampoDown = (index: number) => {
    if (index === campos.length - 1) return
    setCampos(prev => {
      const next = [...prev]
      const temp = next[index]
      next[index] = next[index + 1]
      next[index + 1] = temp
      return next.map((campo, idx) => ({ ...campo, orden: idx + 1 }))
    })
  }
  const addPresionArterial = () => {
    const sistolica = variables.find(variable => variable.codigo === 'presion_arterial_sistolica')
    const diastolica = variables.find(variable => variable.codigo === 'presion_arterial_diastolica')
    const nuevos: DraftCampo[] = []

    if (sistolica) {
      nuevos.push({
        localId: makeLocalId(),
        codigoCampo: sistolica.codigo,
        etiqueta: sistolica.nombre,
        tipoCampo: 'VARIABLE_CLINICA',
        variableClinicaId: sistolica.id,
        opciones: [],
        obligatorio: true,
        orden: campos.length + nuevos.length + 1,
      })
    }

    if (diastolica) {
      nuevos.push({
        localId: makeLocalId(),
        codigoCampo: diastolica.codigo,
        etiqueta: diastolica.nombre,
        tipoCampo: 'VARIABLE_CLINICA',
        variableClinicaId: diastolica.id,
        opciones: [],
        obligatorio: true,
        orden: campos.length + nuevos.length + 1,
      })
    }

    if (nuevos.length === 0) {
      setError('No encontre las variables de presion arterial en el catalogo clinico.')
      return
    }

    setCampos(prev => [...prev, ...nuevos])
  }

  const validate = () => {
    if (!nombre.trim()) return 'Ingresa un nombre para la plantilla.'
    if (!displayCode) return 'Ingresa un nombre valido para generar el codigo de la plantilla.'
    if (campos.length === 0) return 'Agrega al menos un campo.'

    const normalizedCampos = ensureFieldCodes(campos)
    const usedCodes = new Set<string>()
    for (const campo of normalizedCampos) {
      if (!campo.codigoCampo.trim()) return 'Todos los campos deben tener una etiqueta valida.'
      if (!campo.etiqueta.trim()) return 'Todos los campos deben tener etiqueta.'
      if (usedCodes.has(campo.codigoCampo)) return `Hay campos con etiquetas demasiado parecidas. Usa nombres mas especificos.`
      usedCodes.add(campo.codigoCampo)
      if (campo.tipoCampo === 'VARIABLE_CLINICA' && !campo.variableClinicaId) {
        return `El campo ${campo.etiqueta || campo.codigoCampo} debe elegir una variable clinica.`
      }
      if (fieldSupportsOptions(campo.tipoCampo)) {
        const optionLabels = campo.opciones.map(option => option.trim()).filter(Boolean)
        if (optionLabels.length === 0) return `El campo ${campo.etiqueta || campo.codigoCampo} debe tener al menos una opcion.`
        const normalizedOptions = new Set<string>()
        for (const option of optionLabels) {
          const normalizedOption = normalizeCode(option)
          if (normalizedOptions.has(normalizedOption)) return `El campo ${campo.etiqueta} tiene opciones repetidas o demasiado parecidas.`
          normalizedOptions.add(normalizedOption)
        }
      }
    }

    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccessMsg('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)

    try {
      const normalizedCampos = ensureFieldCodes(campos)
      const plantilla = isEditing && plantillaId
        ? await apiPatch<PlantillaFichaRow, Partial<CreatePlantillaPayload>>(`/plantillas-ficha/${plantillaId}`, {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || undefined,
            activa: true,
          })
        : await apiPost<PlantillaFichaRow, CreatePlantillaPayload>('/plantillas-ficha', {
        codigo: generatedCode,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        tipoAtencion: 'CONTROL_GENERAL',
        activa: true,
      })

      for (const campoId of removedCampoIds) {
        await apiDelete<PlantillaCampoRow>(`/plantillas-ficha/campos/${campoId}`)
      }

      for (const campo of normalizedCampos) {
        const payload: CreateCampoPayload = {
          codigoCampo: campo.codigoCampo,
          etiqueta: campo.etiqueta,
          tipoCampo: campo.tipoCampo,
          variableClinicaId: campo.tipoCampo === 'VARIABLE_CLINICA' ? campo.variableClinicaId : null,
          opciones: fieldSupportsOptions(campo.tipoCampo) ? optionsToRecord(campo.opciones) : {},
          obligatorio: campo.obligatorio,
          orden: campo.orden,
          ayudaTexto: campo.ayudaTexto || null,
        }

        if (campo.id) {
          await apiPatch<PlantillaCampoRow, Partial<CreateCampoPayload>>(`/plantillas-ficha/campos/${campo.id}`, payload)
        } else {
          await apiPost<PlantillaCampoRow, CreateCampoPayload>(`/plantillas-ficha/${plantilla.id}/campos`, payload)
        }
      }

      setSuccessMsg(isEditing
        ? 'Plantilla actualizada correctamente.'
        : 'Plantilla creada correctamente. Ahora se puede usar para llenar fichas clinicas.')
      shouldSaveDraftRef.current = false
      clearDraft(draftKey)
      window.setTimeout(() => {
        window.location.href = '/fichas-clinicas'
      }, 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la plantilla.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-6xl'>
        <a
          href='/fichas-clinicas'
          className='mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#284B63] transition hover:text-[#3C6E71]'
        >
          <ArrowLeft className='size-4' />
          Volver a fichas clinicas
        </a>

        <header className='mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex flex-wrap items-center gap-3'>
            <span className='rounded-2xl bg-[#284B63] p-3 text-white'>
              <ClipboardPen className='size-6' />
            </span>
            <div>
              <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#284B63]'>
                Constructor de ficha
              </p>
              <h1 className='m-0 text-3xl font-semibold text-slate-900'>
                {isEditing ? 'Editar plantilla clinica' : 'Nueva plantilla clinica'}
              </h1>
              <p className='mt-2 text-sm text-slate-600'>
                Define los campos de la ficha. Los campos clinicos medibles deben salir del catalogo de variables.
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className='mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700'>
            {error}
          </div>
        )}

        {successMsg && (
          <div className='mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800'>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-6'>
          <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='grid gap-5 md:grid-cols-2'>
              <label className={labelClassName}>
                Nombre <span className='text-red-600'>*</span>
                <input
                  value={nombre}
                  onChange={event => setNombre(event.target.value)}
                  placeholder='Control domiciliario general'
                  className={fieldClassName}
                />
              </label>

              <label className={labelClassName}>
                Descripcion
                <textarea
                  value={descripcion}
                  onChange={event => setDescripcion(event.target.value)}
                  rows={3}
                  placeholder='Describe para que se usara esta ficha.'
                  className={`${fieldClassName} resize-y`}
                />
              </label>
            </div>
          </section>

          <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h2 className='m-0 text-xl font-semibold text-slate-900'>Campos de la ficha</h2>
                <p className='mt-1 text-sm text-slate-600'>
                  Agrega campos libres o selecciona variables clinicas normalizadas.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={addPresionArterial}
                  disabled={isLoading}
                  className='inline-flex items-center gap-2 rounded-lg border border-[#3C6E71] px-3 py-2 text-sm font-semibold text-[#284B63] transition hover:bg-[#3C6E71]/10 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <Plus className='size-4' />
                  Agregar presion arterial
                </button>
                <button
                  type='button'
                  onClick={addCampo}
                  className='inline-flex items-center gap-2 rounded-lg bg-[#3C6E71] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#284B63]'
                >
                  <Plus className='size-4' />
                  Agregar campo
                </button>
              </div>
            </div>

            <div className='space-y-4'>
              {campos.map((campo, index) => (
                <article key={campo.localId} className='rounded-xl border border-[#3C6E71]/40 bg-[#182F3F] p-5 shadow-inner'>
                  <div className='mb-4 flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-2'>
                      <span className='rounded-full bg-[#284B63] px-3 py-1 text-xs font-bold text-white'>
                        Campo {index + 1}
                      </span>
                      <div className='flex items-center gap-1'>
                        <button
                          type='button'
                          onClick={() => moveCampoUp(index)}
                          disabled={index === 0}
                          className='rounded-lg border border-[#3C6E71]/40 p-1 text-[#9CBFC1] hover:bg-[#3C6E71]/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 transition'
                          title='Subir campo'
                        >
                          <ArrowUp className='size-3.5' />
                        </button>
                        <button
                          type='button'
                          onClick={() => moveCampoDown(index)}
                          disabled={index === campos.length - 1}
                          className='rounded-lg border border-[#3C6E71]/40 p-1 text-[#9CBFC1] hover:bg-[#3C6E71]/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 transition'
                          title='Bajar campo'
                        >
                          <ArrowDown className='size-3.5' />
                        </button>
                      </div>
                    </div>
                    <button
                      type='button'
                      onClick={() => removeCampo(campo.localId)}
                      disabled={campos.length === 1}
                      className='inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40'
                    >
                      <Trash2 className='size-3.5' />
                      Quitar
                    </button>
                  </div>

                  <div className='flex flex-col gap-4'>
                    <label className={labelClassName}>
                      Tipo de campo <span className='text-red-600'>*</span>
                      <select
                        value={campo.tipoCampo}
                        onChange={event => updateCampo(campo.localId, { tipoCampo: event.target.value as FieldType })}
                        className={fieldClassName}
                      >
                        {fieldTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <span className='mt-1 block text-xs text-[#8fa3b0]'>
                        {fieldTypes.find(type => type.value === campo.tipoCampo)?.description}
                      </span>
                    </label>

                    {campo.tipoCampo === 'VARIABLE_CLINICA' && (
                      <label className={labelClassName}>
                        Variable clinica <span className='text-red-600'>*</span>
                        <select
                          value={campo.variableClinicaId ?? ''}
                          onChange={event => applyVariableToCampo(campo.localId, event.target.value)}
                          className={fieldClassName}
                        >
                          <option value=''>Selecciona una variable del catalogo</option>
                          {variables.map(variable => (
                            <option key={variable.id} value={variable.id}>
                              {variable.nombre} ({variable.codigo}){variable.unidad ? ` · ${variable.unidad}` : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <label className={labelClassName}>
                      Etiqueta <span className='text-red-600'>*</span>
                      <input
                        value={campo.etiqueta}
                        onChange={event => {
                          updateCampo(campo.localId, {
                            etiqueta: event.target.value,
                            codigoCampo: campo.tipoCampo === 'VARIABLE_CLINICA'
                              ? campo.codigoCampo
                              : normalizeCode(event.target.value),
                          })
                        }}
                        placeholder='Ej: Curación de herida, Temperatura'
                        className={fieldClassName}
                      />
                      <span className='mt-1 block text-xs text-[#8fa3b0]'>
                        El identificador interno se genera automaticamente desde esta etiqueta.
                      </span>
                    </label>

                    <label className={labelClassName}>
                      Texto de ayuda o guía para el profesional
                      <input
                        value={campo.ayudaTexto ?? ''}
                        onChange={event => updateCampo(campo.localId, { ayudaTexto: event.target.value })}
                        placeholder='Ej: Registrar valor en grados Celsius, Marcar lo realizado'
                        className={fieldClassName}
                      />
                      <span className='mt-1 block text-xs text-[#8fa3b0]'>
                        Se mostrará como guía o marcador bajo el campo al rellenar la ficha.
                      </span>
                    </label>

                    <label className='flex items-center gap-2 text-sm font-semibold text-slate-700 my-1'>
                      <input
                        type='checkbox'
                        checked={campo.obligatorio}
                        onChange={event => updateCampo(campo.localId, { obligatorio: event.target.checked })}
                        className='size-4 rounded border-slate-300 text-[#3C6E71] focus:ring-[#3C6E71]/20'
                      />
                      Obligatorio
                    </label>

                    {fieldSupportsOptions(campo.tipoCampo) && (
                      <div className='lg:col-span-4'>
                        <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
                          <div>
                            <p className='m-0 text-sm font-semibold text-slate-700'>Opciones</p>
                            <p className='m-0 text-xs text-[#8fa3b0]'>
                              Escribe las alternativas que vera quien llene esta ficha.
                            </p>
                          </div>
                          <button
                            type='button'
                            onClick={() => addOption(campo.localId)}
                            className='inline-flex items-center gap-1 rounded-lg border border-[#3C6E71] px-2.5 py-1.5 text-xs font-semibold text-[#284B63] transition hover:bg-[#3C6E71]/10'
                          >
                            <Plus className='size-3.5' />
                            Agregar opcion
                          </button>
                        </div>

                        <div className='space-y-2'>
                          {campo.opciones.map((option, optionIndex) => (
                            <div key={`${campo.localId}-option-${optionIndex}`} className='flex gap-2'>
                              <input
                                value={option}
                                onChange={event => updateOption(campo.localId, optionIndex, event.target.value)}
                                placeholder={`Opcion ${optionIndex + 1}`}
                                className={fieldClassName}
                              />
                              <button
                                type='button'
                                onClick={() => removeOption(campo.localId, optionIndex)}
                                className='mt-1.5 inline-flex h-11 shrink-0 items-center rounded-lg border border-red-500/30 px-3 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300'
                              >
                                Quitar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className='flex flex-wrap justify-end gap-3'>
            <a
              href='/fichas-clinicas'
              onClick={() => {
                shouldSaveDraftRef.current = false
                clearDraft(draftKey)
              }}
              className='inline-flex h-11 items-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50'
            >
              Cancelar
            </a>
            <button
              type='submit'
              disabled={isSaving || isLoading}
              className='inline-flex h-11 items-center gap-2 rounded-lg bg-[#284B63] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#203C50] disabled:cursor-not-allowed disabled:opacity-60'
            >
              <Save className='size-4' />
              {isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear plantilla'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default PlantillaFichaBuilderPage
