import { FormEvent, useEffect, useMemo, useState } from 'react'

import { ArrowLeft, Save, ShieldAlert, UserPlus } from 'lucide-react'

import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { buildUserPayload, createEmptyUserForm, validateUserForm, type UserFormValues, type UserPayload } from './userForm'
import type { RoleOption, UserRow } from './types'

type UserFormPageProps = {
  userId?: string
}

const fieldClassName =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#3C6E71] focus:ring-2 focus:ring-[#C9DCDD]'

const labelClassName = 'text-sm font-medium text-slate-700'

const mapUserToForm = (user: UserRow): UserFormValues => ({
  identityUserId: user.identityUserId ?? '',
  rolId: user.rolId,
  rut: user.rut,
  nombres: user.nombres,
  apellidos: user.apellidos,
  email: user.email,
  telefono: user.telefono || '',
  activo: user.activo,
})

const UserFormPage = ({ userId }: UserFormPageProps) => {
  const isEditing = Boolean(userId)
  const [values, setValues] = useState<UserFormValues>(() => createEmptyUserForm())
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [isLoading, setIsLoading] = useState(isEditing)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const errors = useMemo(() => validateUserForm(values), [values])
  const hasErrors = Object.keys(errors).length > 0

  useEffect(() => {
    let isMounted = true

    Promise.all([
      apiGet<RoleOption[]>('/usuarios/roles'),
      userId ? apiGet<UserRow>(`/usuarios/${userId}`) : Promise.resolve(null),
    ])
      .then(([roleOptions, user]) => {
        if (!isMounted) return
        setRoles(roleOptions)
        if (user) setValues(mapUserToForm(user))
      })
      .catch(error => {
        if (isMounted) setSubmitError(error instanceof Error ? error.message : 'No fue posible cargar usuarios.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [userId])

  const updateField = (field: keyof UserFormValues, value: string | boolean) => {
    setValues(currentValues => ({ ...currentValues, [field]: value }))
    setSubmitError('')
    setSuccessMessage('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (Object.keys(validateUserForm(values)).length > 0) {
      setSubmitError('Completa los campos obligatorios antes de guardar el usuario.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    setSuccessMessage('')

    try {
      const payload = buildUserPayload(values)
      const savedUser = isEditing
        ? await apiPatch<UserRow, UserPayload>(`/usuarios/${userId}`, payload)
        : await apiPost<UserRow, UserPayload>('/usuarios', payload)

      setSuccessMessage(`Usuario ${savedUser.nombres} ${savedUser.apellidos} guardado correctamente.`)
      if (!isEditing) setValues(createEmptyUserForm())
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No fue posible guardar el usuario.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-5xl'>
        <a
          href='/users'
          className='mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900'
        >
          <ArrowLeft className='size-4' />
          Volver al listado
        </a>

        <header className='mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
          <div className='flex items-center gap-3'>
            <span className='rounded-full bg-[#E8F0F1] p-3 text-[#284B63]'>
              <UserPlus className='size-6' />
            </span>
            <div>
              <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>
                Gestión de usuarios y seguridad
              </p>
              <h1 className='m-0 text-3xl font-semibold text-slate-900'>
                {isEditing ? 'Editar usuario' : 'Registro de usuarios'}
              </h1>
              <p className='mt-2 text-sm text-slate-600'>
                CRUD local de usuarios. La contraseña sigue siendo responsabilidad del Proyecto 12.
              </p>
            </div>
          </div>
        </header>

        <div className='mb-6 flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900'>
          <ShieldAlert className='mt-0.5 size-4 shrink-0' />
          <p className='m-0'>
            Este formulario no guarda contraseñas. Puedes registrar email y perfil local, pero las credenciales reales
            deben existir en el sistema centralizado. Si dejas el Identity user ID vacio, se vinculara automaticamente
            por email cuando la persona inicie sesion por primera vez.
          </p>
        </div>

        <form onSubmit={handleSubmit} className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
          {isLoading ? (
            <p className='text-sm text-slate-500'>Cargando datos del usuario...</p>
          ) : (
            <>
              <div className='grid gap-5 md:grid-cols-2'>
                <label className={labelClassName}>
                  Identity user ID <span className='text-red-600'>*</span>
                  <input
                    value={values.identityUserId}
                    onChange={event => updateField('identityUserId', event.target.value)}
                    className={fieldClassName}
                  />
                  {errors.identityUserId && (
                    <span className='mt-1 block text-xs text-red-600'>{errors.identityUserId}</span>
                  )}
                </label>

                <label className={labelClassName}>
                  Rol <span className='text-red-600'>*</span>
                  <select
                    value={values.rolId}
                    onChange={event => updateField('rolId', event.target.value)}
                    className={fieldClassName}
                  >
                    <option value=''>Seleccionar rol</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.rolId && <span className='mt-1 block text-xs text-red-600'>{errors.rolId}</span>}
                </label>

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
                  Email <span className='text-red-600'>*</span>
                  <input
                    type='email'
                    value={values.email}
                    onChange={event => updateField('email', event.target.value)}
                    placeholder='usuario@correo.cl'
                    className={fieldClassName}
                  />
                  {errors.email && <span className='mt-1 block text-xs text-red-600'>{errors.email}</span>}
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
                  Teléfono
                  <input
                    value={values.telefono}
                    onChange={event => updateField('telefono', event.target.value)}
                    placeholder='+56 9 1234 5678'
                    className={fieldClassName}
                  />
                </label>

                <label className='mt-7 flex items-center gap-2 text-sm font-medium text-slate-700'>
                  <input
                    type='checkbox'
                    checked={values.activo}
                    onChange={event => updateField('activo', event.target.checked)}
                    className='size-4 rounded border-slate-300'
                  />
                  Usuario activo
                </label>
              </div>

              {submitError && (
                <div className='mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                  {submitError}
                </div>
              )}

              {successMessage && (
                <div className='mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
                  {successMessage}
                </div>
              )}

              <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
                <a
                  href='/users'
                  className='inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
                >
                  Cancelar
                </a>
                <button
                  type='submit'
                  disabled={isSubmitting || hasErrors}
                  className='inline-flex items-center justify-center gap-2 rounded-lg bg-[#3C6E71] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#284B63] disabled:cursor-not-allowed disabled:bg-slate-400'
                >
                  <Save className='size-4' />
                  {isSubmitting ? 'Guardando...' : 'Guardar usuario'}
                </button>
              </div>
            </>
          )}
        </form>
      </section>
    </main>
  )
}

export default UserFormPage
