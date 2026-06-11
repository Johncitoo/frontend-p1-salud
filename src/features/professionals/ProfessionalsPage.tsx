import { FormEvent, useEffect, useState } from 'react'
import {
  ArrowLeft,
  BriefcaseMedical,
  Pencil,
  Plus,
  Save,
  Search,
  Stethoscope,
  Trash2,
  UserCog,
  X,
} from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'

// ---- tipos ----
type Professional = {
  id: string
  usuarioId: string
  profesion: string
  numeroRegistro: string | null
  activo: boolean
}

type AvailableUser = {
  id: string
  rut: string
  nombres: string
  apellidos: string
  email: string
  rol: string
}

type Specialty = {
  id: string
  nombre: string
  descripcion: string | null
}

type ZoneRow = {
  id: string
  nombre: string
  comuna: string
  region: string
  activa: boolean
}

type ProfessionalForm = {
  usuarioId: string
  profesion: string
  numeroRegistro: string
  especialidadIds: string[]
  zonaIds: string[]
}

const emptyProfessionalForm: ProfessionalForm = {
  usuarioId: '',
  profesion: '',
  numeroRegistro: '',
  especialidadIds: [],
  zonaIds: [],
}

// ---- componente ----
type ProfessionalsPageProps = {
  editId?: string
}

