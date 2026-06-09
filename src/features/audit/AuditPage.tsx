import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'

type AuditRow = { id: string; entidad: string; accion: string; detalle: string | null; fechaHora: string }

const AuditPage = () => {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<AuditRow[]>('/auditorias')
      .then(setRows)
      .catch(err => setError(err instanceof Error ? err.message : 'No fue posible cargar auditoría'))
  }, [])

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8 text-left'>
      <section className='mx-auto max-w-7xl'>
        <p className='text-xs font-semibold uppercase tracking-wide text-red-700'>Gestión de usuarios y seguridad</p>
        <h1 className='m-0 mb-6 text-3xl font-semibold text-slate-900'>Auditoría</h1>
        {error ? <div className='mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{error}</div> : null}
        <div className='overflow-x-auto rounded-md border bg-white'>
          <table className='w-full min-w-[760px] text-left text-sm'>
            <thead className='bg-slate-100'><tr><th className='p-3'>Fecha</th><th className='p-3'>Entidad</th><th className='p-3'>Acción</th><th className='p-3'>Detalle</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.id} className='border-t'><td className='p-3'>{new Date(r.fechaHora).toLocaleString('es-CL')}</td><td className='p-3'>{r.entidad}</td><td className='p-3'>{r.accion}</td><td className='p-3'>{r.detalle || '-'}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default AuditPage
