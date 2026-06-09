import { useEffect, useMemo, useState } from 'react'

import { Pencil, Search, Trash2, UserPlus } from 'lucide-react'

import { getMockSession } from '@/features/auth/mockAuth'
import { apiDelete, apiGet } from '@/lib/api'
import type { UserRow } from './types'

const UsersListPage = () => {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const session = getMockSession()
  const canWriteUsers = session?.role === 'ADMIN'

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
        user.identityUserId.toLowerCase().includes(normalizedQuery) ||
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
            <p className='text-xs font-semibold uppercase tracking-wide text-red-700'>
              Gestión de usuarios y seguridad
            </p>
            <h1 className='m-0 text-3xl font-semibold text-slate-900'>CRUD Usuarios</h1>
            <p className='mt-2 text-sm text-slate-600'>
              Administración local de perfiles vinculados a identidades del sistema centralizado.
            </p>
          </div>
          {canWriteUsers ? (
            <a
              href='/users/new'
              className='inline-flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800'
            >
              <UserPlus className='size-4' />
              Crear usuario
            </a>
          ) : null}
        </header>

        <div className='mb-4 flex w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2'>
          <Search className='size-4 text-slate-500' />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder='Buscar por RUT, nombre, email, rol o identity id'
            className='w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400'
          />
        </div>

        {error && (
          <div className='mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        <div className='overflow-x-auto rounded-md border border-slate-300 bg-white'>
          <table className='w-full min-w-[1080px] text-left text-sm'>
            <thead className='bg-slate-100'>
              <tr className='text-xs uppercase tracking-wide text-slate-600'>
                <th className='px-4 py-3'>RUT</th>
                <th className='px-4 py-3'>Nombre</th>
                <th className='px-4 py-3'>Email</th>
                <th className='px-4 py-3'>Rol</th>
                <th className='px-4 py-3'>Identity ID</th>
                <th className='px-4 py-3'>Estado</th>
                <th className='px-4 py-3'>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className='px-4 py-8 text-center text-sm text-slate-500'>
                    Cargando usuarios...
                  </td>
                </tr>
              )}

              {filteredUsers.map(user => (
                <tr key={user.id} className='border-t border-slate-200 text-slate-800'>
                  <td className='px-4 py-3 font-medium'>{user.rut}</td>
                  <td className='px-4 py-3'>{user.nombres} {user.apellidos}</td>
                  <td className='px-4 py-3'>{user.email}</td>
                  <td className='px-4 py-3'>{user.rol || '-'}</td>
                  <td className='max-w-[260px] truncate px-4 py-3 font-mono text-xs'>{user.identityUserId}</td>
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
                          className='inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50'
                        >
                          <Pencil className='size-3' />
                          Editar
                        </a>
                        <button
                          type='button'
                          onClick={() => handleDelete(user)}
                          className='inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50'
                        >
                          <Trash2 className='size-3' />
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
                  <td colSpan={7} className='px-4 py-8 text-center text-sm text-slate-500'>
                    No hay usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default UsersListPage
