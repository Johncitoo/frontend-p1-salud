import { apiGet, apiPost } from '@/lib/api'
import type { CrmTicket, CrmExternalStatus, CreateCrmTicketInput } from './types'

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
  return await apiGet<CrmExternalStatus>(`/incidentes-salud/${id}/crm`)
}

// Alta MANUAL de un ticket de soporte por un profesional. El backend marca origen
// WEB y (solo para altas manuales) genera el ticket en el CRM del Proyecto 07.
export const createCrmTicket = async (input: CreateCrmTicketInput) => {
  return await apiPost<CrmTicket, CreateCrmTicketInput>('/incidentes-salud', input)
}
