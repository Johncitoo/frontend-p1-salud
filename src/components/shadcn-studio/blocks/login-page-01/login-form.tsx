'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { loginWithKeycloak } from '@/features/auth/keycloak'

const LoginForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      await loginWithKeycloak()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible redirigir a Keycloak')
      setIsSubmitting(false)
    }
  }

  return (
    <div className='space-y-4'>
      <Button
        className='w-full cursor-pointer'
        type='button'
        aria-busy={isSubmitting}
        onClick={handleLogin}
      >
        {isSubmitting ? 'Redirigiendo...' : 'Ingresar con identidad institucional'}
      </Button>

      {error ? <p className='text-sm text-destructive'>{error}</p> : null}
    </div>
  )
}

export default LoginForm
