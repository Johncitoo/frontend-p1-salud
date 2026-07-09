export type AppRole = 'ADMIN' | 'COORDINADOR' | 'PROFESIONAL' | 'SUPERVISOR' | 'TECNICO'

/**
 * Traduce un rol interno (ADMIN, COORDINADOR, ...) a su nombre en español.
 * Todo el código sigue usando los nombres internos en inglés.
 */
export const ROLE_LABEL: Record<AppRole, string> = {
  ADMIN: 'Administrador',
  COORDINADOR: 'Coordinador',
  PROFESIONAL: 'Profesional',
  SUPERVISOR: 'Supervisor',
  TECNICO: 'Técnico',
}

export function roleLabel(nombre: string): string {
  return ROLE_LABEL[nombre as AppRole] ?? nombre
}
