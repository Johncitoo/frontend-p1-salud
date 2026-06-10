import { useState } from 'react'
import { ArrowRight, BriefcaseMedical, ClipboardCheck, Shield, UserRoundCog } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { loginWithMockRole, mockUsers, type MockRole } from '@/features/auth/mockAuth'

type LoginFormProps = {
  onAuthenticated: () => void
}

const roleIcons = {
  COORDINADOR: ClipboardCheck,
  PROFESIONAL: BriefcaseMedical,
  SUPERVISOR: Shield,
  ADMIN: UserRoundCog,
}

const LoginForm = ({ onAuthenticated }: LoginFormProps) => {
  const [selectedRole, setSelectedRole] = useState<MockRole>('COORDINADOR')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = () => {
    if (isSubmitting) return
    setError(null)
    setIsSubmitting(true)

    try {
      loginWithMockRole(selectedRole)
      onAuthenticated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión')
      setIsSubmitting(false)
    }
  }

  return (
    <div className='space-y-5'>
      <fieldset>
        <legend className='mb-3 text-sm font-semibold text-[#353535]'>Selecciona un perfil</legend>
        <div className='grid gap-3 sm:grid-cols-2'>
          {mockUsers.map(user => {
            const Icon = roleIcons[user.role]
            const selected = selectedRole === user.role

            return (
              <button
                key={user.role}
                type='button'
                aria-pressed={selected}
                onClick={() => setSelectedRole(user.role)}
                className={`group min-h-28 rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3C6E71] focus-visible:ring-offset-2 ${
                  selected
                    ? 'border-[#3C6E71] bg-[#3C6E71] text-white shadow-lg shadow-[#3C6E71]/20'
                    : 'border-[#D9D9D9] bg-white text-[#353535] hover:-translate-y-0.5 hover:border-[#3C6E71] hover:shadow-md'
                }`}
              >
                <span className='mb-4 flex items-center justify-between'>
                  <span className={`grid size-9 place-items-center rounded-xl ${selected ? 'bg-white/15 text-white' : 'bg-[#D9D9D9]/45 text-[#284B63]'}`}>
                    <Icon className='size-4.5' aria-hidden='true' />
                  </span>
                  <span className={`size-2.5 rounded-full border-2 ${selected ? 'border-white bg-white' : 'border-[#D9D9D9] bg-white'}`} />
                </span>
                <span className={`block text-sm font-semibold ${selected ? 'text-white' : 'text-[#284B63]'}`}>{user.label}</span>
                <span className={`mt-1 block text-xs leading-5 ${selected ? 'text-white/75' : 'text-[#353535]/60'}`}>{user.description}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <Button
        className='h-[52px] w-full rounded-xl bg-[#284B63] px-5 text-base font-semibold text-white shadow-lg shadow-[#284B63]/15 hover:bg-[#353535]'
        type='button'
        aria-busy={isSubmitting}
        onClick={handleLogin}
      >
        {isSubmitting ? 'Ingresando...' : 'Continuar al panel'}
        <ArrowRight className='size-4' aria-hidden='true' />
      </Button>

      {error ? <p className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</p> : null}
    </div>
  )
}

export default LoginForm
