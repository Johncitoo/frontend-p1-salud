import { useEffect, useMemo, useState } from 'react'

import { Search, UserPlus } from 'lucide-react'

import { useCurrentUser } from '@/features/auth/AuthSessionContext'
import { apiGet } from '@/lib/api'

type PatientRow = {
  id: string
  rut: string
  nombres: string
  apellidos: string
  fechaNacimiento: string | null
  sexo: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
}

const formatDate = (value: string | null) => {
  if (!value) return '-'

  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CL')
}

const PatientsListPage = () => {
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const session = useCurrentUser()
  const canCreatePatients = session.rol === 'ADMIN' || session.rol === 'COORDINADOR' || session.rol === 'PROFESIONAL'

  useEffect(() => {
    let isMounted = true

    apiGet<PatientRow[]>('/pacientes')
      .then(response => {
        if (isMounted) setPatients(response)
      })
      .catch(fetchError => {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'No fue posible cargar pacientes.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return patients

    return patients.filter(patient => {
      const fullName = `${patient.nombres} ${patient.apellidos}`.toLowerCase()

      return (
        patient.rut.toLowerCase().includes(normalizedQuery) ||
        fullName.includes(normalizedQuery) ||
        (patient.telefono || '').toLowerCase().includes(normalizedQuery) ||
        (patient.email || '').toLowerCase().includes(normalizedQuery) ||
        (patient.direccion || '').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [patients, query])

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-7xl'>
        <header className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
          <div>
            <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>Gestión clínica</p>
            <h1 className='m-0 text-3xl font-semibold text-slate-900'>Listado de pacientes</h1>
            <p className='mt-2 text-sm text-slate-600'>
              Consulta y encuentra rápidamente la información de atención registrada.
            </p>
          </div>
          {canCreatePatients ? (
            <a
              href='/patients/new'
              className='inline-flex items-center justify-center gap-2 rounded-xl bg-[#3C6E71] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#284B63]'
            >
              <UserPlus className='size-4' />
              Registrar paciente
            </a>
          ) : null}
        </header>

        <div className='mb-4 flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-[#3C6E71] focus-within:ring-2 focus-within:ring-[#3C6E71]/15'>
          <Search className='size-4 text-slate-500' />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder='Buscar por RUT, nombre, telefono, email o direccion'
            className='w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400'
          />
        </div>

        {error && (
          <div className='mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        <div className='overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <table className='w-full min-w-[960px] text-left text-sm'>
            <thead className='bg-slate-100'>
              <tr className='text-xs uppercase tracking-wide text-slate-600'>
                <th className='px-4 py-3'>RUT</th>
                <th className='px-4 py-3'>Nombres</th>
                <th className='px-4 py-3'>Apellidos</th>
                <th className='px-4 py-3'>Nacimiento</th>
                <th className='px-4 py-3'>Sexo</th>
                <th className='px-4 py-3'>Telefono</th>
                <th className='px-4 py-3'>Email</th>
                <th className='px-4 py-3'>Direccion</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className='px-4 py-8 text-center text-sm text-slate-500'>
                    Cargando pacientes...
                  </td>
                </tr>
              )}

              {filteredPatients.map(patient => (
                <tr 
                  key={patient.id} 
                  onClick={() => window.location.href = `/patients/${patient.id}`}
                  className='border-t border-slate-200 text-slate-800 transition hover:bg-slate-100 cursor-pointer'
                >
                  <td className='px-4 py-3 font-medium text-[#284B63] hover:underline'>{patient.rut}</td>
                  <td className='px-4 py-3'>{patient.nombres}</td>
                  <td className='px-4 py-3'>{patient.apellidos}</td>
                  <td className='px-4 py-3'>{formatDate(patient.fechaNacimiento)}</td>
                  <td className='px-4 py-3'>{patient.sexo || '-'}</td>
                  <td className='px-4 py-3'>{patient.telefono || '-'}</td>
                  <td className='px-4 py-3'>{patient.email || '-'}</td>
                  <td className='px-4 py-3'>{patient.direccion || '-'}</td>
                </tr>
              ))}

              {!isLoading && filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={8} className='px-4 py-8 text-center text-sm text-slate-500'>
                    No hay pacientes que coincidan con la busqueda.
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

export default PatientsListPage
