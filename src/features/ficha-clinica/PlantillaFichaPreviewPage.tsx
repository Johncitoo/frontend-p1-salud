import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ClipboardPen, Pencil } from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiGet } from '@/lib/api'
import type { PlantillaCampoRow, PlantillaFichaRow } from './types'

type PlantillaFichaPreviewPageProps = {
  plantillaId: string
}

const inputPreviewClass =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-500'

const getOptionEntries = (opciones?: Record<string, unknown>) =>
  Object.entries(opciones ?? {}).map(([key, value]) => [key, String(value)] as const)

const renderPreviewInput = (campo: PlantillaCampoRow) => {
  const opciones = getOptionEntries(campo.opciones)

  switch (campo.tipoCampo) {
    case 'NUMERO_LIBRE':
    case 'VARIABLE_CLINICA':
      return <input disabled type='number' placeholder='0' className={inputPreviewClass} />
    case 'BOOLEANO':
      return (
        <label className='mt-2 flex items-center gap-2 text-sm text-slate-600'>
          <input disabled type='checkbox' className='size-4 rounded border-slate-300' />
          Marcar si aplica
        </label>
      )
    case 'FECHA':
      return <input disabled type='date' className={inputPreviewClass} />
    case 'SELECT':
      return (
        <select disabled className={inputPreviewClass}>
          <option>Selecciona una opcion</option>
          {opciones.map(([optionKey, optionLabel]) => (
            <option key={optionKey}>{optionLabel}</option>
          ))}
        </select>
      )
    case 'MULTISELECT':
      return (
        <div className='mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3'>
          {opciones.length > 0 ? opciones.map(([optionKey, optionLabel]) => (
            <label key={optionKey} className='flex items-center gap-2 text-sm text-slate-600'>
              <input disabled type='checkbox' className='size-4 rounded border-slate-300' />
              {optionLabel}
            </label>
          )) : (
            <p className='text-sm text-slate-500'>Sin opciones configuradas.</p>
          )}
        </div>
      )
    case 'ARCHIVO':
    case 'IMAGEN':
      return <input disabled type='file' aria-label={campo.etiqueta} className='mt-1.5 w-full text-sm text-slate-500' />
    default:
      return <input disabled type='text' placeholder='Respuesta' className={inputPreviewClass} />
  }
}

const PlantillaFichaPreviewPage = ({ plantillaId }: PlantillaFichaPreviewPageProps) => {
  const session = useCurrentUser()
  const canEdit =
    session.rol === 'ADMIN' || session.rol === 'COORDINADOR' || session.rol === 'SUPERVISOR'

  const [plantilla, setPlantilla] = useState<PlantillaFichaRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError('')

    apiGet<PlantillaFichaRow>(`/plantillas-ficha/${plantillaId}`)
      .then(row => {
        if (!cancelled) setPlantilla(row)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la plantilla.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [plantillaId])

  const campos = useMemo(
    () => (plantilla?.campos ?? []).filter(campo => campo.activo).sort((a, b) => a.orden - b.orden),
    [plantilla],
  )

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-5xl'>
        <a
          href='/fichas-clinicas'
          className='mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#284B63] transition hover:text-[#3C6E71]'
        >
          <ArrowLeft className='size-4' />
          Volver a fichas clinicas
        </a>

        {isLoading && (
          <div className='rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm'>
            Cargando plantilla...
          </div>
        )}

        {error && (
          <div className='rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700'>
            {error}
          </div>
        )}

        {plantilla && (
          <>
            <header className='mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
              <div className='flex flex-wrap items-center justify-between gap-4'>
                <div className='flex items-center gap-3'>
                  <span className='rounded-2xl bg-[#284B63] p-3 text-white'>
                    <ClipboardPen className='size-6' />
                  </span>
                  <div>
                    <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#284B63]'>
                      Previsualizacion de plantilla
                    </p>
                    <h1 className='m-0 text-3xl font-semibold text-slate-900'>{plantilla.nombre}</h1>
                  </div>
                </div>
                {canEdit && (
                  <a
                    href={`/fichas-clinicas/plantillas/${plantilla.id}/editar`}
                    className='inline-flex items-center gap-2 rounded-lg bg-[#3C6E71] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#284B63]'
                  >
                    <Pencil className='size-4' />
                    Editar plantilla
                  </a>
                )}
              </div>
              {plantilla.descripcion && (
                <p className='mt-4 text-sm leading-6 text-slate-600'>{plantilla.descripcion}</p>
              )}
            </header>

            <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
              {campos.length === 0 ? (
                <p className='py-8 text-center text-sm text-slate-500'>
                  Esta plantilla no tiene campos activos.
                </p>
              ) : (
                <div className='grid gap-5 md:grid-cols-2'>
                  {campos.map(campo => (
                    <label key={campo.id} className='text-sm font-medium text-slate-700'>
                      {campo.etiqueta}
                      {campo.obligatorio && <span className='ml-1 text-red-600'>*</span>}
                      {campo.tipoCampo === 'VARIABLE_CLINICA' && (
                        <span className='ml-2 rounded bg-[#3C6E71]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#284B63]'>
                          normalizado
                        </span>
                      )}
                      {renderPreviewInput(campo)}
                      <span className='mt-1 block text-xs text-slate-400'>{campo.tipoCampo}</span>
                    </label>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  )
}

export default PlantillaFichaPreviewPage
