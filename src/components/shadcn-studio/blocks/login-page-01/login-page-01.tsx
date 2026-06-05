import { useEffect, useState } from 'react'

import AuthBackgroundShape from '@/assets/svg/auth-background-shape'
import Logo from '@/components/shadcn-studio/logo'
import LoginForm from '@/components/shadcn-studio/blocks/login-page-01/login-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { initKeycloakWithTimeout, keycloak, logoutFromKeycloak } from '@/features/auth/keycloak'
import { fetchCurrentUser, type CurrentUserProfile } from '@/lib/api'

const Login = () => {
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setIsLoadingSession(true)

    initKeycloakWithTimeout()
      .then(async authenticated => {
        if (!isMounted) return

        if (!authenticated || !keycloak.token) {
          setIsLoadingSession(false)
          return
        }

        const currentUser = await fetchCurrentUser(keycloak.token)

        if (!isMounted) return
        setProfile(currentUser)
        setIsLoadingSession(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'No fue posible revisar la sesión institucional')
        setIsLoadingSession(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <div className='pointer-events-none absolute z-0' aria-hidden='true'>
        <AuthBackgroundShape />
      </div>

      <Card className='relative z-10 w-full border-none shadow-md sm:max-w-lg'>
        <CardHeader className='gap-6'>
          <Logo className='gap-3' />

          <div>
            <CardTitle className='mb-1.5 text-2xl'>Plataforma de Atención Domiciliaria</CardTitle>
            <CardDescription className='text-base'>
              Gestión de atención primaria en terreno para coordinadores y profesionales.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {profile ? (
            <div className='space-y-4'>
              <div className='rounded-lg border p-4'>
                <p className='text-muted-foreground text-sm'>Sesión iniciada como</p>
                <p className='text-lg font-semibold'>
                  {profile.nombres} {profile.apellidos}
                </p>
                <p className='text-muted-foreground'>{profile.email}</p>
                <p className='text-muted-foreground'>Rol: {profile.rol}</p>
              </div>

              <div className='flex flex-col gap-3 sm:flex-row'>
                <Button className='grow cursor-pointer' asChild>
                  <a href='/patients'>Ir a pacientes</a>
                </Button>
                <Button
                  variant='outline'
                  className='grow cursor-pointer'
                  type='button'
                  onClick={() => logoutFromKeycloak()}
                >
                  Cerrar sesión
                </Button>
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              <p className='text-muted-foreground'>
                Acceso con credenciales institucionales administradas por Keycloak.
              </p>

              {error ? <p className='text-sm text-destructive'>{error}</p> : null}

              <LoginForm />

              {isLoadingSession ? (
                <p className='text-muted-foreground text-center text-sm'>Revisando sesión institucional...</p>
              ) : null}

              <p className='text-muted-foreground text-center'>
                ¿No tienes acceso habilitado? Solicita tu perfil al administrador.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
