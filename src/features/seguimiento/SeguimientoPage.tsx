import { CalendarClock, CheckCircle2 } from 'lucide-react'

import { normalizarEspecialidad, TODAS_ESPECIALIDADES_KEY, useSeguimientoPendientes } from './useSeguimientoPendientes'

const SeguimientoPage = () => {
  const {
    filas,
    opcionesEspecialidad,
    especialidadFiltro,
    setEspecialidadFiltro,
    marcarResuelta,
    resolvingId,
    isLoading,
    error,
  } = useSeguimientoPendientes()

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-7xl'>
        <header className='mb-6'>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#3C6E71]'>Gestión clínica</p>
          <h1 className='m-0 text-3xl font-semibold text-slate-900'>Pacientes de seguimiento</h1>
          <p className='mt-2 text-sm text-slate-600'>
            Pacientes que un profesional marcó como frágiles durante una visita y necesitan una visita de continuidad.
          </p>
        </header>

        {error && (
          <div className='mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        )}

        <div className='mb-4 flex items-center gap-2'>
          <label htmlFor='filtro-especialidad' className='text-xs font-semibold uppercase tracking-wide text-slate-600'>
            Especialidad
          </label>
          <select
            id='filtro-especialidad'
            value={especialidadFiltro}
            onChange={event => setEspecialidadFiltro(event.target.value)}
            className='rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#3C6E71] focus:ring-2 focus:ring-[#3C6E71]/15'
          >
            <option value={TODAS_ESPECIALIDADES_KEY}>Todas las especialidades</option>
            {opcionesEspecialidad.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className='overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <table className='w-full min-w-[960px] text-left text-sm'>
            <thead className='bg-slate-100'>
              <tr className='text-xs uppercase tracking-wide text-slate-600'>
                <th className='px-4 py-3'>Paciente</th>
                <th className='px-4 py-3'>RUT</th>
                <th className='px-4 py-3'>Especialidad</th>
                <th className='px-4 py-3'>Motivo</th>
                <th className='px-4 py-3'>Prioridad</th>
                <th className='px-4 py-3'>Solicitado</th>
                <th className='px-4 py-3'>Acción</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className='px-4 py-8 text-center text-sm text-slate-500'>
                    Cargando pacientes de seguimiento...
                  </td>
                </tr>
              )}

              {filas.map(({ alerta, paciente }) => (
                <tr key={alerta.id} className='border-t border-slate-200 text-slate-800'>
                  <td className='px-4 py-3 font-medium text-[#284B63]'>
                    {paciente ? (
                      <a href={`/patients/${paciente.id}`} className='hover:underline'>
                        {paciente.nombres} {paciente.apellidos}
                      </a>
                    ) : (
                      'Paciente no encontrado'
                    )}
                  </td>
                  <td className='px-4 py-3'>{paciente?.rut ?? '-'}</td>
                  <td className='px-4 py-3'>{normalizarEspecialidad(alerta.especialidad).label}</td>
                  <td className='px-4 py-3'>{alerta.mensaje}</td>
                  <td className='px-4 py-3'>
                    <span className='rounded-md bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-800'>
                      {alerta.prioridad}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-slate-500'>{new Date(alerta.createdAt).toLocaleString('es-CL')}</td>
                  <td className='px-4 py-3'>
                    <button
                      type='button'
                      onClick={() => marcarResuelta(alerta.id)}
                      disabled={resolvingId === alerta.id}
                      className='inline-flex items-center gap-1.5 rounded-lg border border-[#3C6E71] px-3 py-1.5 text-xs font-semibold text-[#3C6E71] transition hover:bg-[#3C6E71] hover:text-white disabled:opacity-50'
                    >
                      <CheckCircle2 className='size-4' />
                      {resolvingId === alerta.id ? 'Guardando...' : 'Marcar agendada'}
                    </button>
                  </td>
                </tr>
              ))}

              {!isLoading && filas.length === 0 && (
                <tr>
                  <td colSpan={7} className='px-4 py-10 text-center text-sm text-slate-500'>
                    <CalendarClock className='mx-auto mb-2 size-6 text-slate-400' />
                    No hay pacientes esperando una visita de seguimiento.
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

export default SeguimientoPage