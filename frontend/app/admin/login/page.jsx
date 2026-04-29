'use client'

/**
 * Admin login page — /admin/login
 *
 * Two authentication paths:
 *   1. DEV ONLY — username: admin / password: admin
 *      Calls backend /admin/login, then checks 2FA status.
 *      • If 2FA is disabled  → sets cinematch_dev_admin cookie → /admin
 *      • If 2FA is TOTP      → shows 6-digit TOTP challenge
 *      • If 2FA is Telegram  → triggers OTP send, shows code challenge
 *      On successful 2FA → sets cookie → /admin
 *
 *   2. Supabase admin users can use the regular /login page; middleware lets
 *      them through to /admin automatically.
 */

import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const DEV_COOKIE_TTL = 8 * 60 * 60  // 8 hours

export default function AdminLoginPage() {
  // ── Credential form state ───────────────────────────────────────────────────
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // ── 2FA challenge state ─────────────────────────────────────────────────────
  // phase: null | 'totp' | 'telegram'
  const [phase, setPhase] = useState(null)
  const [pendingToken, setPendingToken] = useState(null)
  const [otpInput, setOtpInput] = useState('')
  const [tgSent, setTgSent]       = useState(false)
  const [tgSending, setTgSending] = useState(false)

  // ── Grant admin access ──────────────────────────────────────────────────────
  function grantAccess(token) {
    document.cookie = [
      `cinematch_dev_admin=${token}`,
      'path=/',
      `max-age=${DEV_COOKIE_TTL}`,
      'SameSite=Strict',
    ].join('; ')
    // Hard-navigate so middleware re-evaluates the new cookie
    window.location.href = '/admin'
  }

  // ── Send Telegram OTP ───────────────────────────────────────────────────────
  async function sendTelegramOtp() {
    if (tgSending) return          // prevent double-send
    setError(null)
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
      setError('Could not reach the backend. Is it running?')
    } finally {
      setTgSending(false)
    }
  }

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  async function handleVerifyOtp(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const endpoint =
        phase === 'totp'
          ? `${API}/admin/2fa/verify`
          : `${API}/admin/2fa/telegram/verify`

      const body =
        phase === 'totp'
          ? { user_id: 'dev-admin', token: otpInput }
          : { user_id: 'dev-admin', code: otpInput }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!json.success) {
        setError(json.error?.message ?? 'Invalid code. Try again.')
        setLoading(false)
        return
      }

      grantAccess(pendingToken)
    } catch {
      setError('Could not reach the backend.')
      setLoading(false)
    }
  }

  // ── Credential submit ────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Invalid credentials')
        setLoading(false)
        return
      }

      // Check 2FA status for the dev admin account
      const statusRes = await fetch(`${API}/admin/2fa/status/dev-admin`)
      const statusJson = await statusRes.json()

      if (statusJson.success && statusJson.enabled) {
        setPendingToken(json.token)
        const method = statusJson.method ?? 'totp'
        setPhase(method)
        if (method === 'telegram') {
          await sendTelegramOtp()
        }
        setLoading(false)
        return
      }

      // No 2FA — grant access straight away
      grantAccess(json.token)
    } catch {
      setError('Could not reach the backend. Is it running?')
      setLoading(false)
    }
  }

  // ── 2FA challenge ────────────────────────────────────────────────────────────
  if (phase) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Two-factor auth</h1>
            <p className="text-xs text-text-muted mt-1">
              {phase === 'totp'
                ? 'Enter the 6-digit code from your authenticator app.'
                : tgSent
                ? 'Check the backend logs for your Telegram OTP.'
                : 'Sending Telegram OTP…'}
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {phase === 'telegram' && !tgSent && (
            <button
              onClick={sendTelegramOtp}
              disabled={tgSending}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {tgSending ? 'Sending…' : 'Send OTP via Telegram'}
            </button>
          )}

          {(phase === 'totp' || tgSent) && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value.replace(/\D/g, ''))
                  setError(null)
                }}
                className="w-full px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-text-primary text-sm font-mono tracking-[0.3em] text-center focus:outline-none focus:border-indigo-500 transition-colors"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || otpInput.length < 6}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {loading ? 'Verifying…' : 'Verify & sign in'}
              </button>
            </form>
          )}

          <button
            onClick={() => { setPhase(null); setPendingToken(null); setOtpInput(''); setTgSent(false); setError(null) }}
            className="w-full text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            ← Back to login
          </button>
        </div>
      </div>
    )
  }

  // ── Credential form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Admin login</h1>
          <p className="text-xs text-text-muted mt-1">
            DEV mode: use <span className="font-mono text-text-secondary">admin / admin</span>
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-text-muted" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-[rgba(255,255,255,0.1)] text-text-primary text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-text-muted" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-[rgba(255,255,255,0.1)] text-text-primary text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-text-muted text-center">
          Supabase admin?{' '}
          <a href="/login" className="text-indigo-400 hover:underline">
            Use the regular login
          </a>
        </p>
      </div>
    </div>
  )
}
