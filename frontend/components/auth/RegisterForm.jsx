'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'
import Input from '../ui/Input'
import Button from '../ui/Button'
import AuthButtons from './AuthButtons'

export default function RegisterForm() {
  const supabase = createClient()
  const [form, setForm] = useState({
    display_name: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!form.display_name.trim()) {
      setError('Display name is required.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          display_name: form.display_name.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="w-full max-w-sm mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-green-400">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Check your inbox</h2>
        <p className="text-sm text-text-secondary mb-6">
          We sent a confirmation link to <strong className="text-text-primary">{form.email}</strong>.
          Click it to activate your account.
        </p>
        <Link
          href="/login"
          className="text-sm text-red hover:text-red-bright transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="mb-8 text-center">
        <span className="text-3xl">🎬</span>
        <h1 className="mt-3 text-2xl font-bold text-text-primary tracking-tight">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Free forever. No credit card required.
        </p>
      </div>

      {/* Google — primary */}
      <AuthButtons redirectTo="/" mode="signup" />

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
        <span className="text-xs text-text-muted">or sign up with email</span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Display name"
          type="text"
          placeholder="Your name"
          value={form.display_name}
          onChange={handleChange('display_name')}
          required
          autoComplete="name"
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange('email')}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={form.password}
          onChange={handleChange('password')}
          required
          autoComplete="new-password"
        />

        {error && (
          <p className="text-xs text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-text-secondary hover:text-text-primary transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
