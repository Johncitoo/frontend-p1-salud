/**
 * Utilidad de RUT chileno para el frontend.
 * Mismo algoritmo módulo 11 que el backend.
 */

/** Quita puntos, guiones y espacios. Devuelve solo dígitos + K. */
export function limpiarRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase()
}

/** Calcula el dígito verificador para un cuerpo numérico. */
export function calcularDv(cuerpo: number): string {
  let suma = 0
  let multiplicador = 2

  while (cuerpo > 0) {
    suma += (cuerpo % 10) * multiplicador
    cuerpo = Math.floor(cuerpo / 10)
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }

  const resto = 11 - (suma % 11)
  if (resto === 11) return '0'
  if (resto === 10) return 'K'
  return String(resto)
}

/** Valida un RUT chileno (algoritmo módulo 11). */
export function validarRut(rut: string): boolean {
  const limpio = limpiarRut(rut)
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false

  const cuerpo = parseInt(limpio.slice(0, -1), 10)
  const dv = limpio.slice(-1)

  return calcularDv(cuerpo) === dv
}

/**
 * Formatea un RUT al formato 12.345.678-9.
 * Acepta cualquier formato de entrada.
 */
export function formatearRut(rut: string): string {
  const limpio = limpiarRut(rut)
  if (limpio.length < 2) return rut

  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${conPuntos}-${dv}`
}

/**
 * Formatea en vivo mientras el usuario escribe.
 * Solo formatea si la parte numérica tiene al menos 2 dígitos.
 * Ej: "21166623" → "21.166.623", "211666234" → "21.166.623-4"
 */
export function formatearRutEnVivo(valor: string): string {
  const soloDigitos = valor.replace(/[^\dkK]/gi, '')
  if (soloDigitos.length <= 1) return soloDigitos

  const cuerpo = soloDigitos.slice(0, -1)
  const dv = soloDigitos.slice(-1)

  // Si hay dígitos suficientes, formatear cuerpo con puntos
  let resultado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  // Agregar guion + DV si el cuerpo tiene al menos 6 dígitos
  if (cuerpo.length >= 6) {
    resultado += `-${dv}`
  } else {
    // Si el cuerpo es corto, el DV va pegado (sin guion todavía)
    resultado += dv
  }

  return resultado
}

/** Devuelve true si el RUT tiene el formato completo (ya tiene guion y DV). */
export function rutEstaCompleto(rut: string): boolean {
  return /^\d{1,2}(\.\d{3}){2}-[\dkK]$/i.test(rut) || /^\d{7,8}-[\dkK]$/i.test(rut)
}
