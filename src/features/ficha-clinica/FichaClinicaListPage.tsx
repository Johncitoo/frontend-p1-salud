import { useEffect, useMemo, useState } from 'react'
import { ClipboardPen, Eye, FilePenLine, Pencil, Search } from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiGet } from '@/lib/api'
import type { PlantillaFichaRow } from './types'

const FichaClinicaListPage = () => {
  const session = useCurrentUser()
  const canManageTemplates =
    session.rol === 'ADMIN' || session.rol === 'COORDINADOR' || session.rol === 'SUPERVISOR'
  const canFillForms =
    session.rol === 'ADMIN' || session.rol === 'COORDINADOR' || session.rol === 'PROFESIONAL'

  const [query, setQuery] = useState('')
  const [plantillas, setPlantillas] = useState<PlantillaFichaRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setIsLoading(true)
    setError('')

    apiGet<PlantillaFichaRow[]>('/plantillas-ficha')
      .then(async rows => {
        const detailed = await Promise.all(
          rows.map(row =>
            apiGet<PlantillaFichaRow>(`/plantillas-ficha/${row.id}`).catch(() => row),
          ),
        )
        setPlantillas(detailed)
      })
      .catch(err =>
        setError(err instanceof Error ? err.message : 'Error al cargar plantillas clinicas.'),
      )
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return plantillas

    return plantillas.filter(plantilla => {
      const campos = (plantilla.campos ?? [])
        .map(campo => `${campo.codigoCampo} ${campo.etiqueta} ${campo.tipoCampo}`)
        .join(' ')
        .toLowerCase()

      return (
        plantilla.codigo.toLowerCase().includes(q) ||
        plantilla.nombre.toLowerCase().includes(q) ||
        (plantilla.descripcion ?? '').toLowerCase().includes(q) ||
        campos.includes(q)
      )
    })
  }, [plantillas, query])

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-7xl'>
        <header className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
          <div>
            <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#284B63]'>Plantillas clinicas</p>
            <h1 className='m-0 text-3xl font-semibold text-slate-900'>Fichas clinicas</h1>
            <p className='mt-2 text-sm text-slate-600'>
              Administra las fichas creadas, previsualiza sus campos y editalas antes de usarlas en una atencion.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            {canFillForms && (
              <a
                href='/fichas-clinicas/llenar'
                className='inline-flex items-center gap-2 rounded-lg border border-[#284B63] px-4 py-2 text-sm font-semibold text-[#284B63] shadow-sm transition hover:bg-[#284B63]/10'
              >
                <FilePenLine className='size-4' />
                Llenar ficha
              </a>
            )}
            {canManageTemplates && (
              <a
                href='/fichas-clinicas/new'
                className='inline-flex items-center gap-2 rounded-lg bg-[#284B63] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#203C50]'
              >
                <ClipboardPen className='size-4' />
                Crear plantilla
              </a>
            )}
          </div>
        </header>

        <div className='mb-4 flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2'>
          <Search className='size-4 text-slate-400' />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Buscar por nombre, codigo, descripcion o campos...'
            className='w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400'
          />
        </div>

        {error && (
          <div className='mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        <div className='overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <table className='w-full min-w-[920px] text-left text-sm'>
            <thead className='bg-slate-100 text-xs uppercase tracking-wide text-slate-600'>
              <tr>
                <th className='px-5 py-3'>Nombre</th>
                <th className='px-5 py-3'>Campos</th>
                <th className='px-5 py-3'>Estado</th>
                <th className='px-5 py-3'>Descripcion</th>
                <th className='px-5 py-3'>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className='px-5 py-10 text-center text-sm text-slate-500'>
                    Cargando plantillas clinicas...
                  </td>
                </tr>
              )}

              {filtered.map(plantilla => {
                const camposActivos = (plantilla.campos ?? []).filter(campo => campo.activo)
                const variablesClinicas = camposActivos.filter(campo => campo.tipoCampo === 'VARIABLE_CLINICA').length

                return (
                  <tr key={plantilla.id} className='border-t border-slate-200 text-slate-800 transition hover:bg-slate-50'>
                    <td className='px-5 py-3 font-semibold text-slate-900'>{plantilla.nombre}</td>
                    <td className='px-5 py-3 text-xs text-slate-600'>
                      {camposActivos.length} campos
                      {variablesClinicas > 0 ? ` · ${variablesClinicas} normalizados` : ''}
                    </td>
                    <td className='px-5 py-3'>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        plantilla.activa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {plantilla.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className='max-w-[280px] truncate px-5 py-3 text-xs text-slate-500'>
                      {plantilla.descripcion || '-'}
                    </td>
                    <td className='px-5 py-3'>
                      <div className='flex items-center gap-2'>
                        <a
                          href={`/fichas-clinicas/plantillas/${plantilla.id}`}
                          className='inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100'
                        >
                          <Eye className='size-3' />
                          Previsualizar
                        </a>
                        {canManageTemplates && (
                          <a
                            href={`/fichas-clinicas/plantillas/${plantilla.id}/editar`}
                            className='inline-flex items-center gap-1 rounded-lg bg-[#3C6E71] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#284B63]'
                          >
                            <Pencil className='size-3' />
                            Editar
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className='px-5 py-12 text-center text-sm text-slate-500'>
                    {plantillas.length === 0
                      ? 'No hay plantillas clinicas creadas. Crea la primera desde el boton "Crear plantilla".'
                      : 'No hay plantillas que coincidan con la busqueda.'}
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

export default FichaClinicaListPage
