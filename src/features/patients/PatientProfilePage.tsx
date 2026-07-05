import { useEffect, useState } from 'react'
import { ArrowLeft, Activity, Stethoscope, AlertTriangle, Plus, X } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'

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

type DeviceRow = {
  id: string
  assetId: string
  sensorId: string
  sensorType: string
  isActive: boolean
  createdAt: string
}

export default function PatientProfilePage({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<PatientRow | null>(null)
  const [mediciones, setMediciones] = useState<MedicionRow[]>([])
  const [alertas, setAlertas] = useState<AlertaRow[]>([])
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [assetId, setAssetId] = useState('')
  const [sensorId, setSensorId] = useState('')
  const [sensorType, setSensorType] = useState('glucometer')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadData = () => {
      Promise.all([
        apiGet<PatientRow>(`/pacientes/${patientId}`),
        apiGet<MedicionRow[]>(`/mediciones-clinicas?pacienteId=${patientId}`),
        apiGet<AlertaRow[]>(`/alertas?pacienteId=${patientId}`),
        apiGet<DeviceRow[]>(`/iot/paciente-sensores/${patientId}`),
      ]).then(([pat, meds, alts, devs]) => {
        if (isMounted) {
          setPatient(pat)
          setMediciones(meds)
          setAlertas(alts.filter(a => a.tipo.startsWith('IOT_')))
          setDevices(devs)
          setIsLoading(false)
        }
      }).catch(console.error)
    }
    
    loadData()

    return () => { isMounted = false }
  }, [patientId])

  const handleAssignDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await apiPost('/iot/paciente-sensores', {
        pacienteId: patientId,
        assetId,
        sensorId,
        sensorType,
      })
      setIsModalOpen(false)
      setAssetId('')
      setSensorId('')
      // Reload devices
      const devs = await apiGet<DeviceRow[]>(`/iot/paciente-sensores/${patientId}`)
      setDevices(devs)
    } catch (err) {
      console.error(err)
      alert("Error al asignar dispositivo")
    } finally {
      setIsSubmitting(false)
    }
  }

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
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-xl font-semibold text-slate-900 flex items-center gap-2'>
                <Activity className='text-[#3C6E71]' />
                Dispositivos IoT Activos
              </h2>
              <button 
                onClick={() => setIsModalOpen(true)}
                className='flex items-center gap-1 bg-[#3C6E71] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#2A4D4F] transition'
              >
                <Plus className='size-4' /> Vincular
              </button>
            </div>
            
            {devices.length === 0 ? (
              <div className='bg-black/10 rounded-xl p-4 border border-slate-600/30 text-center'>
                <p className='text-sm text-slate-400'>No hay dispositivos vinculados.</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {devices.map(dev => (
                  <div key={dev.id} className='bg-black/10 rounded-xl p-4 border border-slate-600/30 flex justify-between items-center'>
                    <div>
                      <p className='text-sm text-slate-200 font-bold'>{dev.sensorType.toUpperCase()}</p>
                      <p className='text-xs text-slate-400 mt-1'>Asset: {dev.assetId} | Sensor: {dev.sensorId}</p>
                    </div>
                    <span className='px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold uppercase rounded-md border border-green-500/30'>
                      Activo
                    </span>
                  </div>
                ))}
              </div>
            )}
            
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

      {/* Modal Asignar Dispositivo */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'>
          <div className='w-full max-w-md bg-white rounded-2xl p-6 shadow-xl'>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl font-bold text-slate-900'>Vincular Dispositivo IoT</h2>
              <button onClick={() => setIsModalOpen(false)} className='text-slate-400 hover:text-slate-600'>
                <X className='size-5' />
              </button>
            </div>
            
            <form onSubmit={handleAssignDevice} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-1'>Tipo de Sensor</label>
                <select 
                  value={sensorType}
                  onChange={(e) => setSensorType(e.target.value)}
                  className='w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white'
                  required
                >
                  <option value='glucometer'>Glucómetro</option>
                  <option value='pulse_oximeter'>Oxímetro de Pulso</option>
                  <option value='thermometer'>Termómetro</option>
                  <option value='sphygmomanometer'>Esfigmomanómetro</option>
                </select>
              </div>
              
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-1'>ID del Kit / Asset (assetId)</label>
                <input 
                  type='text'
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className='w-full border border-slate-300 rounded-lg p-2.5 text-sm'
                  placeholder='Ej. PATIENT-001'
                  required
                />
                <p className='text-xs text-slate-500 mt-1'>Identificador único provisto por el Equipo 08.</p>
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 mb-1'>ID del Sensor (sensorId)</label>
                <input 
                  type='text'
                  value={sensorId}
                  onChange={(e) => setSensorId(e.target.value)}
                  className='w-full border border-slate-300 rounded-lg p-2.5 text-sm'
                  placeholder='Ej. GLUCO-192'
                  required
                />
              </div>

              <div className='pt-4 flex justify-end gap-3'>
                <button 
                  type='button' 
                  onClick={() => setIsModalOpen(false)}
                  className='px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition'
                >
                  Cancelar
                </button>
                <button 
                  type='submit' 
                  disabled={isSubmitting}
                  className='px-4 py-2 text-sm font-medium text-white bg-[#3C6E71] hover:bg-[#2A4D4F] rounded-lg transition disabled:opacity-50'
                >
                  {isSubmitting ? 'Guardando...' : 'Asignar Dispositivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
