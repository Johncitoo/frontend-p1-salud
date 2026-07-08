import { CalendarClock, Stethoscope } from 'lucide-react'

import {
  normalizarEspecialidad,
  TODAS_ESPECIALIDADES_KEY,
  useSeguimientoPendientes,
} from '@/features/seguimiento/useSeguimientoPendientes'

type SeguimientoAgendaPanelProps = {
  onSelectPaciente: (pacienteId: string) => void
}

// Panel compacto de "pacientes de seguimiento" para usar al lado del formulario
// de crear visita: al tocar un paciente, precarga el campo Paciente de esa
// visita en vez de tener que ir a buscarlo de nuevo por nombre/RUT. Reutiliza
// la misma fuente de datos que /seguimiento (ver useSeguimientoPendientes) para
// no duplicar la lógica de filtrado por especialidad.
const SeguimientoAgendaPanel = ({ onSelectPaciente }: SeguimientoAgendaPanelProps) => {
  const { filas, opcionesEspecialidad, especialidadFiltro, setEspecialidadFiltro, isLoading, error } =
    useSeguimientoPendientes()

  return (
    <aside className='flex flex-col rounded-xl border border-[#9CBFC1]/35 bg-[#203C50]/92 p-5 shadow-xl shadow-black/10'>
      <div className='mb-3 flex items-center gap-2'>
        <CalendarClock className='size-5 text-[#9CBFC1]' />
        <h2 className='m-0 text-lg font-semibold text-white'>Pacientes de seguimiento</h2>
      </div>

      <select
        value={especialidadFiltro}
        onChange={event => setEspecialidadFiltro(event.target.value)}
        className='mb-3 h-10 w-full rounded-lg border border-[#6f929b]/45 !bg-[#173344] px-3 text-sm font-semibold text-white shadow-inner shadow-black/5 outline-none transition focus:border-[#9CBFC1] focus:!bg-[#142f3f] focus:ring-2 focus:ring-[#9CBFC1]/15'
      >
        <option value={TODAS_ESPECIALIDADES_KEY}>Todas las especialidades</option>
        {opcionesEspecialidad.map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {error && <p className='mb-3 text-xs font-semibold text-red-300'>{error}</p>}

      <div className='max-h-[420px] space-y-2 overflow-y-auto pr-1'>
        {isLoading && <p className='text-sm text-[#D9D9D9]'>Cargando...</p>}

        {!isLoading && filas.length === 0 && (
          <p className='text-sm text-[#D9D9D9]'>No hay pacientes esperando una visita de seguimiento.</p>
        )}

        {filas.map(({ alerta, paciente }) => (
          <button
            key={alerta.id}
            type='button'
            onClick={() => paciente && onSelectPaciente(paciente.id)}
            disabled={!paciente}
            className='block w-full rounded-lg border border-[#9CBFC1]/24 bg-[#173344]/60 px-3 py-2.5 text-left transition hover:border-[#9CBFC1]/60 hover:bg-[#284B63]/60 disabled:opacity-50'
          >
            <span className='block text-sm font-semibold text-white'>
              {paciente ? `${paciente.nombres} ${paciente.apellidos}` : 'Paciente no encontrado'}
            </span>
            <span className='mt-1 flex items-center gap-1.5 text-xs font-medium text-[#9CBFC1]'>
              <Stethoscope className='size-3.5' />
              {normalizarEspecialidad(alerta.especialidad).label}
            </span>
            <span className='mt-1 line-clamp-2 block text-xs text-[#D9D9D9]'>{alerta.mensaje}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

export default SeguimientoAgendaPanel