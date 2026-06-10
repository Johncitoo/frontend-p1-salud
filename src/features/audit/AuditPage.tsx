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
        <header className='mb-6'>
          <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>Seguridad y trazabilidad</p>
          <h1 className='m-0 mt-2 text-3xl font-semibold text-slate-900'>Auditoría</h1>
          <p className='mt-2 text-sm text-slate-600'>Revisa las acciones registradas y el historial operativo del sistema.</p>
        </header>
        {error ? <div className='mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{error}</div> : null}
        <div className='overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <table className='w-full min-w-[760px] text-left text-sm'>
            <thead className='bg-slate-100 text-xs uppercase tracking-wide text-slate-600'><tr><th className='p-4'>Fecha</th><th className='p-4'>Entidad</th><th className='p-4'>Acción</th><th className='p-4'>Detalle</th></tr></thead>
            <tbody>{rows.map(r => <tr key={r.id} className='border-t border-slate-200 text-slate-800 transition hover:bg-slate-100'><td className='p-4'>{new Date(r.fechaHora).toLocaleString('es-CL')}</td><td className='p-4 font-semibold text-[#284B63]'>{r.entidad}</td><td className='p-4'><span className='rounded-full bg-[#3C6E71]/10 px-2.5 py-1 text-xs font-semibold text-[#284B63]'>{r.accion}</span></td><td className='p-4'>{r.detalle || '-'}</td></tr>)}</tbody>
          </table>
          {!error && rows.length === 0 ? <p className='border-t border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>No hay registros de auditoría disponibles.</p> : null}
        </div>
      </section>
    </main>
  )
}

export default AuditPage
