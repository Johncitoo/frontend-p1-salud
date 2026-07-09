import { useEffect, useMemo, useState } from 'react'
import { Activity, Check, Loader2, RefreshCw, Wand2 } from 'lucide-react'

import { apiGet } from '@/lib/api'
import type { DynamicFieldValue, PlantillaCampoRow } from './types'

type VariableClinicaRow = {
  id: string
  codigo: string
  nombre: string
  unidad?: string | null
}

type SignosVitalesIotPanelProps = {
  pacienteId: string
  campos: PlantillaCampoRow[]
  fields: Record<string, DynamicFieldValue>
  onFill: (codigoCampo: string, value: DynamicFieldValue) => void
  isClosed?: boolean
}

const isEmptyValue = (value: DynamicFieldValue | undefined) =>
  value === undefined || value === null || value === '' ||
  (Array.isArray(value) && value.length === 0)

const SignosVitalesIotPanel = ({ pacienteId, campos, fields, onFill, isClosed = false }: SignosVitalesIotPanelProps) => {
  // Mapa variableClinicaId -> { codigo, nombre, unidad } para poder cruzar los
  // signos vitales (que vienen por código) con los campos de la ficha (que solo
  // traen variableClinicaId).
  const [variablesById, setVariablesById] = useState<Record<string, VariableClinicaRow>>({})
  const [vitales, setVitales] = useState<Record<string, number>>({})
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState('')
  const [hasSynced, setHasSynced] = useState(false)

  const camposVariable = useMemo(
    () => campos.filter(c => c.tipoCampo === 'VARIABLE_CLINICA' && c.variableClinicaId),
    [campos],
  )

  useEffect(() => {
    let cancelled = false
    apiGet<VariableClinicaRow[]>('/variables-clinicas?activa=true')
      .then(rows => {
        if (cancelled) return
        const map: Record<string, VariableClinicaRow> = {}
        rows.forEach(v => { map[v.id] = v })
        setVariablesById(map)
      })
      .catch(() => { /* si falla, el panel simplemente no podrá cruzar códigos */ })
    return () => { cancelled = true }
  }, [])

  // Cruce: por cada campo VARIABLE_CLINICA de la ficha, buscar si hay un signo
  // vital para su código de variable.
  const matches = useMemo(() => {
    return camposVariable
      .map(campo => {
        const variable = campo.variableClinicaId ? variablesById[campo.variableClinicaId] : undefined
        if (!variable) return null
        const valor = vitales[variable.codigo]
        if (valor === undefined || valor === null || Number.isNaN(valor)) return null
        return {
          codigoCampo: campo.codigoCampo,
          etiqueta: campo.etiqueta,
          nombre: variable.nombre,
          unidad: variable.unidad ?? '',
          valor,
          isEmpty: isEmptyValue(fields[campo.codigoCampo]),
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
  }, [camposVariable, variablesById, vitales, fields])

  const emptyMatches = matches.filter(m => m.isEmpty)

  const handleSync = async () => {
    setIsSyncing(true)
    setError('')
    try {
      const data = await apiGet<Record<string, number> | null>(
        `/iot/paciente-sensores/${pacienteId}/signos-vitales`,
      )
      setVitales(data ?? {})
      setHasSynced(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron obtener los signos vitales.')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleAutocompletar = () => {
    emptyMatches.forEach(m => onFill(m.codigoCampo, m.valor))
  }

  // Si la plantilla no tiene campos de variable clínica, no tiene sentido mostrar el panel.
  if (camposVariable.length === 0) return null

  return (
    <section className='mb-6 rounded-2xl border border-[#3C6E71]/30 bg-[#3C6E71]/5 p-5'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <span className='rounded-xl bg-[#3C6E71]/10 p-2 text-[#284B63]'>
            <Activity className='size-5' />
          </span>
          <div>
            <h3 className='m-0 text-sm font-bold text-slate-900'>Signos vitales desde dispositivos IoT</h3>
            <p className='m-0 text-xs text-slate-500'>
              Lee la última medición de los sensores vinculados a este paciente.
            </p>
          </div>
        </div>
        <button
          type='button'
          onClick={handleSync}
          disabled={isSyncing || isClosed}
          className='inline-flex h-9 items-center gap-2 rounded-lg bg-[#3C6E71] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#284B63] disabled:cursor-not-allowed disabled:opacity-60'
        >
          {isSyncing ? <Loader2 className='size-3.5 animate-spin' /> : <RefreshCw className='size-3.5' />}
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      {error && (
        <div className='mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700'>
          {error}
        </div>
      )}

      {hasSynced && !error && matches.length === 0 && (
        <div className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800'>
          No se encontraron lecturas de sensores para los campos de esta ficha. Verifica que el paciente
          tenga dispositivos IoT vinculados (desde su perfil) y que estén reportando datos.
        </div>
      )}

      {matches.length > 0 && (
        <>
          <div className='mb-3 grid gap-2 sm:grid-cols-2'>
            {matches.map(m => (
              <div
                key={m.codigoCampo}
                className='flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2'
              >
                <div className='min-w-0'>
                  <p className='truncate text-xs font-medium text-slate-500'>{m.etiqueta}</p>
                  <p className='text-sm font-bold text-slate-900'>
                    {m.valor} {m.unidad}
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => onFill(m.codigoCampo, m.valor)}
                  disabled={isClosed || !m.isEmpty}
                  title={!m.isEmpty ? 'Este campo ya tiene un valor ingresado; no se sobrescribe con IoT.' : undefined}
                  className='inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#3C6E71]/40 px-2.5 py-1.5 text-xs font-semibold text-[#284B63] transition hover:bg-[#3C6E71]/10 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  <Check className='size-3.5' /> {m.isEmpty ? 'Usar' : 'Ya tiene valor'}
                </button>
              </div>
            ))}
          </div>

          <button
            type='button'
            onClick={handleAutocompletar}
            disabled={isClosed || emptyMatches.length === 0}
            className='inline-flex h-9 items-center gap-2 rounded-lg border border-[#3C6E71] px-4 text-xs font-semibold text-[#284B63] transition hover:bg-[#3C6E71]/10 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <Wand2 className='size-3.5' />
            {emptyMatches.length > 0
              ? `Autocompletar ${emptyMatches.length} campo${emptyMatches.length === 1 ? '' : 's'} vacío${emptyMatches.length === 1 ? '' : 's'}`
              : 'Todos los campos ya tienen valor'}
          </button>
        </>
      )}
    </section>
  )
}

export default SignosVitalesIotPanel
