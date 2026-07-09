import { useEffect, useMemo, useState } from 'react'

import { Pencil, Search, Trash2, UserPlus } from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiDelete, apiGet } from '@/lib/api'
import { roleLabel } from '@/lib/roleLabel'
import type { UserRow } from './types'

const UsersListPage = () => {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const session = useCurrentUser()
  const canWriteUsers = session.rol === 'ADMIN'

  const loadUsers = () => {
    setIsLoading(true)
    setError('')

    apiGet<UserRow[]>('/usuarios')
      .then(setUsers)
      .catch(fetchError => {
        setError(fetchError instanceof Error ? fetchError.message : 'No fue posible cargar usuarios.')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return users

    return users.filter(user => {
      const fullName = `${user.nombres} ${user.apellidos}`.toLowerCase()

      return (
        user.rut.toLowerCase().includes(normalizedQuery) ||
        fullName.includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        (user.rol || '').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [query, users])

  const handleDelete = async (user: UserRow) => {
    const confirmed = window.confirm(`¿Eliminar usuario ${user.nombres} ${user.apellidos}?`)
    if (!confirmed) return

    try {
      await apiDelete<UserRow>(`/usuarios/${user.id}`)
      setUsers(currentUsers => currentUsers.filter(currentUser => currentUser.id !== user.id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No fue posible eliminar el usuario.')
    }
  }

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-7xl'>
        <header className='mb-6 flex items-end justify-between gap-4'>
          <div>
            <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>
              Gestión de usuarios y seguridad
            </p>
            <h1 className='m-0 text-3xl font-semibold text-slate-900'>Listado de Usuarios</h1>
            <p className='mt-2 text-sm text-slate-600'>
              Administración local de perfiles vinculados a identidades del sistema centralizado.
            </p>
          </div>
          {canWriteUsers ? (
            <a
              href='/users/new'
              className='inline-flex items-center gap-2 rounded-lg bg-[#3C6E71] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#284B63]'
            >
              <UserPlus className='size-4' />
              Crear usuario
            </a>
          ) : null}
        </header>

        <div className='relative mb-4 w-full'>
          <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500' />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder='Buscar por RUT, nombre, email o rol'
            className='w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-[#3C6E71] focus:ring-1 focus:ring-[#3C6E71]'
          />
        </div>

        {error && (
          <div className='mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        {/* Desktop Table View */}
        <div className='hidden lg:block overflow-x-auto rounded-md border border-slate-300 bg-white'>
          <table className='w-full min-w-[1080px] text-left text-sm'>
            <thead className='bg-slate-100'>
              <tr className='text-xs uppercase tracking-wide text-slate-600'>
                <th className='px-4 py-3'>RUT</th>
                <th className='px-4 py-3'>Nombre</th>
                <th className='px-4 py-3'>Email</th>
                <th className='px-4 py-3'>Rol</th>
                <th className='px-4 py-3'>Estado</th>
                <th className='px-4 py-3'>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className='px-4 py-8 text-center text-sm text-slate-500'>
                    Cargando usuarios...
                  </td>
                </tr>
              )}

              {filteredUsers.map(user => (
                <tr key={user.id} className='border-t border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors'>
                  <td className='px-4 py-3 font-medium'>{user.rut}</td>
                  <td className='px-4 py-3'>{user.nombres} {user.apellidos}</td>
                  <td className='px-4 py-3'>{user.email}</td>
                  <td className='px-4 py-3'>{roleLabel(user.rol || '') || '-'}</td>
                  <td className='px-4 py-3'>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        user.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    {canWriteUsers ? (
                      <div className='flex items-center gap-2'>
                        <a
                          href={`/users/${user.id}/edit`}
                          className='inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors'
                        >
                          <Pencil className='size-3.5' />
                          Editar
                        </a>
                        <button
                          type='button'
                          onClick={() => handleDelete(user)}
                          className='inline-flex items-center gap-1.5 rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors shadow-sm'
                        >
                          <Trash2 className='size-3.5' />
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <span className='text-xs text-slate-500'>Solo lectura</span>
                    )}
                  </td>
                </tr>
              ))}

              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className='px-4 py-8 text-center text-sm text-slate-500'>
                    No hay usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden'>
          {isLoading && (
            <div className='col-span-1 md:col-span-2 py-8 text-center text-sm text-slate-500'>
              Cargando usuarios...
            </div>
          )}

          {!isLoading && filteredUsers.length === 0 && (
            <div className='col-span-1 md:col-span-2 py-8 text-center text-sm text-slate-500'>
              No hay usuarios que coincidan con la búsqueda.
            </div>
          )}

          {filteredUsers.map(user => (
            <div key={user.id} className='flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
              <div className='flex flex-col gap-3'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <h3 className='font-bold text-slate-900'>{user.nombres} {user.apellidos}</h3>
                    <p className='mt-0.5 text-xs text-slate-500 font-medium'>RUT: {user.rut}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      user.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                <div className='grid grid-cols-1 gap-2'>
                  <div>
                    <span className='block text-[10px] font-bold uppercase tracking-wider text-slate-400'>Email</span>
                    <span className='text-sm text-slate-700 break-all'>{user.email}</span>
                  </div>
                  <div>
                    <span className='block text-[10px] font-bold uppercase tracking-wider text-slate-400'>Rol</span>
                    <span className='text-sm text-slate-700'>{roleLabel(user.rol || '') || '-'}</span>
                  </div>
                </div>
              </div>

              {canWriteUsers && (
                <div className='mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-3'>
                  <a
                    href={`/users/${user.id}/edit`}
                    className='inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors'
                  >
                    <Pencil className='size-3.5' /> Editar
                  </a>
                  <button
                    type='button'
                    onClick={() => handleDelete(user)}
                    className='inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 transition-colors shadow-sm'
                  >
                    <Trash2 className='size-3.5' /> Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export default UsersListPage
