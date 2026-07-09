import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileText, PackageCheck, Pencil, Plus, RefreshCw, Wrench, X } from 'lucide-react'
import { getRepuestosCatalogo, getInspecciones, createInspeccion, reintentarPedido, finalizarIntervencion, corregirInforme } from './mantenimientoApi'
import type { CreateInspeccionInput, InspeccionMantenimiento, CorregirInformeInput } from './types'
import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiGet } from '@/lib/api'

type PacienteOption = {
  id: string
  nombres: string
  apellidos: string
  rut: string
}

type VisitaOption = {
  id: string
  pacienteId: string
  fechaProgramada: string
  horaProgramada: string
  estado: string
  prioridad: string
  direccionPacienteId?: string | null
}

const PRIORIDADES: { value: CreateInspeccionInput['prioridad']; label: string }[] = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

const emptyForm = {
  visitaId: '',
  equipo: '',
  prioridad: 'media' as CreateInspeccionInput['prioridad'],
  diagnostico: '',
}

const estadoBadge = (estado: string) => {
  switch (estado) {
    case 'FINALIZADA':
      return { label: 'Orden finalizada', cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' }
    case 'PEDIDO_ENVIADO':
      return { label: 'Pedido enviado', cls: 'bg-green-500/20 text-green-400 border border-green-500/30' }
    case 'PEDIDO_RECHAZADO':
      return { label: 'Pedido rechazado', cls: 'bg-red-500/20 text-red-400 border border-red-500/30' }
    default:
      return { label: 'Registrada', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' }
  }
}

export default function MantenimientoPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  // sku -> cantidad de los repuestos marcados.
  const [repuestosSel, setRepuestosSel] = useState<Record<string, number>>({})
  const [formError, setFormError] = useState('')
  const [finalizarTarget, setFinalizarTarget] = useState<InspeccionMantenimiento | null>(null)
  const [finalizarNotas, setFinalizarNotas] = useState('')
  const queryClient = useQueryClient()
  const session = useCurrentUser()
  const canRegistrar = ['ADMIN', 'COORDINADOR', 'PROFESIONAL'].includes(session.rol)
  const canReintentar = ['ADMIN', 'COORDINADOR'].includes(session.rol)
  const canCorregir = ['ADMIN', 'COORDINADOR', 'PROFESIONAL', 'TECNICO'].includes(session.rol)

  // Paso 19: corrección del informe técnico (emite una nueva versión).
  const [correccion, setCorreccion] = useState<InspeccionMantenimiento | null>(null)
  const [corrForm, setCorrForm] = useState({ diagnostico: '', equipo: '', motivo: '' })
  const [corrError, setCorrError] = useState('')

  const { data: inspecciones = [], isLoading } = useQuery({
    queryKey: ['inspeccionesMantenimiento'],
    queryFn: () => getInspecciones(),
  })

  const { data: catalogo = [] } = useQuery({
    queryKey: ['repuestosCatalogo'],
    queryFn: () => getRepuestosCatalogo(),
  })

  const { data: pacientes = [] } = useQuery({
    queryKey: ['pacientesOptions'],
    queryFn: () => apiGet<PacienteOption[]>('/pacientes'),
    enabled: isOpen,
  })

  const { data: visitas = [] } = useQuery({
    queryKey: ['visitasMantenimientoOptions'],
    queryFn: () => apiGet<VisitaOption[]>('/visitas'),
    enabled: isOpen,
  })

  const pacienteById = new Map(pacientes.map((p) => [p.id, p]))

  const createMutation = useMutation({
    mutationFn: createInspeccion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspeccionesMantenimiento'] })
      setIsOpen(false)
      setForm(emptyForm)
      setRepuestosSel({})
      setFormError('')
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : 'No se pudo registrar la inspección.'),
  })

  const reintentarMutation = useMutation({
    mutationFn: reintentarPedido,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inspeccionesMantenimiento'] }),
  })

  const finalizarMutation = useMutation({
    mutationFn: ({ id, notas }: { id: string; notas?: string }) => finalizarIntervencion(id, notas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspeccionesMantenimiento'] })
      setFinalizarTarget(null)
      setFinalizarNotas('')
    },
  })

  const corregirMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CorregirInformeInput }) => corregirInforme(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspeccionesMantenimiento'] })
      setCorreccion(null)
      setCorrError('')
    },
    onError: (err) => setCorrError(err instanceof Error ? err.message : 'No se pudo corregir el informe.'),
  })

  const openCorreccion = (insp: InspeccionMantenimiento) => {
    setCorreccion(insp)
    setCorrForm({ diagnostico: insp.diagnostico ?? '', equipo: insp.equipo, motivo: '' })
    setCorrError('')
  }

  const handleCorregir = () => {
    if (!correccion) return
    if (!corrForm.diagnostico.trim()) return setCorrError('El diagnóstico no puede quedar vacío.')
    corregirMutation.mutate({
      id: correccion.id,
      input: {
        diagnostico: corrForm.diagnostico.trim(),
        equipo: corrForm.equipo.trim() || undefined,
        motivo: corrForm.motivo.trim() || undefined,
      },
    })
  }

  const toggleRepuesto = (sku: string) => {
    setRepuestosSel((prev) => {
      const next = { ...prev }
      if (next[sku] != null) delete next[sku]
      else next[sku] = 1
      return next
    })
  }

  const setCantidad = (sku: string, cantidad: number) => {
    setRepuestosSel((prev) => ({ ...prev, [sku]: Math.max(1, cantidad || 1) }))
  }

  const handleSubmit = () => {
    const repuestos = Object.entries(repuestosSel).map(([sku, cantidad]) => ({ sku, cantidad }))
    if (!form.visitaId) return setFormError('Selecciona la cita de mantenimiento.')
    if (!form.equipo.trim()) return setFormError('Indica el equipo inspeccionado.')
    if (repuestos.length === 0) return setFormError('Marca al menos un repuesto requerido.')
    setFormError('')
    createMutation.mutate({
      visitaId: form.visitaId,
      equipo: form.equipo.trim(),
      prioridad: form.prioridad,
      diagnostico: form.diagnostico.trim() || undefined,
      repuestos,
    })
  }

  return (
    <div className='p-6 lg:p-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='flex items-center gap-2 text-2xl font-bold text-white'>
            <Wrench className='size-6 text-[#9CBFC1]' />
            Mantenimiento de equipos
          </h1>
          <p className='mt-1 text-sm text-[#D9D9D9]'>
            Registra las inspecciones técnicas. Al detectar repuestos, se genera automáticamente el pedido al
            área de Pedidos (Proyecto 3).
          </p>
        </div>
        {canRegistrar && (
          <button
            onClick={() => { setForm(emptyForm); setRepuestosSel({}); setFormError(''); setIsOpen(true) }}
            className='inline-flex items-center gap-2 rounded-xl bg-[#3C6E71] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2A4D4F]'
          >
            <Plus className='size-4' />
            Registrar inspección
          </button>
        )}
      </div>

      <div className='overflow-hidden rounded-2xl border border-[#3C6E71]/40 bg-[#203C50] shadow-xl'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm text-[#D9D9D9]'>
            <thead className='border-b border-[#3C6E71]/40 bg-[#182F3F]/50 text-xs uppercase'>
              <tr>
                <th className='px-6 py-4 font-semibold text-white'>Equipo / Fecha</th>
                <th className='px-6 py-4 font-semibold text-white'>Repuestos</th>
                <th className='px-6 py-4 font-semibold text-white'>Prioridad</th>
                <th className='px-6 py-4 font-semibold text-white'>Pedido (Proyecto 3)</th>
                <th className='px-6 py-4 font-semibold text-white text-right'>Acciones</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#3C6E71]/20'>
              {isLoading ? (
                <tr><td colSpan={5} className='px-6 py-8 text-center'>
                  <div className='inline-block size-6 animate-spin rounded-full border-2 border-white/20 border-t-white'></div>
                </td></tr>
              ) : inspecciones.length === 0 ? (
                <tr><td colSpan={5} className='px-6 py-8 text-center text-[#D9D9D9]'>
                  No hay inspecciones de mantenimiento registradas.
                </td></tr>
              ) : (
                inspecciones.map((insp: InspeccionMantenimiento) => {
                  const badge = estadoBadge(insp.estado)
                  return (
                    <tr key={insp.id} className='transition-colors hover:bg-[#3C6E71]/10'>
                      <td className='px-6 py-4'>
                        <p className='flex items-center gap-2 font-medium text-white'>
                          {insp.equipo}
                          <span
                            title={insp.version > 1 ? `Informe corregido (${insp.version - 1} corrección/es)` : 'Versión original'}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              insp.version > 1
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-[#3C6E71]/20 text-[#9CBFC1] border border-[#3C6E71]/30'
                            }`}
                          >
                            v{insp.version}
                          </span>
                        </p>
                        <p className='mt-1 text-xs text-[#9CBFC1]'>{new Date(insp.createdAt).toLocaleString('es-CL')}</p>
                      </td>
                      <td className='px-6 py-4'>
                        <ul className='space-y-0.5'>
                          {insp.repuestos.map((r) => (
                            <li key={r.sku} className='text-xs'>
                              <span className='text-white'>{r.nombre ?? r.sku}</span>
                              <span className='text-[#9CBFC1]'> ×{r.cantidad}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className='px-6 py-4'>
                        <span className='text-xs font-medium capitalize text-[#D9D9D9]'>{insp.prioridad}</span>
                      </td>
                      <td className='px-6 py-4'>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {insp.pedidoExternoId && (
                          <p className='mt-1 text-xs text-[#9CBFC1]'>ID: {insp.pedidoExternoId}</p>
                        )}
                        {insp.pedidoError && (
                          <p className='mt-1 max-w-xs text-xs text-red-400'>{insp.pedidoError}</p>
                        )}
                        {insp.incidenteId && (
                          <p className='mt-1 inline-flex items-center gap-1 text-xs text-[#9CBFC1]'>
                            <FileText className='size-3' /> Ticket CRM + Incidente generado
                          </p>
                        )}
                      </td>
                      <td className='px-6 py-4 text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          {canCorregir && (
                            <button
                              onClick={() => openCorreccion(insp)}
                              title='Corregir informe y emitir nueva versión'
                              className='inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/30 hover:text-amber-200'
                            >
                              <Pencil className='size-3.5' />
                              Corregir
                            </button>
                          )}
                          {insp.estado === 'FINALIZADA' ? (
                            <div className='flex flex-col items-end gap-1 text-right'>
                              <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300'>
                                <CheckCircle2 className='size-3.5' /> Orden finalizada
                              </span>
                              {insp.intervencionAt && (
                                <span className='text-xs text-[#9CBFC1]'>{new Date(insp.intervencionAt).toLocaleString('es-CL')}</span>
                              )}
                            </div>
                          ) : (
                            <>
                              {insp.estado === 'PEDIDO_RECHAZADO' && canReintentar && (
                                <button
                                  onClick={() => reintentarMutation.mutate(insp.id)}
                                  disabled={reintentarMutation.isPending && reintentarMutation.variables === insp.id}
                                  className='inline-flex items-center gap-2 rounded-lg bg-[#3C6E71]/20 px-3 py-1.5 text-xs font-semibold text-[#9CBFC1] transition hover:bg-[#3C6E71] hover:text-white disabled:opacity-50'
                                >
                                  <RefreshCw className={`size-3.5 ${reintentarMutation.isPending && reintentarMutation.variables === insp.id ? 'animate-spin' : ''}`} />
                                  Reintentar
                                </button>
                              )}
                              {canRegistrar && (
                                <button
                                  onClick={() => { setFinalizarNotas(''); setFinalizarTarget(insp) }}
                                  className='inline-flex items-center gap-2 rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-600 hover:text-white'
                                >
                                  <ClipboardCheck className='size-3.5' /> Registrar intervención
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal registrar inspección */}
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
          <div className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#3C6E71]/50 bg-[#182F3F] p-6 shadow-2xl'>
            <div className='flex items-center justify-between border-b border-[#3C6E71]/30 pb-4'>
              <h2 className='flex items-center gap-2 text-lg font-bold text-white'>
                <Wrench className='size-5 text-[#9CBFC1]' />
                Registrar inspección de mantenimiento
              </h2>
              <button onClick={() => setIsOpen(false)} className='rounded-lg p-1 text-[#9CBFC1] transition hover:bg-[#3C6E71]/30 hover:text-white'>
                <X className='size-5' />
              </button>
            </div>

            <p className='mt-4 text-xs text-[#9CBFC1]'>
              Al guardar, se genera automáticamente un pedido de repuestos (exento de pago) al Proyecto 3.
            </p>

            <div className='mt-4 space-y-4'>
              <div>
                <label className='text-xs font-semibold uppercase tracking-wider text-[#9CBFC1]'>Cita de mantenimiento *</label>
                <select
                  value={form.visitaId}
                  onChange={(e) => setForm((f) => ({ ...f, visitaId: e.target.value }))}
                  className='mt-1 w-full rounded-lg border border-[#3C6E71]/40 bg-[#203C50] px-3 py-2 text-sm text-white focus:border-[#3C6E71] focus:outline-none'
                >
                  <option value=''>Selecciona una cita</option>
                  {visitas.map((v) => {
                    const paciente = pacienteById.get(v.pacienteId)
                    const pacienteLabel = paciente ? `${paciente.nombres} ${paciente.apellidos}` : v.pacienteId
                    return (
                      <option key={v.id} value={v.id}>
                        {new Date(`${v.fechaProgramada}T${v.horaProgramada}`).toLocaleString('es-CL')} — {pacienteLabel} — {v.estado}
                      </option>
                    )
                  })}
                </select>
                <p className='mt-1 text-xs text-[#6B8A8C]'>Proyecto 3 usará el paciente y la dirección asociados a esta cita.</p>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-xs font-semibold uppercase tracking-wider text-[#9CBFC1]'>Equipo *</label>
                  <input
                    value={form.equipo}
                    onChange={(e) => setForm((f) => ({ ...f, equipo: e.target.value }))}
                    placeholder='Ej. Concentrador de oxígeno'
                    className='mt-1 w-full rounded-lg border border-[#3C6E71]/40 bg-[#203C50] px-3 py-2 text-sm text-white placeholder:text-[#6B8A8C] focus:border-[#3C6E71] focus:outline-none'
                  />
                </div>
                <div>
                  <label className='text-xs font-semibold uppercase tracking-wider text-[#9CBFC1]'>Prioridad</label>
                  <select
                    value={form.prioridad}
                    onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value as CreateInspeccionInput['prioridad'] }))}
                    className='mt-1 w-full rounded-lg border border-[#3C6E71]/40 bg-[#203C50] px-3 py-2 text-sm text-white focus:border-[#3C6E71] focus:outline-none'
                  >
                    {PRIORIDADES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                  </select>
                </div>
              </div>

              <div>
                <label className='text-xs font-semibold uppercase tracking-wider text-[#9CBFC1]'>Repuestos requeridos *</label>
                <div className='mt-1 space-y-2 rounded-lg border border-[#3C6E71]/40 bg-[#203C50] p-3'>
                  {catalogo.length === 0 ? (
                    <p className='text-xs text-[#6B8A8C]'>Cargando catálogo...</p>
                  ) : (
                    catalogo.map((r) => {
                      const checked = repuestosSel[r.sku] != null
                      return (
                        <div key={r.sku} className='flex items-center gap-3'>
                          <label className='flex flex-1 items-center gap-2 text-sm text-white'>
                            <input type='checkbox' checked={checked} onChange={() => toggleRepuesto(r.sku)} className='size-4 accent-[#3C6E71]' />
                            <span>{r.nombre} <span className='text-xs text-[#6B8A8C]'>({r.sku})</span></span>
                          </label>
                          {checked && (
                            <input
                              type='number'
                              min={1}
                              value={repuestosSel[r.sku]}
                              onChange={(e) => setCantidad(r.sku, parseInt(e.target.value, 10))}
                              className='w-16 rounded-md border border-[#3C6E71]/40 bg-[#182F3F] px-2 py-1 text-sm text-white focus:border-[#3C6E71] focus:outline-none'
                            />
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div>
                <label className='text-xs font-semibold uppercase tracking-wider text-[#9CBFC1]'>Diagnóstico / informe</label>
                <textarea
                  value={form.diagnostico}
                  onChange={(e) => setForm((f) => ({ ...f, diagnostico: e.target.value }))}
                  rows={3}
                  placeholder='Ej. Filtro desgastado y batería con baja capacidad.'
                  className='mt-1 w-full rounded-lg border border-[#3C6E71]/40 bg-[#203C50] px-3 py-2 text-sm text-white placeholder:text-[#6B8A8C] focus:border-[#3C6E71] focus:outline-none'
                />
              </div>

              {formError && (
                <div className='flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400'>
                  <AlertTriangle className='mt-0.5 size-4 shrink-0' />
                  {formError}
                </div>
              )}
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button onClick={() => setIsOpen(false)} className='rounded-xl border border-[#3C6E71]/40 px-4 py-2 text-sm font-semibold text-[#9CBFC1] transition hover:bg-[#3C6E71]/20'>
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className='inline-flex items-center gap-2 rounded-xl bg-[#3C6E71] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2A4D4F] disabled:opacity-50'
              >
                {createMutation.isPending && <div className='size-4 animate-spin rounded-full border-2 border-white/30 border-t-white'></div>}
                Registrar y generar pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Paso 14: registrar intervención / finalizar orden */}
      {finalizarTarget && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
          <div className='w-full max-w-md rounded-2xl border border-[#3C6E71]/50 bg-[#182F3F] p-6 shadow-2xl'>
            <div className='flex items-center justify-between border-b border-[#3C6E71]/30 pb-4'>
              <h2 className='flex items-center gap-2 text-lg font-bold text-white'>
                <ClipboardCheck className='size-5 text-emerald-300' />
                Registrar intervención
              </h2>
              <button onClick={() => setFinalizarTarget(null)} className='rounded-lg p-1 text-[#9CBFC1] transition hover:bg-[#3C6E71]/30 hover:text-white'>
                <X className='size-5' />
              </button>
            </div>

            <p className='mt-4 text-sm text-[#D9D9D9]'>
              Confirma que se instalaron los componentes en <span className='font-semibold text-white'>{finalizarTarget.equipo}</span>.
              La orden de trabajo quedará <span className='font-semibold text-emerald-300'>finalizada</span>.
            </p>

            <div className='mt-3 rounded-lg border border-[#3C6E71]/30 bg-[#203C50] p-3'>
              <p className='text-xs font-semibold uppercase tracking-wider text-[#9CBFC1]'>Componentes</p>
              <ul className='mt-2 space-y-0.5'>
                {finalizarTarget.repuestos.map((r) => (
                  <li key={r.sku} className='text-sm text-white'>{r.nombre ?? r.sku} <span className='text-xs text-[#9CBFC1]'>×{r.cantidad}</span></li>
                ))}
              </ul>
            </div>

            <div className='mt-4'>
              <label className='text-xs font-semibold uppercase tracking-wider text-[#9CBFC1]'>Notas de la intervención</label>
              <textarea
                value={finalizarNotas}
                onChange={(e) => setFinalizarNotas(e.target.value)}
                rows={3}
                placeholder='Ej. Se instaló filtro HEPA y batería nueva; equipo operativo.'
                className='mt-1 w-full rounded-lg border border-[#3C6E71]/40 bg-[#203C50] px-3 py-2 text-sm text-white placeholder:text-[#6B8A8C] focus:border-[#3C6E71] focus:outline-none'
              />
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button onClick={() => setFinalizarTarget(null)} className='rounded-xl border border-[#3C6E71]/40 px-4 py-2 text-sm font-semibold text-[#9CBFC1] transition hover:bg-[#3C6E71]/20'>
                Cancelar
              </button>
              <button
                onClick={() => finalizarMutation.mutate({ id: finalizarTarget.id, notas: finalizarNotas.trim() || undefined })}
                disabled={finalizarMutation.isPending}
                className='inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50'
              >
                {finalizarMutation.isPending && <div className='size-4 animate-spin rounded-full border-2 border-white/30 border-t-white'></div>}
                Finalizar orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal corregir informe (Paso 19) */}
      {correccion && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
          <div className='max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#3C6E71]/50 bg-[#182F3F] p-6 shadow-2xl'>
            <div className='flex items-center justify-between border-b border-[#3C6E71]/30 pb-4'>
              <h2 className='flex items-center gap-2 text-lg font-bold text-white'>
                <FileText className='size-5 text-amber-300' />
                Corregir informe técnico
              </h2>
              <button onClick={() => setCorreccion(null)} className='rounded-lg p-1 text-[#9CBFC1] transition hover:bg-[#3C6E71]/30 hover:text-white'>
                <X className='size-5' />
              </button>
            </div>

            <p className='mt-4 text-xs text-[#9CBFC1]'>
              Versión actual <span className='font-semibold text-white'>v{correccion.version}</span>. Al guardar se emitirá
              la <span className='font-semibold text-amber-300'>v{correccion.version + 1}</span> y la actual quedará en el historial.
            </p>

            <div className='mt-4 space-y-4'>
              <div>
                <label className='text-xs font-semibold uppercase tracking-wider text-[#9CBFC1]'>Equipo</label>
                <input
                  value={corrForm.equipo}
                  onChange={(e) => setCorrForm((f) => ({ ...f, equipo: e.target.value }))}
                  className='mt-1 w-full rounded-lg border border-[#3C6E71]/40 bg-[#203C50] px-3 py-2 text-sm text-white focus:border-[#3C6E71] focus:outline-none'
                />
              </div>

              <div>
                <label className='text-xs font-semibold uppercase tracking-wider text-[#9CBFC1]'>Diagnóstico / informe corregido *</label>
                <textarea
                  value={corrForm.diagnostico}
                  onChange={(e) => setCorrForm((f) => ({ ...f, diagnostico: e.target.value }))}
                  rows={4}
                  placeholder='Corrige el informe (ej. número de serie correcto).'
                  className='mt-1 w-full rounded-lg border border-[#3C6E71]/40 bg-[#203C50] px-3 py-2 text-sm text-white placeholder:text-[#6B8A8C] focus:border-[#3C6E71] focus:outline-none'
                />
              </div>

              <div>
                <label className='text-xs font-semibold uppercase tracking-wider text-[#9CBFC1]'>Motivo de la corrección</label>
                <input
                  value={corrForm.motivo}
                  onChange={(e) => setCorrForm((f) => ({ ...f, motivo: e.target.value }))}
                  placeholder='Ej. Número de serie incorrecto en el informe original.'
                  className='mt-1 w-full rounded-lg border border-[#3C6E71]/40 bg-[#203C50] px-3 py-2 text-sm text-white placeholder:text-[#6B8A8C] focus:border-[#3C6E71] focus:outline-none'
                />
              </div>

              {correccion.historialVersiones?.length > 0 && (
                <div className='rounded-lg border border-[#3C6E71]/40 bg-[#203C50] p-3'>
                  <p className='mb-2 text-xs font-semibold uppercase tracking-wider text-[#9CBFC1]'>Historial de versiones</p>
                  <ul className='space-y-1.5'>
                    {correccion.historialVersiones.map((v) => (
                      <li key={v.version} className='text-xs text-[#D9D9D9]'>
                        <span className='font-semibold text-white'>v{v.version}</span>
                        <span className='text-[#9CBFC1]'> — {new Date(v.fecha).toLocaleString('es-CL')}</span>
                        {v.motivo && <span className='text-[#6B8A8C]'> · {v.motivo}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {corrError && (
                <div className='flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400'>
                  <AlertTriangle className='mt-0.5 size-4 shrink-0' />
                  {corrError}
                </div>
              )}
            </div>

            <div className='mt-6 flex justify-end gap-3'>
              <button onClick={() => setCorreccion(null)} className='rounded-xl border border-[#3C6E71]/40 px-4 py-2 text-sm font-semibold text-[#9CBFC1] transition hover:bg-[#3C6E71]/20'>
                Cancelar
              </button>
              <button
                onClick={handleCorregir}
                disabled={corregirMutation.isPending}
                className='inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50'
              >
                {corregirMutation.isPending && <div className='size-4 animate-spin rounded-full border-2 border-white/30 border-t-white'></div>}
                Guardar corrección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
