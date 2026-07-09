export interface RepuestoCatalogo {
  sku: string
  nombre: string
  descripcion: string
}

export interface RepuestoSolicitado {
  sku: string
  nombre?: string
  cantidad: number
}

export type PrioridadMantenimiento = 'baja' | 'media' | 'alta' | 'urgente'

export interface InspeccionMantenimiento {
  id: string
  pacienteId: string
  visitaId?: string | null
  equipo: string
  diagnostico?: string | null
  prioridad: string
  repuestos: RepuestoSolicitado[]
  estado: string
  pedidoExternoId?: string | null
  pedidoEstadoExterno?: string | null
  pedidoError?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateInspeccionInput {
  pacienteId: string
  visitaId?: string
  equipo: string
  diagnostico?: string
  prioridad?: PrioridadMantenimiento
  repuestos: { sku: string; cantidad: number }[]
}
