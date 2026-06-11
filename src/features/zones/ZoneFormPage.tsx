import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Save } from 'lucide-react'

import { apiGet, apiPatch, apiPost } from '@/lib/api'
import type { ZoneFormValues, ZoneRow } from './types'
import { CHILE_REGIONS, getComunasByRegion } from './geoCatalog'

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
  const [existingZones, setExistingZones] = useState<ZoneRow[]>([])
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    setIsLoading(isEditing)

    Promise.all([
      apiGet<ZoneRow[]>('/zonas'),
      zoneId ? apiGet<ZoneRow>(`/zonas/${zoneId}`) : Promise.resolve(null),
    ])
      .then(([zones, zone]) => {
        if (!isMounted) return
        setExistingZones(zones)
        if (zone) {
          setValues({
            nombre: zone.nombre,
            descripcion: zone.descripcion || '',
            comuna: zone.comuna,
            region: zone.region,
            activa: zone.activa,
          })
        }
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
  }, [isEditing, zoneId])

  const regionOptions = useMemo(() => {
    if (!values.region || CHILE_REGIONS.some(region => region.nombre === values.region)) return CHILE_REGIONS
    return [{ nombre: values.region, comunas: values.comuna ? [values.comuna] : [] }, ...CHILE_REGIONS]
  }, [values.comuna, values.region])
  const comunas = useMemo(() => {
    const catalogComunas = getComunasByRegion(values.region)
    if (!values.comuna || catalogComunas.includes(values.comuna)) return catalogComunas
    return [values.comuna, ...catalogComunas]
  }, [values.comuna, values.region])
  const zoneSuggestions = useMemo(() => {
    const seen = new Set<string>()
    return existingZones
      .filter(zone => zone.region === values.region && zone.comuna === values.comuna)
      .map(zone => zone.nombre)
      .filter(nombre => {
        const normalized = nombre.trim().toLowerCase()
        if (!normalized || seen.has(normalized)) return false
        seen.add(normalized)
        return true
      })
  }, [existingZones, values.comuna, values.region])

  const updateValue = <TKey extends keyof ZoneFormValues>(key: TKey, value: ZoneFormValues[TKey]) => {
    setValues(currentValues => ({ ...currentValues, [key]: value }))
  }

  const updateRegion = (region: string) => {
    setValues(currentValues => ({
      ...currentValues,
      region,
      comuna: '',
      nombre: '',
    }))
  }

  const updateComuna = (comuna: string) => {
    setValues(currentValues => ({
      ...currentValues,
      comuna,
      nombre: '',
    }))
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
                  <span className='text-sm font-medium text-slate-700'>Region</span>
                  <select
                    value={values.region}
                    onChange={event => updateRegion(event.target.value)}
                    required
                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#C9DCDD]'
                  >
                    <option value=''>Selecciona una region</option>
                    {regionOptions.map(region => (
                      <option key={region.nombre} value={region.nombre}>
                        {region.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className='block'>
                  <span className='text-sm font-medium text-slate-700'>Comuna</span>
                  <select
                    value={values.comuna}
                    onChange={event => updateComuna(event.target.value)}
                    required
                    disabled={!values.region}
                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#C9DCDD] disabled:cursor-not-allowed disabled:bg-slate-100'
                  >
                    <option value=''>{values.region ? 'Selecciona una comuna' : 'Primero selecciona region'}</option>
                    {comunas.map(comuna => (
                      <option key={comuna} value={comuna}>
                        {comuna}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className='grid gap-4 sm:grid-cols-2'>
                <label className='block'>
                  <span className='text-sm font-medium text-slate-700'>Zona o localidad</span>
                  <input
                    value={values.nombre}
                    onChange={event => updateValue('nombre', event.target.value)}
                    required
                    maxLength={100}
                    list='zona-localidad-suggestions'
                    placeholder={values.comuna ? 'Ej: Sector norte, Centro, Rural sur...' : 'Primero selecciona comuna'}
                    disabled={!values.comuna}
                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#C9DCDD]'
                  />
                  <datalist id='zona-localidad-suggestions'>
                    {zoneSuggestions.map(nombre => (
                      <option key={nombre} value={nombre} />
                    ))}
                  </datalist>
                  <span className='mt-1 block text-xs text-slate-500'>
                    Puedes usar una zona existente de esa comuna o escribir una nueva.
                  </span>
                </label>

                <label className='block'>
                  <span className='text-sm font-medium text-slate-700'>Estado</span>
                  <span className='mt-1 flex min-h-[46px] items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3'>
                    <input
                      type='checkbox'
                      checked={values.activa}
                      onChange={event => updateValue('activa', event.target.checked)}
                      className='size-4 rounded border-slate-300 text-[#3C6E71]'
                    />
                    <span className='text-sm font-medium text-slate-700'>Zona activa</span>
                  </span>
                </label>
              </div>

              <label className='block'>
                <span className='text-sm font-medium text-slate-700'>Descripcion</span>
                <textarea
                  value={values.descripcion}
                  onChange={event => updateValue('descripcion', event.target.value)}
                  rows={4}
                  className='mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#C9DCDD]'
                />
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
