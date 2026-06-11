import type {
  DynamicFieldValue,
  FichaClinicaPayload,
  FichaClinicaRow,
  FichaFormValues,
  PlantillaCampoRow,
} from './types'

// ---- Construir payload desde formulario dinámico ----
export function buildFichaPayload(values: FichaFormValues): FichaClinicaPayload {
  const contenido: Record<string, unknown> = {}

  for (const [codigo, valor] of Object.entries(values.fields)) {
    contenido[codigo] = valor
  }

  if (values.observaciones.trim()) {
    contenido.observaciones_generales = values.observaciones.trim()
  }

  return {
    visitaId: values.visitaId,
    plantillaFichaId: values.plantillaFichaId || undefined,
    contenido,
  }
}

// ---- Convertir ficha existente a FichaFormValues ----
export function fichaToFormValues(
  ficha: FichaClinicaRow,
  campos: PlantillaCampoRow[],
  visitaId: string,
): FichaFormValues {
  const fields: Record<string, DynamicFieldValue> = {}

  for (const campo of campos) {
    const raw = ficha.contenido[campo.codigoCampo]
    if (raw !== undefined && raw !== null) {
      fields[campo.codigoCampo] = raw as DynamicFieldValue
    }
  }

  // Observaciones generales
  const obs = ficha.contenido.observaciones_generales as string | undefined

  return {
    visitaId: ficha.visitaId || visitaId,
    plantillaFichaId: ficha.plantillaFichaId ?? '',
    fields,
    observaciones: obs ?? '',
  }
}

// ---- Validación ----
export function validateDynamicFields(
  fields: Record<string, DynamicFieldValue>,
  campos: PlantillaCampoRow[],
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const campo of campos) {
    const value = fields[campo.codigoCampo]
    const isEmpty = value === undefined || value === null || value === ''

    if (campo.obligatorio && isEmpty) {
      errors[campo.codigoCampo] = `${campo.etiqueta} es obligatorio.`
      continue
    }

    if (!isEmpty && campo.tipoCampo === 'VARIABLE_CLINICA' && typeof value === 'number') {
      // Validación de rango si vino info de la variable (se pasa desde el padre)
      // La API igual valida, esto es UX preview
      if (isNaN(value)) {
        errors[campo.codigoCampo] = 'Ingresa un valor numérico válido.'
      }
    }
  }

  return errors
}

// ---- Renderizar input según tipo de campo ----
export function getInputType(tipoCampo: string): 'text' | 'number' | 'date' | 'checkbox' | 'select' {
  switch (tipoCampo) {
    case 'NUMERO_LIBRE':
    case 'VARIABLE_CLINICA':
      return 'number'
    case 'FECHA':
      return 'date'
    case 'BOOLEANO':
      return 'checkbox'
    case 'SELECT':
    case 'MULTISELECT':
      return 'select'
    default:
      return 'text'
  }
}

export function formatVersionTag(version: number): string {
  return `v${version}`
}

export function getEstadoBadgeClass(estado: string): string {
  switch (estado) {
    case 'BORRADOR':
      return 'bg-amber-100 text-amber-800'
    case 'CERRADA':
      return 'bg-emerald-100 text-emerald-800'
    case 'ANULADA':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-slate-200 text-slate-700'
  }
}

export const emptyFichaForm = (visitaId: string, plantillaFichaId: string): FichaFormValues => ({
  visitaId,
  plantillaFichaId,
  fields: {},
  observaciones: '',
})
