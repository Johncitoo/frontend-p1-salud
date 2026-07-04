import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info, ShieldAlert, X } from 'lucide-react'
import { getCrmTickets, getCrmTicketExternalStatus } from './crmApi'
import type { CrmTicket } from './types'

export default function CrmTicketsListPage() {
  const [selectedTicket, setSelectedTicket] = useState<CrmTicket | null>(null)

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['crmTickets'],
    queryFn: () => getCrmTickets(),
  })

  const { data: externalStatus, isLoading: isLoadingExternal } = useQuery({
    queryKey: ['crmTicketExternal', selectedTicket?.id],
    queryFn: () => getCrmTicketExternalStatus(selectedTicket!.id),
    enabled: !!selectedTicket && (selectedTicket.severidad === 'ALTA' || selectedTicket.severidad === 'CRÍTICA' || selectedTicket.severidad === 'CRITICA'),
    retry: false,
  })

  const getSeveridadColor = (severidad: string) => {
    switch (severidad) {
      case 'CRÍTICA':
      case 'CRITICA':
        return 'bg-red-500/20 text-red-400 border border-red-500/30'
      case 'ALTA':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
      case 'MEDIA':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
      default:
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'ABIERTO':
        return 'text-red-400 bg-red-400/10'
      case 'EN_PROGRESO':
        return 'text-yellow-400 bg-yellow-400/10'
      case 'RESUELTO':
      case 'CERRADO':
        return 'text-green-400 bg-green-400/10'
      default:
        return 'text-slate-400 bg-slate-400/10'
    }
  }

  return (
    <div className='p-6 lg:p-8'>
      <div className='mb-8 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-white'>Incidentes y Alertas</h1>
          <p className='mt-1 text-sm text-[#D9D9D9]'>
            Supervisa las alertas del sistema y revisa su estado en el CRM de Incidentes.
          </p>
        </div>
      </div>

      <div className='overflow-hidden rounded-2xl border border-[#3C6E71]/40 bg-[#203C50] shadow-xl'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-sm text-[#D9D9D9]'>
            <thead className='border-b border-[#3C6E71]/40 bg-[#182F3F]/50 text-xs uppercase'>
              <tr>
                <th className='px-6 py-4 font-semibold text-white'>Tipo / Fecha</th>
                <th className='px-6 py-4 font-semibold text-white'>Asunto</th>
                <th className='px-6 py-4 font-semibold text-white'>Severidad</th>
                <th className='px-6 py-4 font-semibold text-white'>Estado Local</th>
                <th className='px-6 py-4 font-semibold text-white text-right'>Acciones</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#3C6E71]/20'>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className='px-6 py-8 text-center'>
                    <div className='inline-block size-6 animate-spin rounded-full border-2 border-white/20 border-t-white'></div>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className='px-6 py-8 text-center text-[#D9D9D9]'>
                    No se han registrado incidentes ni alertas en el sistema.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id} className='transition-colors hover:bg-[#3C6E71]/10'>
                    <td className='px-6 py-4'>
                      <p className='font-medium text-white'>{ticket.tipo}</p>
                      <p className='mt-1 text-xs text-[#9CBFC1]'>
                        {new Date(ticket.createdAt).toLocaleString('es-CL')}
                      </p>
                    </td>
                    <td className='px-6 py-4'>
                      <p className='max-w-md truncate font-medium text-white'>{ticket.titulo}</p>
                      {ticket.descripcion && (
                        <p className='mt-1 max-w-md truncate text-xs text-[#9CBFC1]'>
                          {ticket.descripcion}
                        </p>
                      )}
                    </td>
                    <td className='px-6 py-4'>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSeveridadColor(ticket.severidad)}`}>
                        {ticket.severidad}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${getEstadoColor(ticket.estado)}`}>
                        <div className={`size-1.5 rounded-full bg-current`} />
                        {ticket.estado}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-right'>
                      {(ticket.severidad === 'ALTA' || ticket.severidad === 'CRÍTICA' || ticket.severidad === 'CRITICA') ? (
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className='inline-flex items-center gap-2 rounded-lg bg-[#3C6E71]/20 px-3 py-1.5 text-xs font-semibold text-[#9CBFC1] transition hover:bg-[#3C6E71] hover:text-white'
                        >
                          <ShieldAlert className='size-3.5' />
                          Ver CRM
                        </button>
                      ) : (
                        <span className='text-xs text-slate-500'>No aplica (CRM)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de CRM */}
      {selectedTicket && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
          <div className='w-full max-w-lg rounded-2xl border border-[#3C6E71]/50 bg-[#182F3F] p-6 shadow-2xl'>
            <div className='flex items-center justify-between border-b border-[#3C6E71]/30 pb-4'>
              <h2 className='flex items-center gap-2 text-lg font-bold text-white'>
                <ShieldAlert className='size-5 text-orange-400' />
                Estado en CRM Externo
              </h2>
              <button
                onClick={() => setSelectedTicket(null)}
                className='rounded-lg p-1 text-[#9CBFC1] transition hover:bg-[#3C6E71]/30 hover:text-white'
              >
                <X className='size-5' />
              </button>
            </div>

            <div className='mt-6 space-y-6'>
              <div className='rounded-xl border border-[#3C6E71]/30 bg-[#203C50] p-4'>
                <h3 className='text-xs font-bold uppercase tracking-wider text-[#9CBFC1]'>Datos Locales (Salud)</h3>
                <div className='mt-3 space-y-2'>
                  <p className='text-sm text-white'><span className='font-semibold'>ID:</span> {selectedTicket.id}</p>
                  <p className='text-sm text-white'><span className='font-semibold'>Título:</span> {selectedTicket.titulo}</p>
                </div>
              </div>

              <div className='rounded-xl border border-orange-500/30 bg-orange-500/5 p-4'>
                <h3 className='flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400'>
                  <AlertCircle className='size-4' />
                  Respuesta del CRM (Proyecto 07)
                </h3>
                
                <div className='mt-4'>
                  {isLoadingExternal ? (
                    <div className='flex items-center gap-3 text-sm text-[#D9D9D9]'>
                      <div className='size-4 animate-spin rounded-full border-2 border-orange-400/20 border-t-orange-400'></div>
                      Consultando ticket en el sistema central...
                    </div>
                  ) : externalStatus ? (
                    <div className='space-y-4'>
                      <div className='flex items-center justify-between'>
                        <p className='text-sm font-medium text-white'>Estado del Ticket:</p>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase ${externalStatus.estado.toLowerCase() === 'resuelto' || externalStatus.estado.toLowerCase() === 'cerrado' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {externalStatus.estado}
                        </span>
                      </div>
                      <div className='rounded-lg bg-black/20 p-3'>
                        <p className='text-xs font-semibold text-[#9CBFC1]'>Asunto CRM</p>
                        <p className='mt-1 text-sm text-white'>{externalStatus.titulo}</p>
                      </div>
                    </div>
                  ) : (
                    <div className='flex items-start gap-3 rounded-lg bg-red-500/10 p-3 text-red-400'>
                      <AlertTriangle className='mt-0.5 size-5 shrink-0' />
                      <p className='text-sm'>
                        No se pudo obtener el estado del ticket en el CRM. Es posible que el ticket aún no se haya procesado o el servicio no esté disponible.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className='mt-8 text-right'>
              <button
                onClick={() => setSelectedTicket(null)}
                className='rounded-xl bg-[#3C6E71] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2A4D4F]'
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
