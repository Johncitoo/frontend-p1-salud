import { useEffect, useState } from 'react'
import { ArrowLeft, Activity, Stethoscope, AlertTriangle } from 'lucide-react'
import { apiGet } from '@/lib/api'

type PatientRow = {
  id: string
  rut: string
  nombres: string
  apellidos: string
  fechaNacimiento: string | null
  sexo: string | null
}

type MedicionRow = {
  id: string
  fechaMedicion: string
  valorNumero: number
  origen: string
  variableClinica?: {
    nombre: string
    unidadMedida: string
  }
}

type AlertaRow = {
  id: string
  tipo: string
  mensaje: string
  prioridad: string
  estado: string
  createdAt: string
}

export default function PatientProfilePage({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<PatientRow | null>(null)
  const [mediciones, setMediciones] = useState<MedicionRow[]>([])
  const [alertas, setAlertas] = useState<AlertaRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    Promise.all([
      apiGet<PatientRow>(`/pacientes/${patientId}`),
      apiGet<MedicionRow[]>(`/mediciones-clinicas?pacienteId=${patientId}`),
      apiGet<AlertaRow[]>(`/alertas?pacienteId=${patientId}`),
    ]).then(([pat, meds, alts]) => {
      if (isMounted) {
        setPatient(pat)
        setMediciones(meds)
        setAlertas(alts.filter(a => a.tipo.startsWith('IOT_')))
        setIsLoading(false)
      }
    }).catch(console.error)

    return () => { isMounted = false }
  }, [patientId])

  if (isLoading) return <div className='p-10 text-center'>Cargando perfil...</div>
  if (!patient) return <div className='p-10 text-center text-red-500'>Paciente no encontrado</div>

  return (
    <main className='min-h-screen bg-slate-50 px-6 py-8'>
      <section className='mx-auto w-full max-w-5xl'>
        <a href='/patients' className='mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#284B63] hover:text-[#3C6E71]'>
          <ArrowLeft className='size-4' /> Volver a pacientes
        </a>
        
        <header className='mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-semibold text-slate-900'>{patient.nombres} {patient.apellidos}</h1>
            <p className='mt-2 text-sm text-slate-600'>RUT: {patient.rut}</p>
          </div>
          <div className='bg-[#CDE7EA] text-[#284B63] px-4 py-2 rounded-xl font-bold uppercase text-xs tracking-wider'>
            Perfil Clínico
          </div>
        </header>

        <div className='grid gap-6 md:grid-cols-2'>
          {/* Panel IoT */}
          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4'>
              <Activity className='text-[#3C6E71]' />
              Dispositivos IoT Activos
            </h2>
            <div className='bg-[#F4F9F9] rounded-xl p-4 border border-[#CDE7EA]'>
              <p className='text-sm text-slate-700 font-medium'>El paciente está siendo monitoreado por el equipo de telemetría.</p>
              <p className='text-xs text-slate-500 mt-2'>Los datos se reciben automáticamente desde los sensores domiciliarios.</p>
            </div>
            
            <h3 className='text-md font-semibold text-slate-800 mt-6 mb-3 flex items-center gap-2'>
              <AlertTriangle className='text-amber-500 size-4' /> Alertas IoT Recientes
            </h3>
            {alertas.length === 0 ? (
              <p className='text-sm text-slate-500'>No hay alertas registradas.</p>
            ) : (
              <div className='space-y-3'>
                {alertas.slice(0, 5).map(alerta => (
                  <div key={alerta.id} className='bg-red-50 border border-red-100 p-3 rounded-lg flex justify-between items-start'>
                    <div>
                      <p className='text-sm font-semibold text-red-800'>{alerta.mensaje}</p>
                      <p className='text-xs text-red-600 mt-1'>{new Date(alerta.createdAt).toLocaleString()}</p>
                    </div>
                    <span className='px-2 py-1 bg-red-200 text-red-900 rounded-md text-[10px] font-bold uppercase'>
                      {alerta.prioridad}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mediciones Clínicas */}
          <div className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            <h2 className='text-xl font-semibold text-slate-900 flex items-center gap-2 mb-4'>
              <Stethoscope className='text-[#284B63]' />
              Historial de Signos Vitales
            </h2>
            <div className='overflow-hidden rounded-xl border border-slate-200'>
              <table className='w-full text-left text-sm'>
                <thead className='bg-slate-100'>
                  <tr>
                    <th className='px-4 py-2'>Fecha</th>
                    <th className='px-4 py-2'>Variable</th>
                    <th className='px-4 py-2'>Valor</th>
                    <th className='px-4 py-2'>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {mediciones.length === 0 ? (
                    <tr><td colSpan={4} className='p-4 text-center text-slate-500'>No hay mediciones</td></tr>
                  ) : (
                    mediciones.sort((a,b) => new Date(b.fechaMedicion).getTime() - new Date(a.fechaMedicion).getTime()).slice(0,10).map(m => (
                      <tr key={m.id} className='border-t border-slate-200'>
                        <td className='px-4 py-3'>{new Date(m.fechaMedicion).toLocaleString()}</td>
                        <td className='px-4 py-3'>{m.variableClinica?.nombre}</td>
                        <td className='px-4 py-3 font-semibold'>
                          {m.valorNumero} {m.variableClinica?.unidadMedida}
                        </td>
                        <td className='px-4 py-3'>
                          {m.origen === 'IOT' ? (
                            <span className='bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold'>Automático (IoT)</span>
                          ) : (
                            <span className='bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs'>Manual</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
