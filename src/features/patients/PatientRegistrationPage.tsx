import { FormEvent, useMemo, useState } from 'react'

import { ArrowLeft, Save, UserPlus } from 'lucide-react'

import { apiPost } from '@/lib/api'
import {
  buildCreatePatientPayload,
  emptyPatientForm,
  validatePatientForm,
  type CreatePatientPayload,
  type PatientFormValues,
} from './patientForm'

type CreatedPatient = CreatePatientPayload & {
  id: string
}

const fieldClassName =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#3C6E71] focus:ring-2 focus:ring-[#3C6E71]/15'

const labelClassName = 'text-sm font-medium text-slate-700'

const PatientRegistrationPage = () => {
  const [values, setValues] = useState<PatientFormValues>(emptyPatientForm)
  const [submitError, setSubmitError] = useState('')
  const [createdPatient, setCreatedPatient] = useState<CreatedPatient | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const errors = useMemo(() => validatePatientForm(values), [values])
  const hasErrors = Object.keys(errors).length > 0

  const updateField = (field: keyof PatientFormValues, value: string) => {
    setValues(currentValues => ({
      ...currentValues,
      [field]: value,
    }))
    setSubmitError('')
    setCreatedPatient(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationErrors = validatePatientForm(values)

    if (Object.keys(validationErrors).length > 0) {
      setSubmitError('Completa los campos obligatorios antes de registrar el paciente.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    setCreatedPatient(null)

    try {
      const payload = buildCreatePatientPayload(values)
      const patient = await apiPost<CreatedPatient, CreatePatientPayload>('/pacientes', payload)
      setCreatedPatient(patient)
      setValues(emptyPatientForm)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No fue posible registrar el paciente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-5xl'>
        <a
          href='/patients'
          className='mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#284B63] transition hover:text-[#3C6E71]'
        >
          <ArrowLeft className='size-4' />
          Volver al listado
        </a>

        <header className='mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex items-center gap-3'>
            <span className='rounded-2xl bg-[#3C6E71] p-3 text-white'>
              <UserPlus className='size-6' />
            </span>
            <div>
              <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>
                Gestión de pacientes
              </p>
              <h1 className='m-0 text-3xl font-semibold text-slate-900'>Registro de pacientes</h1>
              <p className='mt-2 text-sm text-slate-600'>
                Registra la información necesaria para incorporar un paciente a la atención.
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='grid gap-5 md:grid-cols-2'>
            <label className={labelClassName}>
              RUT <span className='text-red-600'>*</span>
              <input
                value={values.rut}
                onChange={event => updateField('rut', event.target.value)}
                placeholder='12.345.678-9'
                className={fieldClassName}
              />
              {errors.rut && <span className='mt-1 block text-xs text-red-600'>{errors.rut}</span>}
            </label>

            <label className={labelClassName}>
              Fecha de nacimiento
              <input
                type='date'
                value={values.fechaNacimiento}
                onChange={event => updateField('fechaNacimiento', event.target.value)}
                className={fieldClassName}
              />
            </label>

            <label className={labelClassName}>
              Nombres <span className='text-red-600'>*</span>
              <input
                value={values.nombres}
                onChange={event => updateField('nombres', event.target.value)}
                placeholder='María Elena'
                className={fieldClassName}
              />
              {errors.nombres && <span className='mt-1 block text-xs text-red-600'>{errors.nombres}</span>}
            </label>

            <label className={labelClassName}>
              Apellidos <span className='text-red-600'>*</span>
              <input
                value={values.apellidos}
                onChange={event => updateField('apellidos', event.target.value)}
                placeholder='Rojas Fuentes'
                className={fieldClassName}
              />
              {errors.apellidos && <span className='mt-1 block text-xs text-red-600'>{errors.apellidos}</span>}
            </label>

            <label className={labelClassName}>
              Sexo
              <select
                value={values.sexo}
                onChange={event => updateField('sexo', event.target.value)}
                className={fieldClassName}
              >
                <option value=''>Seleccionar</option>
                <option value='FEMENINO'>Femenino</option>
                <option value='MASCULINO'>Masculino</option>
                <option value='OTRO'>Otro</option>
                <option value='NO_INFORMA'>No informa</option>
              </select>
            </label>

            <label className={labelClassName}>
              Teléfono
              <input
                value={values.telefono}
                onChange={event => updateField('telefono', event.target.value)}
                placeholder='+56 9 1234 5678'
                className={fieldClassName}
              />
            </label>

            <label className={labelClassName}>
              Email
              <input
                type='email'
                value={values.email}
                onChange={event => updateField('email', event.target.value)}
                placeholder='paciente@correo.cl'
                className={fieldClassName}
              />
              {errors.email && <span className='mt-1 block text-xs text-red-600'>{errors.email}</span>}
            </label>

            <label className={labelClassName}>
              Dirección
              <input
                value={values.direccion}
                onChange={event => updateField('direccion', event.target.value)}
                placeholder='Calle, número, comuna'
                className={fieldClassName}
              />
            </label>
          </div>

          {submitError && (
            <div className='mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
              {submitError}
            </div>
          )}

          {createdPatient && (
            <div className='mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
              Paciente {createdPatient.nombres} {createdPatient.apellidos} registrado correctamente.
            </div>
          )}

          <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
            <a
              href='/patients'
              className='inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-[#284B63] transition hover:bg-slate-100'
            >
              Cancelar
            </a>
            <button
              type='submit'
              disabled={isSubmitting || hasErrors}
              className='inline-flex items-center justify-center gap-2 rounded-lg bg-[#3C6E71] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#284B63] disabled:cursor-not-allowed disabled:bg-slate-400'
            >
              <Save className='size-4' />
              {isSubmitting ? 'Registrando...' : 'Registrar paciente'}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default PatientRegistrationPage
