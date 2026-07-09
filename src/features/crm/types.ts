export type CrmSeveridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA' | 'CRITICA'
// Estados que maneja el backend (incidentes_salud). Cambiar a RESUELTO/CERRADO
// dispara el re-envío a Grupo 11 para cerrar el ticket operacional.
export type CrmEstado = 'ABIERTO' | 'EN_REVISION' | 'RESUELTO' | 'CERRADO' | 'CANCELADO'

export interface CrmTicket {
  id: string
  tipo: string
  severidad: CrmSeveridad
  estado: CrmEstado
  titulo: string
  descripcion?: string
  pacienteId?: string
  visitaId?: string
  externalIncidentId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateCrmTicketInput {
  tipo: string
  titulo: string
  descripcion?: string
  severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  pacienteId?: string
  visitaId?: string
  profesionalSaludId?: string
}

export interface CrmExternalStatus {
  id: string
  externalIncidentId?: string | null
  saludRef?: string
  titulo: string
  descripcion?: string | null
  estado: string
  severidad: string
  canal?: string
  clienteNombre?: string
  resolucion?: string | null
  fechaVencimientoSla?: string | null
  creadoEn?: string
  actualizadoEn?: string
  sincronizado: boolean
  mensaje?: string
}
