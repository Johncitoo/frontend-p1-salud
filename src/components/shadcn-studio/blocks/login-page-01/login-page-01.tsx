import { useEffect, useState } from 'react'
import { Activity, CalendarDays, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'

import Logo from '@/components/shadcn-studio/logo'
import LoginForm from '@/components/shadcn-studio/blocks/login-page-01/login-form'
import { Button } from '@/components/ui/button'
import { createLocalMockProfile, getMockSession, logoutMock } from '@/features/auth/mockAuth'
import type { CurrentUserProfile } from '@/lib/api'

const Login = () => {
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSession = () => {
    const session = getMockSession()
    if (!session) {
      setProfile(null)
      setIsLoadingSession(false)
      return
    }

    setIsLoadingSession(true)
    setError(null)

    setProfile(createLocalMockProfile(session))
    setIsLoadingSession(false)
  }

  useEffect(() => {
    loadSession()
  }, [])

  const handleLogout = () => {
    logoutMock()
    setProfile(null)
    setError(null)
  }

  return (
    <main className='min-h-screen bg-[#f5f8f7] px-4 py-8 text-left text-slate-900 sm:px-6 lg:px-8'>
      <div className='mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-[1.05fr_0.95fr]'>
        <section className='relative flex flex-col justify-between bg-[#eaf4f0] p-6 sm:p-8 lg:p-10'>
          <div
            className='absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#047857,#0891b2,#2563eb)]'
            aria-hidden='true'
          />

          <div className='space-y-12'>
            <Logo className='gap-3 text-emerald-950 [&_svg]:text-emerald-700' />

            <div className='max-w-xl space-y-5'>
              <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/75 px-3 py-1 text-sm font-medium text-emerald-800 shadow-sm'>
                <ShieldCheck className='size-4' aria-hidden='true' />
                Acceso mock con roles
              </div>

              <div className='space-y-3'>
                <h1 className='m-0 max-w-xl text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-5xl'>
                  Plataforma de Atención Domiciliaria
                </h1>
                <p className='max-w-lg text-base leading-7 text-slate-600 sm:text-lg'>
                  Gestión de atención primaria en terreno con permisos diferenciados para coordinación, profesionales y supervisión.
                </p>
              </div>
            </div>
          </div>

          <div className='mt-12 grid gap-3 sm:grid-cols-3'>
            <div className='rounded-lg border border-white/70 bg-white/70 p-4 shadow-sm'>
              <CalendarDays className='mb-4 size-5 text-cyan-700' aria-hidden='true' />
              <p className='text-2xl font-semibold text-slate-950'>24</p>
              <p className='text-sm text-slate-600'>visitas hoy</p>
            </div>
            <div className='rounded-lg border border-white/70 bg-white/70 p-4 shadow-sm'>
              <Clock3 className='mb-4 size-5 text-blue-700' aria-hidden='true' />
              <p className='text-2xl font-semibold text-slate-950'>08:30</p>
              <p className='text-sm text-slate-600'>primer bloque</p>
            </div>
            <div className='rounded-lg border border-white/70 bg-white/70 p-4 shadow-sm'>
              <Activity className='mb-4 size-5 text-emerald-700' aria-hidden='true' />
              <p className='text-2xl font-semibold text-slate-950'>RBAC</p>
              <p className='text-sm text-slate-600'>mínimo privilegio</p>
            </div>
          </div>
        </section>

        <section className='flex items-center justify-center p-6 sm:p-8 lg:p-12'>
          <div className='w-full max-w-md space-y-8'>
            <div className='space-y-3'>
              <p className='text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700'>Inicio de sesión</p>
              <h2 className='m-0 text-3xl font-semibold leading-tight text-slate-950'>Entra a tu cuenta</h2>
              <p className='text-base leading-7 text-slate-600'>
                Selecciona un rol mock para probar el acceso sin depender de Keycloak.
              </p>
            </div>

            {profile ? (
              <div className='space-y-6'>
                <div className='border-l-4 border-emerald-600 bg-emerald-50 px-5 py-4'>
                  <div className='mb-3 flex items-center gap-2 text-sm font-medium text-emerald-800'>
                    <CheckCircle2 className='size-4' aria-hidden='true' />
                    Sesión iniciada como
                  </div>
                  <p className='text-xl font-semibold text-slate-950'>
                    {profile.nombres} {profile.apellidos}
                  </p>
                  <p className='mt-1 text-slate-600'>{profile.email}</p>
                  <p className='text-slate-600'>Rol: {profile.rol}</p>
                </div>

                <div className='flex flex-col gap-3 sm:flex-row'>
                  <Button className='h-10 grow cursor-pointer bg-emerald-700 text-white hover:bg-emerald-800' asChild>
                    <a href='/dashboard'>Ir al panel</a>
                  </Button>
                  <Button
                    variant='outline'
                    className='h-10 grow cursor-pointer border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                    type='button'
                    onClick={handleLogout}
                  >
                    Cerrar sesión
                  </Button>
                </div>
              </div>
            ) : (
              <div className='space-y-5'>
                {error ? (
                  <p className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</p>
                ) : null}

                <LoginForm onAuthenticated={loadSession} />

                {isLoadingSession ? (
                  <p className='text-center text-sm text-slate-500'>Revisando sesión mock...</p>
                ) : null}

                <p className='text-center text-sm text-slate-500'>
                  El backend valida el rol recibido y aplica mínimo privilegio por endpoint.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default Login
