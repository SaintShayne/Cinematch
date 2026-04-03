'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../lib/context/AuthContext'
import { Spinner } from '../ui/LoadingState'

export default function AuthGuard({ children, redirectTo = '/login' }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(
        `${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`
      )
    }
  }, [user, loading, router, redirectTo])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return null

  return children
}
