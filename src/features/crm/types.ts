export type CrmSeveridad = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA' | 'CRITICA'
export type CrmEstado = 'ABIERTO' | 'EN_PROGRESO' | 'RESUELTO' | 'CERRADO' | 'CANCELADO'

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

export interface CrmExternalStatus {
  id: string
  titulo: string
  descripcion: string
  estado: string
  severidad: string
}