const ProfessionalsPage = ({ editId }: ProfessionalsPageProps) => {
  const session = useCurrentUser()
  const canWrite = session.rol === 'ADMIN' || session.rol === 'COORDINADOR' || session.rol === 'SUPERVISOR'
  const canDelete = session.rol === 'ADMIN' || session.rol === 'SUPERVISOR'

  // estado general
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [zones, setZones] = useState<ZoneRow[]>([])
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // búsqueda
  const [searchQuery, setSearchQuery] = useState('')

  // formulario crear profesional
  const [profForm, setProfForm] = useState<ProfessionalForm>(emptyProfessionalForm)

  // edición inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ProfessionalForm>(emptyProfessionalForm)

  // especialidad nueva
  const [newSpecialtyName, setNewSpecialtyName] = useState('')
  const [editingSpecialtyId, setEditingSpecialtyId] = useState<string | null>(null)
  const [editSpecialtyName, setEditSpecialtyName] = useState('')

  // asignación
  const [assignProfId, setAssignProfId] = useState<string | null>(null)
  const [assignZonaId, setAssignZonaId] = useState('')
  const [assignEspecialidadId, setAssignEspecialidadId] = useState('')

  // ---- carga inicial ----
  const loadData = () => {
    setIsLoading(true)
    setError('')

    Promise.all([
      apiGet<Professional[]>('/profesionales'),
      apiGet<AvailableUser[]>('/profesionales/usuarios-disponibles'),
      apiGet<Specialty[]>('/profesionales/especialidades'),
      apiGet<ZoneRow[]>('/zonas'),
    ])
      .then(([profs, users, specs, zns]) => {
        setProfessionals(profs)
        setAvailableUsers(users)
        setSpecialties(specs)
        setZones(zns)

        if (editId) {
          const prof = profs.find(p => p.id === editId)
          if (prof) {
            setEditingId(prof.id)
            setEditForm({
              usuarioId: prof.usuarioId,
              profesion: prof.profesion,
              numeroRegistro: prof.numeroRegistro ?? '',
              especialidadIds: [],
              zonaIds: [],
            })
          }
        }
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Error al cargar datos'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [editId])

  const clearMessages = () => {
    setError('')
    setSuccessMsg('')
  }

  const toggleFormValue = (key: 'especialidadIds' | 'zonaIds', value: string) => {
    setProfForm(current => {
      const selected = current[key]
      return {
        ...current,
        [key]: selected.includes(value)
          ? selected.filter(currentValue => currentValue !== value)
          : [...selected, value],
      }
    })
  }

  // ---- CRUD profesional ----
  const handleCreateProfessional = async (e: FormEvent) => {
    e.preventDefault()
    if (!profForm.usuarioId.trim() || !profForm.profesion.trim()) {
      setError('Completa usuarioId y profesión.')
      return
    }
    clearMessages()
    try {
      await apiPost('/profesionales', {
        usuarioId: profForm.usuarioId,
        profesion: profForm.profesion.trim(),
        numeroRegistro: profForm.numeroRegistro.trim() || null,
        especialidadIds: profForm.especialidadIds,
        zonaIds: profForm.zonaIds,
      })
      setProfForm(emptyProfessionalForm)
      setSuccessMsg('Profesional creado correctamente.')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear profesional')
    }
  }

  const startEditing = (prof: Professional) => {
    setEditingId(prof.id)
    setEditForm({
      usuarioId: prof.usuarioId,
      profesion: prof.profesion,
      numeroRegistro: prof.numeroRegistro ?? '',
      especialidadIds: [],
      zonaIds: [],
    })
    clearMessages()
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm(emptyProfessionalForm)
    if (editId) window.location.href = '/professionals'
  }

  const handleUpdateProfessional = async (id: string) => {
    if (!editForm.usuarioId.trim() || !editForm.profesion.trim()) {
      setError('Completa usuarioId y profesión.')
      return
    }
    clearMessages()
    try {
      await apiPatch(`/profesionales/${id}`, {
        usuarioId: editForm.usuarioId,
        profesion: editForm.profesion.trim(),
        numeroRegistro: editForm.numeroRegistro.trim() || null,
      })
      setEditingId(null)
      setEditForm(emptyProfessionalForm)
      setSuccessMsg('Profesional actualizado.')
      loadData()
      if (editId) window.location.href = '/professionals'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar profesional')
    }
  }

  const handleDeleteProfessional = async (prof: Professional) => {
    if (!window.confirm(`¿Eliminar profesional ${prof.profesion}?`)) return
    clearMessages()
    try {
      await apiDelete(`/profesionales/${prof.id}`)
      setSuccessMsg('Profesional eliminado.')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar profesional')
    }
  }

  // ---- CRUD especialidad ----
  const handleCreateSpecialty = async () => {
    if (!newSpecialtyName.trim()) return
    clearMessages()
    try {
      await apiPost('/profesionales/especialidades', { nombre: newSpecialtyName.trim() })
      setNewSpecialtyName('')
      setSuccessMsg('Especialidad creada.')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear especialidad')
    }
  }

  const handleUpdateSpecialty = async (id: string) => {
    if (!editSpecialtyName.trim()) return
    clearMessages()
    try {
      await apiPatch(`/profesionales/especialidades/${id}`, { nombre: editSpecialtyName.trim() })
      setEditingSpecialtyId(null)
      setEditSpecialtyName('')
      setSuccessMsg('Especialidad actualizada.')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar especialidad')
    }
  }

  const handleDeleteSpecialty = async (spec: Specialty) => {
    if (!window.confirm(`¿Eliminar especialidad ${spec.nombre}?`)) return
    clearMessages()
    try {
      await apiDelete(`/profesionales/especialidades/${spec.id}`)
      setSuccessMsg('Especialidad eliminada.')
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar especialidad')
    }
  }

  // ---- asignación ----
  const handleAssign = async (profId: string) => {
    if (!assignZonaId && !assignEspecialidadId) {
      setError('Selecciona al menos una zona o especialidad para asignar.')
      return
    }
    clearMessages()
    try {
      await apiPost(`/profesionales/${profId}/asignaciones`, {
        ...(assignZonaId ? { zonaId: assignZonaId } : {}),
        ...(assignEspecialidadId ? { especialidadId: assignEspecialidadId } : {}),
      })
      setAssignProfId(null)
      setAssignZonaId('')
      setAssignEspecialidadId('')
      setSuccessMsg('Asignación registrada correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al asignar')
    }
  }

  // ---- filtrado ----
  const filteredProfessionals = searchQuery.trim()
    ? professionals.filter(p =>
        p.profesion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.usuarioId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : professionals

  // ---- render ----
  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8 text-left'>
      <section className='mx-auto max-w-7xl space-y-6'>
        {/* header */}
        <header>
          <a
            href='/patients'
            className='mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900'
          >
            <ArrowLeft className='size-4' />
            Volver a pacientes
          </a>
          <p className='text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>
            Profesionales y asignación
          </p>
          <h1 className='m-0 text-3xl font-semibold text-slate-900'>Profesionales y especialidades</h1>
          <p className='mt-2 text-sm text-slate-600'>
            CRUD completo de profesionales de salud, especialidades y asignación a zonas.
          </p>
        </header>

        {/* mensajes */}
        {error && (
          <div className='rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>
        )}
        {successMsg && (
          <div className='rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
            {successMsg}
          </div>
        )}

        {isLoading ? (
          <p className='py-10 text-center text-sm text-slate-500'>Cargando profesionales...</p>
        ) : (
          <>
            {/* ---- registrar profesional ---- */}
            {canWrite && (
              <form onSubmit={handleCreateProfessional} className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='mb-3 flex items-center gap-2'>
                  <BriefcaseMedical className='size-5 text-emerald-700' />
                  <h2 className='text-lg font-semibold text-slate-900'>Registrar profesional</h2>
                </div>
                <p className='mb-4 text-sm text-slate-600'>
                  Selecciona un usuario local con rol PROFESIONAL y completa sus datos clinicos.
                </p>

                <div className='grid gap-4 lg:grid-cols-2'>
                  <label className='block'>
                    <span className='text-sm font-semibold text-slate-700'>Usuario profesional</span>
                    <select
                      value={profForm.usuarioId}
                      onChange={e => setProfForm(p => ({ ...p, usuarioId: e.target.value }))}
                      required
                      className='mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                    >
                      <option value=''>Selecciona un usuario</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.nombres} {user.apellidos} - {user.email} ({user.rut})
                        </option>
                      ))}
                    </select>
                    {availableUsers.length === 0 && (
                      <span className='mt-1 block text-xs text-amber-700'>
                        No hay usuarios con rol PROFESIONAL disponibles. Crea el usuario primero en Usuarios.
                      </span>
                    )}
                  </label>

                  <label className='block'>
                    <span className='text-sm font-semibold text-slate-700'>Profesion</span>
                    <select
                      value={profForm.profesion}
                      onChange={e => setProfForm(p => ({ ...p, profesion: e.target.value }))}
                      required
                      className='mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                    >
                      <option value=''>Seleccionar especialidad</option>
                      {specialties.map(s => (
                        <option key={s.id} value={s.nombre}>{s.nombre}</option>
                      ))}
                    </select>
                  </label>

                  <label className='block'>
                    <span className='text-sm font-semibold text-slate-700'>Numero de registro</span>
                    <input
                      value={profForm.numeroRegistro}
                      onChange={e => setProfForm(p => ({ ...p, numeroRegistro: e.target.value }))}
                      placeholder='Opcional'
                      className='mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                    />
                  </label>

                  <label className='block'>
                    <span className='text-sm font-semibold text-slate-700'>Zonas de cobertura</span>
                    <select
                      value=''
                      onChange={e => {
                        if (e.target.value) toggleFormValue('zonaIds', e.target.value)
                      }}
                      className='mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                    >
                      <option value=''>Agregar zona opcional</option>
                      {zones.filter(z => z.activa && !profForm.zonaIds.includes(z.id)).map(zone => (
                        <option key={zone.id} value={zone.id}>
                          {zone.nombre} - {zone.comuna}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className='mt-4 grid gap-4 lg:grid-cols-2'>
                  <div>
                    <p className='mb-2 text-sm font-semibold text-slate-700'>Especialidades</p>
                    <div className='flex flex-wrap gap-2'>
                      {specialties.map(specialty => (
                        <label
                          key={specialty.id}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            profForm.especialidadIds.includes(specialty.id)
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type='checkbox'
                            checked={profForm.especialidadIds.includes(specialty.id)}
                            onChange={() => toggleFormValue('especialidadIds', specialty.id)}
                            className='size-3.5 rounded border-slate-300 text-emerald-700'
                          />
                          {specialty.nombre}
                        </label>
                      ))}
                      {specialties.length === 0 && (
                        <span className='text-xs text-slate-500'>No hay especialidades creadas todavia.</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className='mb-2 text-sm font-semibold text-slate-700'>Zonas seleccionadas</p>
                    <div className='flex flex-wrap gap-2'>
                      {profForm.zonaIds.map(zonaId => {
                        const zone = zones.find(z => z.id === zonaId)
                        return (
                          <button
                            key={zonaId}
                            type='button'
                            onClick={() => toggleFormValue('zonaIds', zonaId)}
                            className='inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800'
                          >
                            {zone ? `${zone.nombre} - ${zone.comuna}` : zonaId}
                            <X className='size-3' />
                          </button>
                        )
                      })}
                      {profForm.zonaIds.length === 0 && (
                        <span className='text-xs text-slate-500'>Puedes asignarlas ahora o despues desde el boton Asignar.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className='mt-5 flex justify-end'>
                  <button
                    type='submit'
                    disabled={availableUsers.length === 0}
                    className='inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    <Plus className='size-4' />
                    Registrar profesional
                  </button>
                </div>
              </form>
            )}

            {/* ---- tabla profesionales ---- */}
            <div className='rounded-xl border border-slate-200 bg-white shadow-sm'>
              <div className='flex items-center justify-between border-b border-slate-200 px-5 py-3'>
                <h2 className='text-lg font-semibold text-slate-900'>Profesionales registrados</h2>
                <div className='flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5'>
                  <Search className='size-4 text-slate-400' />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder='Buscar por profesión o usuarioId...'
                    className='w-56 border-none bg-transparent text-sm outline-none placeholder:text-slate-400'
                  />
                </div>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[800px] text-left text-sm'>
                  <thead className='bg-slate-50'>
                    <tr className='text-xs uppercase tracking-wide text-slate-600'>
                      <th className='px-5 py-3'>Profesión</th>
                      <th className='px-5 py-3'>Usuario ID</th>
                      <th className='px-5 py-3'>N° Registro</th>
                      <th className='px-5 py-3'>Estado</th>
                      <th className='px-5 py-3'>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfessionals.map(prof => (
                      <tr key={prof.id} className='border-t border-slate-100 hover:bg-slate-50'>
                        {editingId === prof.id ? (
                          <>
                            <td className='px-5 py-2'>
                              <select
                                value={editForm.profesion}
                                onChange={e => setEditForm(f => ({ ...f, profesion: e.target.value }))}
                                className='w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-emerald-500'
                              >
                                <option value=''>Seleccionar</option>
                                {specialties.map(s => (
                                  <option key={s.id} value={s.nombre}>{s.nombre}</option>
                                ))}
                              </select>
                            </td>
                            <td className='px-5 py-2'>
                              <span className='block max-w-[220px] truncate font-mono text-xs text-slate-500'>
                                {editForm.usuarioId}
                              </span>
                            </td>
                            <td className='px-5 py-2'>
                              <input
                                value={editForm.numeroRegistro}
                                onChange={e => setEditForm(f => ({ ...f, numeroRegistro: e.target.value }))}
                                placeholder='Opcional'
                                className='w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-emerald-500'
                              />
                            </td>
                            <td className='px-5 py-2'>
                              <span className='rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800'>
                                Editando
                              </span>
                            </td>
                            <td className='px-5 py-2'>
                              <div className='flex items-center gap-2'>
                                <button
                                  onClick={() => handleUpdateProfessional(prof.id)}
                                  className='inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-800'
                                >
                                  <Save className='size-3' /> Guardar
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className='inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100'
                                >
                                  <X className='size-3' /> Cancelar
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className='px-5 py-3 font-medium text-slate-900'>{prof.profesion}</td>
                            <td className='max-w-[200px] truncate px-5 py-3 font-mono text-xs text-slate-500'>
                              {prof.usuarioId}
                            </td>
                            <td className='px-5 py-3 text-slate-500'>{prof.numeroRegistro || '—'}</td>
                            <td className='px-5 py-3'>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  prof.activo
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {prof.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className='px-5 py-3'>
                              <div className='flex items-center gap-1.5'>
                                {canWrite && (
                                  <button
                                    onClick={() => startEditing(prof)}
                                    className='inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50'
                                  >
                                    <Pencil className='size-3' />
                                    Editar
                                  </button>
                                )}
                                {canWrite && (
                                  <button
                                    onClick={() => setAssignProfId(assignProfId === prof.id ? null : prof.id)}
                                    className='inline-flex items-center gap-1 rounded-md border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50'
                                  >
                                    <UserCog className='size-3' />
                                    Asignar
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteProfessional(prof)}
                                    className='inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50'
                                  >
                                    <Trash2 className='size-3' />
                                    Eliminar
                                  </button>
                                )}
                                {!canWrite && !canDelete && (
                                  <span className='text-xs text-slate-400'>Solo lectura</span>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}

                    {/* panel de asignación expandible */}
                    {assignProfId && (
                      <tr key={`assign-${assignProfId}`} className='border-t-2 border-blue-200 bg-blue-50/50'>
                        <td colSpan={5} className='px-5 py-4'>
                          <div className='flex flex-wrap items-end gap-4'>
                            <label className='flex flex-col gap-1'>
                              <span className='text-xs font-semibold text-slate-700'>Zona</span>
                              <select
                                value={assignZonaId}
                                onChange={e => setAssignZonaId(e.target.value)}
                                className='rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500'
                              >
                                <option value=''>— Sin zona —</option>
                                {zones.filter(z => z.activa).map(z => (
                                  <option key={z.id} value={z.id}>
                                    {z.nombre} ({z.comuna})
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className='flex flex-col gap-1'>
                              <span className='text-xs font-semibold text-slate-700'>Especialidad</span>
                              <select
                                value={assignEspecialidadId}
                                onChange={e => setAssignEspecialidadId(e.target.value)}
                                className='rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500'
                              >
                                <option value=''>— Sin especialidad —</option>
                                {specialties.map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.nombre}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              onClick={() => handleAssign(assignProfId)}
                              className='inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800'
                            >
                              <Save className='size-4' />
                              Guardar asignación
                            </button>
                            <button
                              onClick={() => { setAssignProfId(null); setAssignZonaId(''); setAssignEspecialidadId('') }}
                              className='rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {filteredProfessionals.length === 0 && !assignProfId && (
                      <tr>
                        <td colSpan={5} className='px-5 py-10 text-center text-sm text-slate-500'>
                          No hay profesionales registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ---- sección especialidades ---- */}
            <div className='grid gap-6 lg:grid-cols-2'>
              {/* crear / editar especialidad */}
              {canWrite && (
                <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
                  <div className='mb-3 flex items-center gap-2'>
                    <Stethoscope className='size-5 text-emerald-700' />
                    <h2 className='text-lg font-semibold text-slate-900'>
                      {editingSpecialtyId ? 'Editar especialidad' : 'Nueva especialidad'}
                    </h2>
                  </div>
                  <div className='flex gap-2'>
                    <input
                      value={editingSpecialtyId ? editSpecialtyName : newSpecialtyName}
                      onChange={e =>
                        editingSpecialtyId
                          ? setEditSpecialtyName(e.target.value)
                          : setNewSpecialtyName(e.target.value)
                      }
                      placeholder='Nombre de la especialidad'
                      className='flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          editingSpecialtyId
                            ? handleUpdateSpecialty(editingSpecialtyId)
                            : handleCreateSpecialty()
                        }
                      }}
                    />
                    {editingSpecialtyId ? (
                      <>
                        <button
                          onClick={() => handleUpdateSpecialty(editingSpecialtyId)}
                          className='rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800'
                        >
                          <Save className='size-4' />
                        </button>
                        <button
                          onClick={() => { setEditingSpecialtyId(null); setEditSpecialtyName('') }}
                          className='rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50'
                        >
                          <X className='size-4' />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleCreateSpecialty}
                        className='rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800'
                      >
                        <Plus className='size-4' />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* lista especialidades */}
              <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='mb-3 flex items-center gap-2'>
                  <Stethoscope className='size-5 text-slate-700' />
                  <h2 className='text-lg font-semibold text-slate-900'>Especialidades</h2>
                  <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600'>
                    {specialties.length}
                  </span>
                </div>
                {specialties.length === 0 ? (
                  <p className='py-4 text-center text-sm text-slate-500'>No hay especialidades registradas.</p>
                ) : (
                  <ul className='divide-y divide-slate-100'>
                    {specialties.map(spec => (
                      <li key={spec.id} className='flex items-center justify-between py-2.5'>
                        <span className='text-sm font-medium text-slate-800'>{spec.nombre}</span>
                        {canWrite && (
                          <div className='flex items-center gap-1.5'>
                            <button
                              onClick={() => {
                                setEditingSpecialtyId(spec.id)
                                setEditSpecialtyName(spec.nombre)
                                clearMessages()
                              }}
                              className='rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                              title='Editar especialidad'
                            >
                              <Pencil className='size-3.5' />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteSpecialty(spec)}
                                className='rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600'
                                title='Eliminar especialidad'
                              >
                                <Trash2 className='size-3.5' />
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

export default ProfessionalsPage
