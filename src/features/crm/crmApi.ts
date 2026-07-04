import { api } from '@/lib/api'
import type { CrmTicket, CrmExternalStatus } from './types'

export const getCrmTickets = async (params?: {
  estado?: string
  severidad?: string
}) => {
  const { data } = await api.get<CrmTicket[]>('/incidentes-salud', { params })
  return data
}

export const getCrmTicketExternalStatus = async (id: string) => {
  const { data } = await api.get<CrmExternalStatus>(`/incidentes-salud/externo/${id}`)
  return data
}
