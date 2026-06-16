// ---- DTOs que vienen de la API ----

export type VariableClinicaRow = {
  id: string
  codigo: string
  nombre: string
  descripcion?: string | null
  categoria?: string | null
  tipoDato: string
  unidad?: string | null
  valorMinimo?: number | null
  valorMaximo?: number | null
  sinonimos?: string[] | null
  activa: boolean
}

export type PlantillaFichaRow = {
  id: string
  codigo: string
  nombre: string
  descripcion?: string | null
  tipoAtencion?: string | null
  activa: boolean
  campos?: PlantillaCampoRow[]
}

export type PatientOptionRow = {
  id: string
  rut: string
  nombres: string
  apellidos: string
}

export type VisitaOptionRow = {
  id: string
  pacienteId: string
  profesionalSaludId?: string
  zonaId?: string | null
  fechaProgramada?: string | null
  horaProgramada?: string | null
  estado?: string | null
  prioridad?: string | null
  createdAt: string
}

export type PlantillaCampoRow = {
  id: string
  plantillaFichaId: string
  variableClinicaId?: string | null
  codigoCampo: string
  etiqueta: string
  tipoCampo: string
  obligatorio: boolean
  orden: number
  ayudaTexto?: string | null
  opciones?: Record<string, unknown>
  activo: boolean
}

export type FichaClinicaRow = {
  id: string
  visitaId: string
  plantillaFichaId?: string | null
  estado: string
  contenido: Record<string, unknown>
  creadaPorUsuarioId?: string | null
  actualizadaPorUsuarioId?: string | null
  version: number
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type MedicionClinicaRow = {
  id: string
  fichaClinicaId?: string | null
  visitaId?: string | null
  pacienteId: string
  variableClinicaId: string
  valorNumero?: number | null
  valorTexto?: string | null
  valorBoolean?: boolean | null
  valorFecha?: string | null
  valorJson?: Record<string, unknown> | null
  unidad?: string | null
  origen: string
  registradoPorUsuarioId?: string | null
  fechaMedicion: string
  createdAt: string
}

// ---- Tipos de formulario ----

export type DynamicFieldValue = string | number | boolean | string[] | Record<string, unknown>

export type FichaFormValues = {
  visitaId: string
  plantillaFichaId: string
  /** Campos dinámicos: { [codigoCampo]: valor } */
  fields: Record<string, DynamicFieldValue>
  /** Observaciones generales (campo libre) */
  observaciones: string
}

export type FichaClinicaPayload = {
  visitaId: string
  plantillaFichaId?: string
  estado?: string
  contenido: Record<string, unknown>
}
