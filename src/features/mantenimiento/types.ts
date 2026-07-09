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

export interface VersionInforme {
  version: number
  equipo: string
  diagnostico?: string | null
  motivo?: string | null
  corregidoPorUsuarioId?: string | null
  fecha: string
}

export interface InspeccionMantenimiento {
  id: string
  pacienteId: string
  visitaId?: string | null
  equipo: string
  diagnostico?: string | null
  prioridad: string
  repuestos: RepuestoSolicitado[]
  estado: string
  version: number
  historialVersiones: VersionInforme[]
  pedidoExternoId?: string | null
  pedidoEstadoExterno?: string | null
  pedidoError?: string | null
  incidenteId?: string | null
  intervencionAt?: string | null
  intervencionNotas?: string | null
  createdAt: string
  updatedAt: string
}

// Paso 19: corrección del informe técnico (emite una nueva versión).
export interface CorregirInformeInput {
  diagnostico: string
  equipo?: string
  motivo?: string
}

export interface CreateInspeccionInput {
  pacienteId?: string
  visitaId?: string
  equipo: string
  diagnostico?: string
  prioridad?: PrioridadMantenimiento
  repuestos: { sku: string; cantidad: number }[]
}
