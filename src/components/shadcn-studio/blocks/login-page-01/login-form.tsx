'use client'

import { useState } from 'react'
import { LogIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { loginWithMockRole, mockUsers, type MockRole } from '@/features/auth/mockAuth'

type LoginFormProps = {
  onAuthenticated: () => void
}

const LoginForm = ({ onAuthenticated }: LoginFormProps) => {
  const [selectedRole, setSelectedRole] = useState<MockRole>('COORDINADOR')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      loginWithMockRole(selectedRole)
      onAuthenticated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión mock')
      setIsSubmitting(false)
    }
  }

  return (
    <div className='space-y-4'>
      <div className='grid gap-2'>
        {mockUsers.map(user => (
          <button
            key={user.role}
            type='button'
            onClick={() => setSelectedRole(user.role)}
            className={`rounded-lg border px-4 py-3 text-left transition ${
              selectedRole === user.role
                ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span className='flex items-center justify-between gap-3'>
              <span className='font-semibold text-slate-950'>{user.label}</span>
              <span className='rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600'>{user.role}</span>
            </span>
            <span className='mt-1 block text-sm leading-5 text-slate-600'>{user.description}</span>
          </button>
        ))}
      </div>

      <Button
        className='h-11 w-full cursor-pointer bg-emerald-700 text-base text-white shadow-sm shadow-emerald-900/10 hover:bg-emerald-800'
        type='button'
        aria-busy={isSubmitting}
        onClick={handleLogin}
      >
        <LogIn className='size-4' aria-hidden='true' />
        {isSubmitting ? 'Entrando...' : 'Ingresar con usuario mock'}
      </Button>

      {error ? <p className='text-sm text-destructive'>{error}</p> : null}
    </div>
  )
}

export default LoginForm
