'use client'

import { useState } from 'react'

import { EyeIcon, EyeOffIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const LoginForm = () => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <form
      className='space-y-4'
      onSubmit={e => {
        e.preventDefault()
        window.location.assign('/patients')
      }}
    >
      <div className='space-y-1'>
        <Label htmlFor='userEmail' className='leading-5'>
          Correo institucional*
        </Label>
        <Input type='email' id='userEmail' placeholder='profesional@clinica.cl' />
      </div>

      <div className='w-full space-y-1'>
        <Label htmlFor='password' className='leading-5'>
          Contrasena*
        </Label>
        <div className='relative'>
          <Input
            id='password'
            type={isVisible ? 'text' : 'password'}
            placeholder='****************'
            className='pr-9'
          />
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setIsVisible(prevState => !prevState)}
            className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
          >
            {isVisible ? <EyeOffIcon /> : <EyeIcon />}
            <span className='sr-only'>{isVisible ? 'Ocultar contrasena' : 'Mostrar contrasena'}</span>
          </Button>
        </div>
      </div>

      <div className='flex items-center justify-between gap-y-2'>
        <div className='flex items-center gap-3'>
          <Checkbox id='rememberMe' className='size-6' />
          <Label htmlFor='rememberMe' className='text-muted-foreground'>
            Recordarme
          </Label>
        </div>

        <a href='#' className='hover:underline'>
          Recuperar contrasena?
        </a>
      </div>

      <Button className='w-full' type='submit'>
        Entrar a la plataforma
      </Button>
    </form>
  )
}

export default LoginForm
