export type PatientSex = '' | 'FEMENINO' | 'MASCULINO' | 'OTRO' | 'NO_INFORMA'

export type PatientFormValues = {
  rut: string
  nombres: string
  apellidos: string
  fechaNacimiento: string
  sexo: PatientSex
  telefono: string
  email: string
  direccion: string
}

export type CreatePatientPayload = {
  rut: string
  nombres: string
  apellidos: string
  fechaNacimiento?: string
  sexo?: string
  telefono?: string
  email?: string
  direccion?: string
}

export type PatientFormErrors = Partial<Record<keyof PatientFormValues, string>>

export const emptyPatientForm: PatientFormValues = {
  rut: '',
  nombres: '',
  apellidos: '',
  fechaNacimiento: '',
  sexo: '',
  telefono: '',
  email: '',
  direccion: '',
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validatePatientForm(values: PatientFormValues): PatientFormErrors {
  const errors: PatientFormErrors = {}

  if (!values.rut.trim()) errors.rut = 'El RUT es obligatorio.'
  if (!values.nombres.trim()) errors.nombres = 'Los nombres son obligatorios.'
  if (!values.apellidos.trim()) errors.apellidos = 'Los apellidos son obligatorios.'

  if (values.email.trim() && !emailPattern.test(values.email.trim())) {
    errors.email = 'Ingresa un email válido.'
  }

  return errors
}

export function buildCreatePatientPayload(values: PatientFormValues): CreatePatientPayload {
  return {
    rut: values.rut.trim(),
    nombres: values.nombres.trim(),
    apellidos: values.apellidos.trim(),
    ...(values.fechaNacimiento ? { fechaNacimiento: values.fechaNacimiento } : {}),
    ...(values.sexo ? { sexo: values.sexo } : {}),
    ...(values.telefono.trim() ? { telefono: values.telefono.trim() } : {}),
    ...(values.email.trim() ? { email: values.email.trim() } : {}),
    ...(values.direccion.trim() ? { direccion: values.direccion.trim() } : {}),
  }
}
