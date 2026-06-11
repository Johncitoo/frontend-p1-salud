export type UserFormValues = {
  identityUserId: string
  rolId: string
  rut: string
  nombres: string
  apellidos: string
  email: string
  telefono: string
  activo: boolean
}

export type UserPayload = {
  identityUserId?: string
  rolId: string
  rut: string
  nombres: string
  apellidos: string
  email: string
  telefono?: string
  activo: boolean
}

export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>

export const createEmptyUserForm = (): UserFormValues => ({
  identityUserId: '',
  rolId: '',
  rut: '',
  nombres: '',
  apellidos: '',
  email: '',
  telefono: '',
  activo: true,
})

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateUserForm(values: UserFormValues): UserFormErrors {
  const errors: UserFormErrors = {}

  if (!values.rolId) errors.rolId = 'El rol es obligatorio.'
  if (!values.rut.trim()) errors.rut = 'El RUT es obligatorio.'
  if (!values.nombres.trim()) errors.nombres = 'Los nombres son obligatorios.'
  if (!values.apellidos.trim()) errors.apellidos = 'Los apellidos son obligatorios.'
  if (!values.email.trim()) errors.email = 'El correo es obligatorio.'
  if (values.email.trim() && !emailPattern.test(values.email.trim())) {
    errors.email = 'Ingresa un correo válido.'
  }

  return errors
}

export function buildUserPayload(values: UserFormValues): UserPayload {
  return {
    ...(values.identityUserId.trim() ? { identityUserId: values.identityUserId.trim() } : {}),
    rolId: values.rolId,
    rut: values.rut.trim(),
    nombres: values.nombres.trim(),
    apellidos: values.apellidos.trim(),
    email: values.email.trim(),
    ...(values.telefono.trim() ? { telefono: values.telefono.trim() } : {}),
    activo: values.activo,
  }
}
