import { FormEvent, useEffect, useState } from 'react'
import { Pill, PlusCircle } from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiGet, apiPatch, apiPost } from '@/lib/api'

type MedicamentoCatalogoRow = {
  id: string
  nombre: string
  presentacion: string | null
  activo: boolean
}

const emptyForm = { nombre: '', presentacion: '' }

const MedicamentosCatalogoPage = () => {
  const session = useCurrentUser()
  const canWrite = session.rol === 'ADMIN'

  const [items, setItems] = useState<MedicamentoCatalogoRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [form, setForm] = useState(emptyForm)

  const loadItems = () => {
    setIsLoading(true)
    setError('')
    apiGet<MedicamentoCatalogoRow[]>('/medicamentos/catalogo?incluirInactivos=true')
      .then(setItems)
      .catch(err => setError(err instanceof Error ? err.message : 'No fue posible cargar el catálogo.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadItems()
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    setIsSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      await apiPost<MedicamentoCatalogoRow, { nombre: string; presentacion?: string }>('/medicamentos/catalogo', {
        nombre: form.nombre.trim(),
        ...(form.presentacion.trim() ? { presentacion: form.presentacion.trim() } : {}),
      })
      setSuccessMsg(`"${form.nombre.trim()}" agregado al catálogo.`)
      setForm(emptyForm)
      loadItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el medicamento.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActivo = async (item: MedicamentoCatalogoRow) => {
    setError('')
    setSuccessMsg('')
    try {
      await apiPatch<MedicamentoCatalogoRow, { activo: boolean }>(`/medicamentos/catalogo/${item.id}`, {
        activo: !item.activo,
      })
      loadItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible actualizar el medicamento.')
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-5xl space-y-6'>
        <header>
          <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>Catálogos clínicos</p>
          <h1 className='m-0 text-3xl font-semibold text-slate-900'>Catálogo de medicamentos</h1>
          <p className='mt-2 text-sm text-slate-600'>
            Medicamentos disponibles para registrar en el historial de una visita. Los que se desactiven dejan de
            aparecer en el selector, pero se conservan en los registros históricos que ya los usaron.
          </p>
        </header>

        {error && <div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>}
        {successMsg && (
          <div className='rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>{successMsg}</div>
        )}

        {canWrite ? (
          <form onSubmit={handleSubmit} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
            <h2 className='mb-4 flex items-center gap-2 text-sm font-bold text-slate-900'>
              <PlusCircle className='size-4 text-[#3C6E71]' /> Agregar medicamento
            </h2>
            <div className='grid gap-4 sm:grid-cols-2'>
              <label className='block text-sm font-semibold text-slate-700'>
                Nombre
                <input
                  value={form.nombre}
                  onChange={e => setForm(current => ({ ...current, nombre: e.target.value }))}
                  placeholder='Ej: Paracetamol'
                  className='mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-900'
                />
              </label>
              <label className='block text-sm font-semibold text-slate-700'>
                Presentación (opcional)
                <input
                  value={form.presentacion}
                  onChange={e => setForm(current => ({ ...current, presentacion: e.target.value }))}
                  placeholder='Ej: Comprimidos 500 mg'
                  className='mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm font-normal text-slate-900'
                />
              </label>
            </div>
            <button
              type='submit'
              disabled={isSaving}
              className='mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[#3C6E71] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#284B63] disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isSaving ? 'Guardando...' : 'Agregar al catálogo'}
            </button>
          </form>
        ) : null}

        <div className='overflow-x-auto rounded-md border border-slate-300 bg-white'>
          <table className='w-full min-w-[560px] text-left text-sm'>
            <thead className='bg-slate-100'>
              <tr className='text-xs uppercase tracking-wide text-slate-600'>
                <th className='px-4 py-3'>Nombre</th>
                <th className='px-4 py-3'>Presentación</th>
                <th className='px-4 py-3'>Estado</th>
                {canWrite ? <th className='px-4 py-3'>Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={canWrite ? 4 : 3} className='px-4 py-8 text-center text-sm text-slate-500'>
                    Cargando catálogo...
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={canWrite ? 4 : 3} className='px-4 py-8 text-center text-sm text-slate-500'>
                    Todavía no hay medicamentos en el catálogo.
                  </td>
                </tr>
              )}
              {items.map(item => (
                <tr key={item.id} className='border-t border-slate-200 text-slate-800'>
                  <td className='px-4 py-3 font-medium'>
                    <span className='flex items-center gap-2'>
                      <Pill className='size-3.5 text-[#3C6E71]' /> {item.nombre}
                    </span>
                  </td>
                  <td className='px-4 py-3'>{item.presentacion || '-'}</td>
                  <td className='px-4 py-3'>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        item.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {canWrite ? (
                    <td className='px-4 py-3'>
                      <button
                        type='button'
                        onClick={() => handleToggleActivo(item)}
                        className='rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100'
                      >
                        {item.activo ? 'Desactivar' : 'Reactivar'}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default MedicamentosCatalogoPage
