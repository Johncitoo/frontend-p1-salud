import { apiGet } from '@/lib/api'
import type { CrmTicket, CrmExternalStatus } from './types'

export const getCrmTickets = async (params?: {
  estado?: string
  severidad?: string
}) => {
  const query = new URLSearchParams()
  if (params?.estado) query.append('estado', params.estado)
  if (params?.severidad) query.append('severidad', params.severidad)
  
  const qString = query.toString()
  return await apiGet<CrmTicket[]>(`/incidentes-salud${qString ? `?${qString}` : ''}`)
}

export const getCrmTicketExternalStatus = async (id: string) => {
  return await apiGet<CrmExternalStatus>(`/incidentes-salud/externo/${id}`)
}
