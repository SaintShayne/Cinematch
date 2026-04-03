'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import Input from '../ui/Input'
import Button from '../ui/Button'
import AuthButtons from './AuthButtons'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const DEV_COOKIE_TTL = 8 * 60 * 60  // 8 hours

/**
 * LoginForm handles two login paths:
 *  1. Regular Supabase email/password auth
 *  2. Admin dev bypass — entering "admin" / "admin" in the email + password
 *     fields calls the backend admin login endpoint, checks 2FA status, and
 *     (if 2FA is enabled) shows an inline OTP challenge before granting access.
 */
export default function LoginForm({ redirectTo = '/' }) {
  const router = useRouter()
  const supabase = createClient()

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ── Admin 2FA challenge state ───────────────────────────────────────────────
  // phase: null | 'totp' | 'telegram'
  const [adminPhase, setAdminPhase] = useState(null)
  const [pendingToken, setPendingToken] = useState(null)
  const [otpInput, setOtpInput] = useState('')
  const [tgSent, setTgSent] = useState(false)
  const [tgSending, setTgSending] = useState(false)

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setError('')
  }

  // ── Grant admin access (cookie + redirect) ──────────────────────────────────
  function grantAdminAccess(token) {
    document.cookie = [
      `cinematch_dev_admin=${token}`,
      'path=/',
      `max-age=${DEV_COOKIE_TTL}`,
      'SameSite=Strict',
    ].join('; ')
    window.location.href = '/admin'
  }

  // ── Send Telegram OTP ───────────────────────────────────────────────────────
  async function sendTelegramOtp() {
    if (tgSending) return
    setError('')
    setTgSending(true)
    try {
      const res = await fetch(`${API}/admin/2fa/telegram/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'dev-admin' }),
      })
      let json
      try { json = await res.json() } catch { /* non-JSON body */ }
      if (json?.success) {
        setTgSent(true)
      } else {
        setError(json?.error?.message ?? `Server error (HTTP ${res.status})`)
      }
    } catch {
      setError('Could not reach the backend — is it running?')
    } finally {
      setTgSending(false)
    }
  }

  // ── Verify OTP and grant access ─────────────────────────────────────────────
  async function verifyOtp() {
    setError('')
    setLoading(true)
    try {
      const endpoint =
        adminPhase === 'totp'
          ? `${API}/admin/2fa/verify`
          : `${API}/admin/2fa/telegram/verify`

      const body =
        adminPhase === 'totp'
          ? { user_id: 'dev-admin', token: otpInput }
          : { user_id: 'dev-admin', code: otpInput }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!json.success) {
        setError(json.error?.message ?? 'Invalid code — please try again.')
        setLoading(false)
        return
      }

      grantAdminAccess(pendingToken)
    } catch {
      setError('Could not reach the backend.')
      setLoading(false)
    }
  }

  // ── Main submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // ── Admin dev bypass ──────────────────────────────────────────────────────
    if (form.email === 'admin' && form.password === 'admin') {
      try {
        const res = await fetch(`${API}/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin', password: 'admin' }),
        })
        const json = await res.json()

        if (!res.ok || !json.success) {
          setError(json.error?.message ?? 'Admin login failed — is the backend running?')
          setLoading(false)
          return
        }

        // Check whether 2FA is enabled for the dev admin account
        const statusRes = await fetch(`${API}/admin/2fa/status/dev-admin`)
        const statusJson = await statusRes.json()

        if (statusJson.success && statusJson.enabled) {
          // Store token, switch to 2FA challenge UI
          setPendingToken(json.token)
          setAdminPhase(statusJson.method ?? 'totp')
          if (statusJson.method === 'telegram') {
            await sendTelegramOtp()
          }
          setLoading(false)
          return
        }

        // No 2FA configured — grant access immediately
        grantAdminAccess(json.token)
      } catch {
        setError('Could not reach the backend. Is it running?')
        setLoading(false)
      }
      return
    }

    // ── Regular Supabase login ────────────────────────────────────────────────
    const { error: supaErr } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (supaErr) {
      setError(supaErr.message)
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  // ── 2FA challenge UI ─────────────────────────────────────────────────────────
  if (adminPhase) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-6">
        <div className="text-center">
          <span className="text-3xl">🔐</span>
          <h1 className="mt-3 text-2xl font-bold text-text-primary tracking-tight">
            Two-factor auth
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            {adminPhase === 'totp'
              ? 'Enter the 6-digit code from your authenticator app.'
              : tgSent
              ? 'Check the backend logs for your Telegram OTP code.'
              : 'Sending OTP via Telegram…'}
          </p>
        </div>

        {error && (
          <p className="text-xs text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {adminPhase === 'telegram' && !tgSent && (
          <Button onClick={sendTelegramOtp} size="lg" className="w-full" disabled={tgSending} loading={tgSending}>
            {tgSending ? 'Sending…' : 'Send OTP via Telegram'}
          </Button>
        )}

        {(adminPhase === 'totp' || tgSent) && (
          <div className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otpInput}
              onChange={(e) => {
                setOtpInput(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              className="w-full px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-text-primary text-sm font-mono tracking-[0.3em] text-center focus:outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
            <Button
              onClick={verifyOtp}
              size="lg"
              className="w-full"
              loading={loading}
              disabled={otpInput.length < 6}
            >
              Verify & sign in
            </Button>
          </div>
        )}

        <button
          onClick={() => { setAdminPhase(null); setPendingToken(null); setOtpInput(''); setTgSent(false); setError('') }}
          className="w-full text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          ← Back
        </button>
      </div>
    )
  }

  // ── Normal login UI ──────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="mb-8 text-center">
        <span className="text-3xl">🎬</span>
        <h1 className="mt-3 text-2xl font-bold text-text-primary tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Sign in to your CineMatch account
        </p>
      </div>

      {/* Google — primary */}
      <AuthButtons redirectTo={redirectTo} mode="signin" />

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
        <span className="text-xs text-text-muted">or continue with email</span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/*
          type is 'text' when the value is 'admin' so HTML5 email validation
          doesn't block the admin dev bypass (which uses 'admin' as the identifier).
        */}
        <Input
          label="Email"
          type={form.email === 'admin' ? 'text' : 'email'}
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange('email')}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange('password')}
          required
          autoComplete="current-password"
        />

        {error && (
          <p className="text-xs text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={loading}
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-text-secondary hover:text-text-primary transition-colors">
          Create one
        </Link>
      </p>
    </div>
  )
}
