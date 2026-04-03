'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import LoginForm from '../../components/auth/LoginForm'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/'
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <LoginForm redirectTo={redirectTo} />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  )
}
