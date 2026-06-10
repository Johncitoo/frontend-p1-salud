import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'

import { apiGet, apiPatch, apiPost } from '@/lib/api'
import type { ZoneFormValues, ZoneRow } from './types'

const initialValues: ZoneFormValues = {
  nombre: '',
  descripcion: '',
  comuna: '',
  region: '',
  activa: true,
}

type ZoneFormPageProps = {
  zoneId?: string
}

const ZoneFormPage = ({ zoneId }: ZoneFormPageProps) => {
  const isEditing = Boolean(zoneId)
  const [values, setValues] = useState<ZoneFormValues>(initialValues)
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!zoneId) return

    let isMounted = true
    setIsLoading(true)

    apiGet<ZoneRow>(`/zonas/${zoneId}`)
      .then(zone => {
        if (!isMounted) return
        setValues({
          nombre: zone.nombre,
          descripcion: zone.descripcion || '',
          comuna: zone.comuna,
          region: zone.region,
          activa: zone.activa,
        })
      })
      .catch(fetchError => {
        if (isMounted) setError(fetchError instanceof Error ? fetchError.message : 'No fue posible cargar la zona.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [zoneId])

  const updateValue = <TKey extends keyof ZoneFormValues>(key: TKey, value: ZoneFormValues[TKey]) => {
    setValues(currentValues => ({ ...currentValues, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    const payload = {
      ...values,
      descripcion: values.descripcion.trim() || null,
    }

    try {
      if (zoneId) {
        await apiPatch<ZoneRow, typeof payload>(`/zonas/${zoneId}`, payload)
      } else {
        await apiPost<ZoneRow, typeof payload>('/zonas', payload)
      }

      window.location.href = '/zones'
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No fue posible guardar la zona.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-3xl'>
        <a href='/zones' className='mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900'>
          <ArrowLeft className='size-4' />
          Volver a zonas
        </a>

        <div className='rounded-md border border-slate-300 bg-white p-6 shadow-sm'>
          <header className='mb-6'>
            <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>
              Cobertura territorial
            </p>
            <h1 className='m-0 text-3xl font-semibold text-slate-900'>
              {isEditing ? 'Editar zona' : 'Crear zona'}
            </h1>
            <p className='mt-2 text-sm text-slate-600'>
              Define nombre, territorio y estado operativo de la zona de cobertura.
            </p>
          </header>

          {error && (
            <div className='mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
              {error}
            </div>
          )}

          {isLoading ? (
            <p className='py-10 text-center text-sm text-slate-500'>Cargando zona...</p>
          ) : (
            <form className='space-y-5' onSubmit={handleSubmit}>
              <div className='grid gap-4 sm:grid-cols-2'>
                <label className='block'>
                  <span className='text-sm font-medium text-slate-700'>Nombre</span>
                  <input
                    value={values.nombre}
                    onChange={event => updateValue('nombre', event.target.value)}
                    required
                    maxLength={100}
                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#C9DCDD]'
                  />
                </label>

                <label className='block'>
                  <span className='text-sm font-medium text-slate-700'>Comuna</span>
                  <input
                    value={values.comuna}
                    onChange={event => updateValue('comuna', event.target.value)}
                    required
                    maxLength={100}
                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#C9DCDD]'
                  />
                </label>
              </div>

              <label className='block'>
                <span className='text-sm font-medium text-slate-700'>Region</span>
                <input
                  value={values.region}
                  onChange={event => updateValue('region', event.target.value)}
                  required
                  maxLength={100}
                  className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#C9DCDD]'
                />
              </label>

              <label className='block'>
                <span className='text-sm font-medium text-slate-700'>Descripcion</span>
                <textarea
                  value={values.descripcion}
                  onChange={event => updateValue('descripcion', event.target.value)}
                  rows={4}
                  className='mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#C9DCDD]'
                />
              </label>

              <label className='flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3'>
                <input
                  type='checkbox'
                  checked={values.activa}
                  onChange={event => updateValue('activa', event.target.checked)}
                  className='size-4 rounded border-slate-300 text-[#3C6E71]'
                />
                <span className='text-sm font-medium text-slate-700'>Zona activa</span>
              </label>

              <div className='flex justify-end gap-3 border-t border-slate-200 pt-5'>
                <a
                  href='/zones'
                  className='inline-flex h-10 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50'
                >
                  Cancelar
                </a>
                <button
                  type='submit'
                  disabled={isSaving}
                  className='inline-flex h-10 items-center gap-2 rounded-lg bg-[#3C6E71] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#284B63] disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <Save className='size-4' />
                  {isSaving ? 'Guardando...' : 'Guardar zona'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

export default ZoneFormPage
