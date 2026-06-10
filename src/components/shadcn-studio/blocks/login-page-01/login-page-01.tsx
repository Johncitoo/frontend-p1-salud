import { useEffect, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  MapPin,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'

import LoginForm from '@/components/shadcn-studio/blocks/login-page-01/login-form'
import { Button } from '@/components/ui/button'
import { createLocalMockProfile, getMockSession, logoutMock } from '@/features/auth/mockAuth'
import type { CurrentUserProfile } from '@/lib/api'

const Login = () => {
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null)

  const loadSession = () => {
    const session = getMockSession()
    setProfile(session ? createLocalMockProfile(session) : null)
  }

  useEffect(() => {
    loadSession()
  }, [])

  const handleLogout = () => {
    logoutMock()
    setProfile(null)
  }

  return (
    <main className='min-h-screen w-full bg-[#D9D9D9] p-3 text-left text-[#353535] sm:p-5 lg:p-7'>
      <div className='mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1480px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(40,75,99,0.18)] sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1.08fr_0.92fr]'>
        <section className='relative isolate hidden overflow-hidden bg-[#284B63] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14'>
          <div className='absolute -right-28 -top-28 size-80 rounded-full border-[52px] border-[#3C6E71]/50' aria-hidden='true' />
          <div className='absolute -bottom-36 -left-24 size-[420px] rounded-full border-[72px] border-white/5' aria-hidden='true' />
          <div className='absolute bottom-24 right-14 h-40 w-24 rotate-12 rounded-full bg-[#3C6E71]/30 blur-2xl' aria-hidden='true' />

          <div className='relative z-10 flex items-center gap-3'>
            <span className='grid size-12 place-items-center rounded-2xl bg-white text-[#284B63] shadow-lg shadow-[#353535]/20'>
              <HeartPulse className='size-7' strokeWidth={2.2} aria-hidden='true' />
            </span>
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-[0.24em] text-[#D9D9D9]'>Red asistencial</p>
              <p className='mt-0.5 text-lg font-semibold tracking-tight text-white'>Salud en Casa</p>
            </div>
          </div>

          <div className='relative z-10 max-w-2xl space-y-8'>
            <div className='inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm'>
              <ShieldCheck className='size-4 text-[#D9D9D9]' aria-hidden='true' />
              Gestión clínica segura y coordinada
            </div>

            <div className='space-y-5'>
              <h1 className='m-0 max-w-2xl text-5xl font-semibold leading-[1.06] tracking-[-0.045em] text-white xl:text-6xl'>
                Atención domiciliaria, conectada de principio a fin.
              </h1>
              <p className='max-w-xl text-lg leading-8 text-[#D9D9D9]'>
                Organiza equipos, pacientes y zonas de atención desde una plataforma diseñada para acompañar el trabajo clínico en terreno.
              </p>
            </div>

            <div className='grid max-w-xl grid-cols-3 gap-3'>
              <div className='rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm'>
                <Stethoscope className='mb-5 size-5 text-white' aria-hidden='true' />
                <p className='text-sm font-semibold text-white'>Equipo clínico</p>
                <p className='mt-1 text-xs leading-5 text-[#D9D9D9]'>Roles coordinados</p>
              </div>
              <div className='rounded-2xl border border-white/10 bg-[#3C6E71] p-4 shadow-lg shadow-[#353535]/15'>
                <MapPin className='mb-5 size-5 text-white' aria-hidden='true' />
                <p className='text-sm font-semibold text-white'>Cobertura</p>
                <p className='mt-1 text-xs leading-5 text-white/75'>Zonas operativas</p>
              </div>
              <div className='rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm'>
                <HeartPulse className='mb-5 size-5 text-white' aria-hidden='true' />
                <p className='text-sm font-semibold text-white'>Continuidad</p>
                <p className='mt-1 text-xs leading-5 text-[#D9D9D9]'>Atención trazable</p>
              </div>
            </div>
          </div>

          <p className='relative z-10 text-xs font-medium uppercase tracking-[0.18em] text-[#D9D9D9]/70'>
            Plataforma de atención primaria domiciliaria
          </p>
        </section>

        <section className='relative flex items-center justify-center bg-white px-5 py-10 sm:px-10 lg:px-12 xl:px-20'>
          <div className='absolute inset-x-0 top-0 h-1.5 bg-[#3C6E71] lg:hidden' aria-hidden='true' />
          <div className='w-full max-w-[520px]'>
            <div className='mb-10 flex items-center gap-3 lg:hidden'>
              <span className='grid size-11 place-items-center rounded-2xl bg-[#284B63] text-white'>
                <HeartPulse className='size-6' aria-hidden='true' />
              </span>
              <div>
                <p className='text-[10px] font-semibold uppercase tracking-[0.22em] text-[#3C6E71]'>Red asistencial</p>
                <p className='font-semibold text-[#284B63]'>Salud en Casa</p>
              </div>
            </div>

            <div className='mb-8 space-y-3'>
              <p className='text-xs font-bold uppercase tracking-[0.2em] text-[#3C6E71]'>Acceso a plataforma</p>
              <h2 className='m-0 text-4xl font-semibold leading-tight tracking-[-0.035em] text-[#284B63]'>
                Bienvenido de vuelta
              </h2>
              <p className='max-w-md text-base leading-7 text-[#353535]/70'>
                Selecciona tu perfil de acceso para continuar al panel de gestión.
              </p>
            </div>

            {profile ? (
              <div className='space-y-5'>
                <div className='rounded-3xl border border-[#D9D9D9] bg-[#D9D9D9]/35 p-6'>
                  <div className='mb-5 flex items-center gap-3'>
                    <span className='grid size-10 place-items-center rounded-full bg-[#3C6E71] text-white'>
                      <CheckCircle2 className='size-5' aria-hidden='true' />
                    </span>
                    <div>
                      <p className='text-xs font-bold uppercase tracking-[0.16em] text-[#3C6E71]'>Sesión activa</p>
                      <p className='font-semibold text-[#284B63]'>{profile.rol}</p>
                    </div>
                  </div>
                  <p className='text-xl font-semibold text-[#353535]'>{profile.nombres} {profile.apellidos}</p>
                  <p className='mt-1 text-sm text-[#353535]/65'>{profile.email}</p>
                </div>

                <Button className='h-12 w-full rounded-xl bg-[#284B63] text-base text-white hover:bg-[#353535]' asChild>
                  <a href='/dashboard'>Ir al panel <ArrowRight className='size-4' /></a>
                </Button>
                <Button variant='outline' className='h-11 w-full border-[#D9D9D9] text-[#353535] hover:bg-[#D9D9D9]/40' onClick={handleLogout}>
                  Cambiar perfil
                </Button>
              </div>
            ) : (
              <LoginForm onAuthenticated={loadSession} />
            )}

            <div className='mt-8 flex items-center gap-3 text-xs leading-5 text-[#353535]/55'>
              <ShieldCheck className='size-4 shrink-0 text-[#3C6E71]' aria-hidden='true' />
              <p>Acceso protegido con permisos definidos según cada perfil.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default Login
