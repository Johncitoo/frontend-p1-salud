import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import Logo from '@/components/shadcn-studio/logo'
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'
import LoginForm from '@/components/shadcn-studio/blocks/login-page-01/login-form'

const Login = () => {
  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Card className='z-1 w-full border-none shadow-md sm:max-w-lg'>
        <CardHeader className='gap-6'>
          <Logo className='gap-3' />

          <div>
            <CardTitle className='mb-1.5 text-2xl'>Plataforma de Atencion Domiciliaria</CardTitle>
            <CardDescription className='text-base'>
              Gestion de atencion primaria en terreno para coordinadores y profesionales.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <p className='text-muted-foreground mb-6'>
            Acceso con{' '}
            <a href='#' className='text-card-foreground hover:underline'>
              credenciales institucionales
            </a>
          </p>

          {/* Quick Login Buttons */}
          <div className='mb-6 flex flex-wrap gap-4 sm:gap-6'>
            <Button variant='outline' className='grow' asChild>
              <a href='/patients'>Ingresar como Profesional</a>
            </Button>
            <Button variant='outline' className='grow' asChild>
              <a href='/patients'>Ingresar como Coordinador</a>
            </Button>
          </div>

          {/* Login Form */}
          <div className='space-y-4'>
            <LoginForm />

            <p className='text-muted-foreground text-center'>
              No tienes acceso habilitado?{' '}
              <a href='#' className='text-card-foreground hover:underline'>
                Solicitar perfil
              </a>
            </p>

            <div className='flex items-center gap-4'>
              <Separator className='flex-1' />
              <p>o</p>
              <Separator className='flex-1' />
            </div>

            <Button variant='ghost' className='w-full' asChild>
              <a href='#'>Ingresar con identidad corporativa</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
