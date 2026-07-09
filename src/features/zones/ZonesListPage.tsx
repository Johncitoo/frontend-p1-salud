import { useEffect, useMemo, useState } from 'react'
import { MapPinPlus, Pencil, Search, Trash2 } from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiDelete, apiGet } from '@/lib/api'
import type { ZoneRow } from './types'

const ZonesListPage = () => {
  const [query, setQuery] = useState('')
  const [zones, setZones] = useState<ZoneRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const session = useCurrentUser()
  const canWriteZones = session.rol === 'ADMIN' || session.rol === 'COORDINADOR'
  const canDeleteZones = session.rol === 'ADMIN'

  const loadZones = () => {
    setIsLoading(true)
    setError('')

    apiGet<ZoneRow[]>('/zonas')
      .then(setZones)
      .catch(fetchError => {
        setError(fetchError instanceof Error ? fetchError.message : 'No fue posible cargar zonas.')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadZones()
  }, [])

  const filteredZones = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return zones

    return zones.filter(zone => {
      return (
        zone.nombre.toLowerCase().includes(normalizedQuery) ||
        zone.comuna.toLowerCase().includes(normalizedQuery) ||
        zone.region.toLowerCase().includes(normalizedQuery) ||
        (zone.descripcion || '').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [query, zones])

  const handleDelete = async (zone: ZoneRow) => {
    const confirmed = window.confirm(`¿Eliminar zona ${zone.nombre}?`)
    if (!confirmed) return

    try {
      await apiDelete<ZoneRow>(`/zonas/${zone.id}`)
      setZones(currentZones => currentZones.filter(currentZone => currentZone.id !== zone.id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No fue posible eliminar la zona.')
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-7xl'>
        <header className='mb-6 flex items-end justify-between gap-4'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>
              Cobertura territorial
            </p>
            <h1 className='m-0 text-3xl font-semibold text-slate-900'>Zonas de atención</h1>
            <p className='mt-2 text-sm text-slate-600'>
              Administración de zonas de cobertura usadas para pacientes, direcciones y agenda operativa.
            </p>
          </div>
          {canWriteZones ? (
            <a
              href='/zones/new'
              className='inline-flex items-center gap-2 rounded-lg bg-[#3C6E71] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#284B63]'
            >
              <MapPinPlus className='size-4' />
              Crear zona
            </a>
          ) : null}
        </header>

        <div className='relative mb-4 w-full'>
          <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500' />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder='Buscar por nombre, comuna, región o descripción...'
            className='w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#3C6E71] focus:ring-1 focus:ring-[#3C6E71] transition-colors'
          />
        </div>

        {error && (
          <div className='mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        <div className='overflow-x-auto rounded-md border border-slate-300 bg-white'>
          <table className='w-full min-w-[980px] text-left text-sm'>
            <thead className='bg-slate-100'>
              <tr className='text-xs uppercase tracking-wide text-slate-600'>
                <th className='px-4 py-3'>Nombre</th>
                <th className='px-4 py-3'>Comuna</th>
                <th className='px-4 py-3'>Región</th>
                <th className='px-4 py-3'>Descripción</th>
                <th className='px-4 py-3'>Estado</th>
                <th className='px-4 py-3'>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className='px-4 py-8 text-center text-sm text-slate-500'>
                    Cargando zonas...
                  </td>
                </tr>
              )}

              {filteredZones.map(zone => (
                <tr key={zone.id} className='border-t border-slate-200 text-slate-800'>
                  <td className='px-4 py-3 font-medium'>{zone.nombre}</td>
                  <td className='px-4 py-3'>{zone.comuna}</td>
                  <td className='px-4 py-3'>{zone.region}</td>
                  <td className='max-w-[360px] truncate px-4 py-3'>{zone.descripcion || '-'}</td>
                  <td className='px-4 py-3'>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        zone.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {zone.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      {canWriteZones ? (
                        <a
                          href={`/zones/${zone.id}/edit`}
                          className='inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-200 transition-colors'
                        >
                          <Pencil className='size-3' />
                          Editar
                        </a>
                      ) : null}
                      {canDeleteZones ? (
                        <button
                          type='button'
                          onClick={() => handleDelete(zone)}
                          className='inline-flex items-center gap-1 rounded-md bg-red-500 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-600 transition-colors'
                        >
                          <Trash2 className='size-3' />
                          Eliminar
                        </button>
                      ) : null}
                      {!canWriteZones && !canDeleteZones ? (
                        <span className='text-xs text-slate-500'>Solo lectura</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredZones.length === 0 && (
                <tr>
                  <td colSpan={6} className='px-4 py-8 text-center text-sm text-slate-500'>
                    No hay zonas que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default ZonesListPage
