import { useEffect, useMemo, useState } from 'react'
import { ClipboardPen, Eye, Pencil, Search } from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiGet } from '@/lib/api'
import type { FichaClinicaRow } from './types'
import { getEstadoBadgeClass } from './fichaFormUtils'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })

const FichaClinicaListPage = () => {
  const session = useCurrentUser()
  const canWrite =
    session.rol === 'ADMIN' || session.rol === 'COORDINADOR' || session.rol === 'PROFESIONAL'

  const [query, setQuery] = useState('')
  const [fichas, setFichas] = useState<FichaClinicaRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setIsLoading(true)
    setError('')

    apiGet<FichaClinicaRow[]>('/fichas-clinicas')
      .then(setFichas)
      .catch(err =>
        setError(err instanceof Error ? err.message : 'Error al cargar fichas clínicas.'),
      )
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return fichas

    return fichas.filter(f => {
      const contentStr = JSON.stringify(f.contenido).toLowerCase()
      return (
        f.visitaId.toLowerCase().includes(q) ||
        f.estado.toLowerCase().includes(q) ||
        contentStr.includes(q)
      )
    })
  }, [fichas, query])

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-7xl'>
        <header className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
          <div>
            <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#284B63]'>Ficha clínica</p>
            <h1 className='m-0 text-3xl font-semibold text-slate-900'>Fichas clínicas</h1>
            <p className='mt-2 text-sm text-slate-600'>
              Registro de atenciones domiciliarias con formularios dinámicos y mediciones normalizadas.
            </p>
          </div>
          {canWrite && (
            <a
              href='/fichas-clinicas/new'
              className='inline-flex items-center gap-2 rounded-lg bg-[#284B63] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#203C50]'
            >
              <ClipboardPen className='size-4' />
              Nueva ficha
            </a>
          )}
        </header>

        <div className='mb-4 flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2'>
          <Search className='size-4 text-slate-400' />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder='Buscar por visita, estado o contenido...'
            className='w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400'
          />
        </div>

        {error && (
          <div className='mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        <div className='overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <table className='w-full min-w-[860px] text-left text-sm'>
            <thead className='bg-slate-100 text-xs uppercase tracking-wide text-slate-600'>
              <tr>
                <th className='px-5 py-3'>Visita</th>
                <th className='px-5 py-3'>Estado</th>
                <th className='px-5 py-3'>Contenido</th>
                <th className='px-5 py-3'>Versión</th>
                <th className='px-5 py-3'>Creada</th>
                <th className='px-5 py-3'>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className='px-5 py-10 text-center text-sm text-slate-500'>
                    Cargando fichas clínicas...
                  </td>
                </tr>
              )}

              {filtered.map(f => {
                const contentPreview = JSON.stringify(f.contenido).slice(0, 80)

                return (
                  <tr key={f.id} className='border-t border-slate-200 text-slate-800 transition hover:bg-slate-50'>
                    <td className='max-w-[180px] truncate px-5 py-3 font-mono text-xs text-slate-500'>
                      {f.visitaId}
                    </td>
                    <td className='px-5 py-3'>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoBadgeClass(f.estado)}`}>
                        {f.estado}
                      </span>
                    </td>
                    <td className='max-w-[280px] truncate px-5 py-3 text-xs text-slate-500'>
                      {contentPreview}
                    </td>
                    <td className='px-5 py-3 font-mono text-xs text-slate-500'>v{f.version}</td>
                    <td className='px-5 py-3 text-xs text-slate-500'>{formatDate(f.createdAt)}</td>
                    <td className='px-5 py-3'>
                      <div className='flex items-center gap-2'>
                        <a
                          href={`/fichas-clinicas/${f.id}`}
                          className='inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100'
                        >
                          <Eye className='size-3' />
                          Ver
                        </a>
                        {canWrite && f.estado !== 'CERRADA' && (
                          <a
                            href={`/fichas-clinicas/${f.id}/editar`}
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
                  <td colSpan={6} className='px-5 py-12 text-center text-sm text-slate-500'>
                    {fichas.length === 0
                      ? 'No hay fichas clínicas registradas. Creá la primera desde el botón "Nueva ficha".'
                      : 'No hay fichas que coincidan con la búsqueda.'}
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
