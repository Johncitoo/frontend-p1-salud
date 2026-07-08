import { FormEvent, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Loader2, Pill, Plus, Trash2 } from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiDelete, apiGet, apiPost } from '@/lib/api'

type DiagnosticoRow = {
  id: string
  visitaId: string
  descripcion: string
  createdAt: string
}

type MedicamentoCatalogoRow = {
  id: string
  nombre: string
  presentacion?: string | null
  activo: boolean
}

type MedicamentoRow = {
  id: string
  visitaId: string
  nombre: string
  medicamentoCatalogoId?: string | null
  cantidadCajas: number
  indicaciones?: string | null
  createdAt: string
}

type DiagnosticoMedicamentosPanelProps = {
  visitaId?: string | null
  isClosed?: boolean
}

const canWriteRoles = new Set(['ADMIN', 'COORDINADOR', 'PROFESIONAL'])

const DiagnosticoMedicamentosPanel = ({ visitaId, isClosed = false }: DiagnosticoMedicamentosPanelProps) => {
  const session = useCurrentUser()
  const userRole = session.rol ?? ''
  const canWrite = canWriteRoles.has(userRole) && !isClosed

  const hasVisita = Boolean(visitaId)

  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoRow[]>([])
  const [medicamentos, setMedicamentos] = useState<MedicamentoRow[]>([])
  const [catalogo, setCatalogo] = useState<MedicamentoCatalogoRow[]>([])

  const [nuevoDiagnostico, setNuevoDiagnostico] = useState('')
  const [medicamentoCatalogoId, setMedicamentoCatalogoId] = useState('')
  const [cantidadCajas, setCantidadCajas] = useState(1)
  const [indicaciones, setIndicaciones] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isSavingDiagnostico, setIsSavingDiagnostico] = useState(false)
  const [isSavingMedicamento, setIsSavingMedicamento] = useState(false)
  const [busyMedicamentoId, setBusyMedicamentoId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const catalogoOrdenado = useMemo(
    () => [...catalogo].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [catalogo],
  )

  const load = async () => {
    if (!visitaId) {
      setDiagnosticos([])
      setMedicamentos([])
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const [diagnosticosRows, medicamentosRows, catalogoRows] = await Promise.all([
        apiGet<DiagnosticoRow[]>(`/diagnosticos?visitaId=${visitaId}`),
        apiGet<MedicamentoRow[]>(`/medicamentos?visitaId=${visitaId}`),
        apiGet<MedicamentoCatalogoRow[]>('/medicamentos/catalogo'),
      ])
      setDiagnosticos(diagnosticosRows)
      setMedicamentos(medicamentosRows)
      setCatalogo(catalogoRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar diagnóstico y medicamentos.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitaId])

  const handleAgregarDiagnostico = async (e: FormEvent) => {
    e.preventDefault()
    if (!visitaId || !nuevoDiagnostico.trim()) return

    setIsSavingDiagnostico(true)
    setError('')
    setSuccess('')
    try {
      const created = await apiPost<DiagnosticoRow, { visitaId: string; descripcion: string }>('/diagnosticos', {
        visitaId,
        descripcion: nuevoDiagnostico.trim(),
      })
      setDiagnosticos(prev => [created, ...prev])
      setNuevoDiagnostico('')
      setSuccess('Diagnóstico registrado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el diagnóstico.')
    } finally {
      setIsSavingDiagnostico(false)
    }
  }

  const handleAgregarMedicamento = async (e: FormEvent) => {
    e.preventDefault()
    if (!visitaId || !medicamentoCatalogoId || cantidadCajas < 1) return

    setIsSavingMedicamento(true)
    setError('')
    setSuccess('')
    try {
      const created = await apiPost<MedicamentoRow, {
        visitaId: string
        medicamentoCatalogoId: string
        cantidadCajas: number
        indicaciones?: string
      }>('/medicamentos', {
        visitaId,
        medicamentoCatalogoId,
        cantidadCajas,
        indicaciones: indicaciones.trim() || undefined,
      })
      setMedicamentos(prev => [...prev, created])
      setMedicamentoCatalogoId('')
      setCantidadCajas(1)
      setIndicaciones('')
      setSuccess('Medicamento agregado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el medicamento.')
    } finally {
      setIsSavingMedicamento(false)
    }
  }

  const handleQuitarMedicamento = async (medicamento: MedicamentoRow) => {
    const confirmed = window.confirm(`Quitar ${medicamento.nombre} de esta visita?`)
    if (!confirmed) return

    setBusyMedicamentoId(medicamento.id)
    setError('')
    setSuccess('')
    try {
      await apiDelete(`/medicamentos/${medicamento.id}`)
      setMedicamentos(prev => prev.filter(item => item.id !== medicamento.id))
      setSuccess('Medicamento quitado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar el medicamento.')
    } finally {
      setBusyMedicamentoId(null)
    }
  }

  return (
    <section className='mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
      <div className='mb-5 flex flex-wrap items-center gap-3'>
        <span className='rounded-2xl bg-[#3C6E71]/10 p-3 text-[#284B63]'>
          <Pill className='size-5' />
        </span>
        <div className='flex-1'>
          <h2 className='m-0 text-xl font-semibold text-slate-900'>Diagnóstico y medicamentos</h2>
          <p className='mt-1 text-sm text-slate-500'>
            Registro de diagnóstico e indicaciones farmacológicas de esta visita.
          </p>
        </div>
      </div>

      {!hasVisita && (
        <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
          Selecciona o guarda una visita para habilitar diagnóstico y medicamentos.
        </div>
      )}

      {hasVisita && (
        <>
          {error && (
            <div className='mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700'>
              {error}
            </div>
          )}
          {success && (
            <div className='mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800'>
              {success}
            </div>
          )}

          {isLoading ? (
            <p className='py-6 text-center text-sm text-slate-500'>Cargando diagnóstico y medicamentos...</p>
          ) : (
            <div className='grid gap-6 lg:grid-cols-2'>
              {/* Diagnóstico */}
              <div>
                <h3 className='mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800'>
                  <ClipboardList className='size-4 text-[#284B63]' />
                  Diagnóstico
                </h3>

                {canWrite && (
                  <form onSubmit={handleAgregarDiagnostico} className='mb-4 space-y-2'>
                    <textarea
                      value={nuevoDiagnostico}
                      onChange={e => setNuevoDiagnostico(e.target.value)}
                      rows={3}
                      placeholder='Describe el diagnóstico de esta atención...'
                      className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#3C6E71] focus:ring-2 focus:ring-[#3C6E71]/15'
                    />
                    <button
                      type='submit'
                      disabled={!nuevoDiagnostico.trim() || isSavingDiagnostico}
                      className='inline-flex h-9 items-center gap-2 rounded-lg bg-[#284B63] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#203C50] disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {isSavingDiagnostico ? <Loader2 className='size-3.5 animate-spin' /> : <Plus className='size-3.5' />}
                      {isSavingDiagnostico ? 'Guardando...' : 'Registrar diagnóstico'}
                    </button>
                  </form>
                )}

                {diagnosticos.length === 0 ? (
                  <div className='rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500'>
                    No hay diagnósticos registrados en esta visita.
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {diagnosticos.map(diagnostico => (
                      <div key={diagnostico.id} className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'>
                        <p className='text-sm text-slate-800'>{diagnostico.descripcion}</p>
                        <p className='mt-1 text-xs text-slate-400'>
                          {new Date(diagnostico.createdAt).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medicamentos */}
              <div>
                <h3 className='mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800'>
                  <Pill className='size-4 text-[#284B63]' />
                  Medicamentos
                </h3>

                {canWrite && (
                  <form onSubmit={handleAgregarMedicamento} className='mb-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                    <select
                      value={medicamentoCatalogoId}
                      onChange={e => setMedicamentoCatalogoId(e.target.value)}
                      className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#3C6E71]/15'
                    >
                      <option value=''>Selecciona un medicamento del catálogo</option>
                      {catalogoOrdenado.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}{item.presentacion ? ` (${item.presentacion})` : ''}
                        </option>
                      ))}
                    </select>

                    <div className='flex items-center gap-2'>
                      <label className='text-xs font-medium text-slate-600'>
                        Cajas
                        <input
                          type='number'
                          min={1}
                          value={cantidadCajas}
                          onChange={e => setCantidadCajas(Math.max(1, Number(e.target.value) || 1))}
                          className='mt-1 w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#3C6E71]/15'
                        />
                      </label>
                      <label className='flex-1 text-xs font-medium text-slate-600'>
                        Indicaciones (opcional)
                        <input
                          value={indicaciones}
                          onChange={e => setIndicaciones(e.target.value)}
                          maxLength={300}
                          placeholder='Ej: 1 comprimido cada 8 horas'
                          className='mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#3C6E71]/15'
                        />
                      </label>
                    </div>

                    <button
                      type='submit'
                      disabled={!medicamentoCatalogoId || isSavingMedicamento}
                      className='inline-flex h-9 items-center gap-2 rounded-lg bg-[#284B63] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#203C50] disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {isSavingMedicamento ? <Loader2 className='size-3.5 animate-spin' /> : <Plus className='size-3.5' />}
                      {isSavingMedicamento ? 'Agregando...' : 'Agregar medicamento'}
                    </button>
                  </form>
                )}

                {medicamentos.length === 0 ? (
                  <div className='rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500'>
                    No hay medicamentos registrados en esta visita.
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {medicamentos.map(medicamento => (
                      <div key={medicamento.id} className='flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'>
                        <div className='min-w-0'>
                          <p className='text-sm font-semibold text-slate-800'>
                            {medicamento.nombre} · {medicamento.cantidadCajas} caja{medicamento.cantidadCajas === 1 ? '' : 's'}
                          </p>
                          {medicamento.indicaciones && (
                            <p className='mt-1 text-xs text-slate-500'>{medicamento.indicaciones}</p>
                          )}
                        </div>
                        {canWrite && (
                          <button
                            type='button'
                            onClick={() => handleQuitarMedicamento(medicamento)}
                            disabled={busyMedicamentoId === medicamento.id}
                            title='Quitar medicamento'
                            className='inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
                          >
                            {busyMedicamentoId === medicamento.id ? (
                              <Loader2 className='size-3.5 animate-spin' />
                            ) : (
                              <Trash2 className='size-3.5' />
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default DiagnosticoMedicamentosPanel
