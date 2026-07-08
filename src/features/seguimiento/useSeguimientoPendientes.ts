import { useEffect, useMemo, useState } from 'react'

import { apiGet, apiPatch } from '@/lib/api'

export type AlertaContinuidad = {
  id: string
  tipo: string
  pacienteId: string
  visitaId: string | null
  mensaje: string
  prioridad: string
  estado: string
  createdAt: string
  // Resuelta por el backend desde la profesión del profesional que hizo la
  // visita (visita.profesional_salud_id) — no es un campo guardado en la
  // alerta. Puede venir null si la alerta no tiene visita asociada.
  especialidad: string | null
}

export type PatientRow = {
  id: string
  rut: string
  nombres: string
  apellidos: string
}

// Estados de una alerta (ver backend-p1-salud/src/alertas) que todavía requieren
// acción: mientras el coordinador no la marque resuelta, el paciente sigue
// apareciendo en esta lista. Si el profesional en la visita indicó que el
// paciente NO necesita seguimiento, nunca se crea la alerta (ver
// frontappsalud/App.tsx handleSolicitarContinuidad), así que no hay nada que
// filtrar para ese caso: simplemente no existe.
const ESTADOS_PENDIENTES = ['ABIERTA', 'EN_REVISION']

export const TODAS_ESPECIALIDADES_KEY = 'TODAS'
const SIN_ESPECIALIDAD_KEY = '__SIN_ESPECIALIDAD__'

// La profesión del profesional (ver /profesionales) es texto libre, no un
// catálogo controlado: la misma especialidad puede venir como "Enfermería",
// "ENFERMERIA" o "enfermeria". Se agrupa por una clave normalizada (sin
// tildes, mayúsculas) para no mostrar la misma especialidad duplicada en el
// filtro, aunque el dato de origen no esté prolijo.
export function normalizarEspecialidad(valor: string | null | undefined): { key: string; label: string } {
  const raw = (valor ?? '').trim()
  if (!raw) return { key: SIN_ESPECIALIDAD_KEY, label: 'Sin especialidad' }

  const sinTildes = raw.normalize('NFD').replace(new RegExp(String.fromCharCode(91, 92, 117, 48, 51, 48, 48, 45, 92, 117, 48, 51, 54, 102, 93), 'g'), '')
  return {
    key: sinTildes.toUpperCase(),
    label: sinTildes.charAt(0).toUpperCase() + sinTildes.slice(1).toLowerCase(),
  }
}

// Centraliza la carga y el filtrado de "pacientes de seguimiento" (alertas de
// continuidad pendientes) para que la lista completa (/seguimiento) y el panel
// compacto de la Agenda muestren siempre los mismos datos con la misma lógica.
export function useSeguimientoPendientes() {
  const [alertas, setAlertas] = useState<AlertaContinuidad[]>([])
  const [pacientesPorId, setPacientesPorId] = useState<Record<string, PatientRow>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [especialidadFiltro, setEspecialidadFiltro] = useState<string>(TODAS_ESPECIALIDADES_KEY)

  useEffect(() => {
    let isMounted = true

    Promise.all([
      apiGet<AlertaContinuidad[]>('/alertas'),
      apiGet<PatientRow[]>('/pacientes'),
    ])
      .then(([alertasResponse, pacientesResponse]) => {
        if (!isMounted) return

        setAlertas(
          alertasResponse.filter(
            alerta => alerta.tipo === 'CONTINUIDAD' && ESTADOS_PENDIENTES.includes(alerta.estado),
          ),
        )
        setPacientesPorId(Object.fromEntries(pacientesResponse.map(paciente => [paciente.id, paciente])))
      })
      .catch(fetchError => {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : 'No fue posible cargar los pacientes de seguimiento.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const opcionesEspecialidad = useMemo(() => {
    const vistas = new Map<string, string>()
    for (const alerta of alertas) {
      const { key, label } = normalizarEspecialidad(alerta.especialidad)
      if (!vistas.has(key)) vistas.set(key, label)
    }
    return Array.from(vistas.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [alertas])

  const filas = useMemo(
    () =>
      alertas
        .filter(
          alerta =>
            especialidadFiltro === TODAS_ESPECIALIDADES_KEY ||
            normalizarEspecialidad(alerta.especialidad).key === especialidadFiltro,
        )
        .map(alerta => ({ alerta, paciente: pacientesPorId[alerta.pacienteId] }))
        .sort((a, b) => new Date(b.alerta.createdAt).getTime() - new Date(a.alerta.createdAt).getTime()),
    [alertas, pacientesPorId, especialidadFiltro],
  )

  const marcarResuelta = async (alertaId: string) => {
    setResolvingId(alertaId)
    try {
      await apiPatch(`/alertas/${alertaId}`, { estado: 'RESUELTA' })
      setAlertas(prev => prev.filter(a => a.id !== alertaId))
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : 'No fue posible actualizar la alerta.')
    } finally {
      setResolvingId(null)
    }
  }

  return {
    filas,
    opcionesEspecialidad,
    especialidadFiltro,
    setEspecialidadFiltro,
    marcarResuelta,
    resolvingId,
    isLoading,
    error,
  }
}