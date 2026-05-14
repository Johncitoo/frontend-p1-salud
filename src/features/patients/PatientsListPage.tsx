import { useMemo, useState } from 'react'

import { Search } from 'lucide-react'

type PatientRow = {
  id: string
  rut: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string | null
  sexo: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  zona: string | null
}

const mockPatients: PatientRow[] = [
  {
    id: '1',
    rut: '14.223.889-7',
    nombres: 'Elena Maria',
    apellidos: 'Rojas Fuentes',
    fecha_nacimiento: '1957-09-12',
    sexo: 'FEMENINO',
    telefono: '+56 9 7812 4432',
    email: 'elena.rojas@correo.cl',
    direccion: 'Pasaje Los Aromos 145, Casa 4',
    zona: 'Illapel Centro',
  },
  {
    id: '2',
    rut: '9.334.100-2',
    nombres: 'Luis Alberto',
    apellidos: 'Gonzalez Vega',
    fecha_nacimiento: '1948-02-03',
    sexo: 'MASCULINO',
    telefono: '+56 9 6671 1020',
    email: 'luis.gonzalez@correo.cl',
    direccion: 'Avenida La Paz 891',
    zona: 'Sector Norte',
  },
  {
    id: '3',
    rut: '17.005.341-9',
    nombres: 'Patricia Andrea',
    apellidos: 'Mella Cortes',
    fecha_nacimiento: '1972-11-20',
    sexo: 'FEMENINO',
    telefono: '+56 9 5510 0044',
    email: null,
    direccion: 'Villa El Bosque 227',
    zona: 'Sector Oriente',
  },
  {
    id: '4',
    rut: '12.778.600-5',
    nombres: 'Ramon Esteban',
    apellidos: 'Soto Araya',
    fecha_nacimiento: null,
    sexo: null,
    telefono: '+56 9 4422 3011',
    email: 'ramon.soto@correo.cl',
    direccion: null,
    zona: null,
  },
]

const formatDate = (value: string | null) => {
  if (!value) return '-'

  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CL')
}

const PatientsListPage = () => {
  const [query, setQuery] = useState('')

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return mockPatients

    return mockPatients.filter(patient => {
      const fullName = `${patient.nombres} ${patient.apellidos}`.toLowerCase()

      return (
        patient.rut.toLowerCase().includes(normalizedQuery) ||
        fullName.includes(normalizedQuery) ||
        (patient.telefono || '').toLowerCase().includes(normalizedQuery) ||
        (patient.email || '').toLowerCase().includes(normalizedQuery) ||
        (patient.zona || '').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [query])

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-7xl'>
        <header className='mb-6 flex items-end justify-between gap-4'>
          <div>
            <h1 className='m-0 text-3xl font-semibold text-slate-900'>Listado de pacientes</h1>
            <p className='mt-2 text-sm text-slate-600'>
              Vista basada en tabla <code>pacientes</code> de <code>BD/bd.sql</code>.
            </p>
          </div>
        </header>

        <div className='mb-4 flex w-full items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2'>
          <Search className='size-4 text-slate-500' />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder='Buscar por RUT, nombre, telefono, email o zona'
            className='w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400'
          />
        </div>

        <div className='overflow-x-auto rounded-md border border-slate-300 bg-white'>
          <table className='w-full min-w-[1060px] text-left text-sm'>
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
                <th className='px-4 py-3'>Zona</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map(patient => (
                <tr key={patient.id} className='border-t border-slate-200 text-slate-800'>
                  <td className='px-4 py-3 font-medium'>{patient.rut}</td>
                  <td className='px-4 py-3'>{patient.nombres}</td>
                  <td className='px-4 py-3'>{patient.apellidos}</td>
                  <td className='px-4 py-3'>{formatDate(patient.fecha_nacimiento)}</td>
                  <td className='px-4 py-3'>{patient.sexo || '-'}</td>
                  <td className='px-4 py-3'>{patient.telefono || '-'}</td>
                  <td className='px-4 py-3'>{patient.email || '-'}</td>
                  <td className='px-4 py-3'>{patient.direccion || '-'}</td>
                  <td className='px-4 py-3'>{patient.zona || '-'}</td>
                </tr>
              ))}

              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={9} className='px-4 py-8 text-center text-sm text-slate-500'>
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
