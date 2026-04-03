'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { createClient } from '../../lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Presentational primitives ─────────────────────────────────────────────────

function StatCard({ label, value, icon, colour = 'indigo' }) {
  const ring = {
    indigo: 'border-indigo-500/30 bg-indigo-500/5',
    emerald: 'border-emerald-500/30 bg-emerald-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
  }
  return (
    <div className={`p-5 rounded-2xl border ${ring[colour] ?? ring.indigo} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest">{label}</p>
        <span className="text-lg opacity-60">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-text-primary tabular-nums">
        {value != null ? value : <span className="text-text-muted text-xl animate-pulse">…</span>}
      </p>
    </div>
  )
}

function SectionHeading({ children }) {
  return (
    <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest mb-3">
      {children}
    </h2>
  )
}

function RoleBadge({ role }) {
  return role === 'admin' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25">
      ★ admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-text-muted border border-white/10">
      user
    </span>
  )
}

function Panel({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-[rgba(255,255,255,0.07)] bg-surface-elevated ${className}`}>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()

  // mounted: cookie can only be read client-side — prevents hydration mismatch
  const [mounted, setMounted] = useState(false)
  const [hasDevCookie, setHasDevCookie] = useState(false)
  useEffect(() => {
    setMounted(true)
    setHasDevCookie(document.cookie.includes('cinematch_dev_admin='))
  }, [])

  const adminUserId = user?.id ?? 'dev-admin'

  // ── Data state ────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [flags, setFlags] = useState(null)
  const [logs, setLogs] = useState([])
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // ── 2FA state ─────────────────────────────────────────────────────────────
  // twoFAStatus: null (loading) | { enabled, method }
  const [twoFAStatus, setTwoFAStatus] = useState(null)
  // setup flow
  const [twoFAMethod, setTwoFAMethod]   = useState(null)   // 'totp' | 'telegram'
  const [qrCode, setQrCode]             = useState(null)
  const [totpInput, setTotpInput]       = useState('')
  const [twoFAMsg, setTwoFAMsg]         = useState(null)
  // Telegram-specific
  const [tgBotToken, setTgBotToken]     = useState('')
  const [tgChatId, setTgChatId]         = useState('')
  // tgConfig: null | { configured, masked_token, chat_id }
  const [tgConfig, setTgConfig]         = useState(null)
  const [tgSent, setTgSent]             = useState(false)
  const [tgSending, setTgSending]       = useState(false)
  const [tgInput, setTgInput]           = useState('')

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const json = await fetch(`${API}/admin/stats`).then((r) => r.json())
      if (json.success) setStats(json)
    } catch { /* non-fatal */ }
  }, [])

  const fetchFlags = useCallback(async () => {
    try {
      const json = await fetch(`${API}/admin/feature-flags`).then((r) => r.json())
      if (json.success) setFlags(json.flags)
    } catch { /* non-fatal */ }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const json = await fetch(`${API}/admin/logs`).then((r) => r.json())
      if (json.success) setLogs(json.logs ?? [])
    } catch { /* non-fatal */ }
  }, [])

  const fetch2FAStatus = useCallback(async () => {
    try {
      const json = await fetch(`${API}/admin/2fa/status/${adminUserId}`).then((r) => r.json())
      if (json.success) setTwoFAStatus({ enabled: json.enabled, method: json.method })
    } catch { /* non-fatal */ }
  }, [adminUserId])

  const fetchTelegramConfig = useCallback(async () => {
    try {
      const json = await fetch(`${API}/admin/2fa/telegram/config/${adminUserId}`).then((r) => r.json())
      if (json.success) setTgConfig(json.configured ? json : null)
    } catch { /* non-fatal */ }
  }, [adminUserId])

  const [usersFetched, setUsersFetched] = useState(false)

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    setUsersFetched(true)
    if (!error) setUsers(data ?? [])
  }, [supabase])

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('role').eq('id', user.id).single()
      .then(({ data }) => setProfile(data))
  }, [user, supabase])

  useEffect(() => {
    if (!mounted) return
    if (!user && !hasDevCookie) return
    fetchStats()
    fetchFlags()
    fetchLogs()
    fetch2FAStatus()
    fetchTelegramConfig()
    if (user) fetchUsers()
  }, [mounted, user, hasDevCookie, fetchStats, fetchFlags, fetchLogs, fetch2FAStatus, fetchTelegramConfig, fetchUsers])

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!mounted) return null

  if (authLoading && !hasDevCookie) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-text-muted animate-pulse">Checking permissions…</p>
      </div>
    )
  }

  if (!user && !hasDevCookie) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-red-400">Access denied — please log in.</p>
      </div>
    )
  }

  if (user && profile && profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-red-400">Access denied — admins only.</p>
      </div>
    )
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function toggleFlag(flag, current) {
    setBusy(true)
    try {
      const json = await fetch(`${API}/admin/feature-flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag, enabled: !current }),
      }).then((r) => r.json())
      if (json.success) setFlags((f) => ({ ...f, [flag]: !current }))
    } catch {
      setErrorMsg('Failed to update feature flag.')
    } finally {
      setBusy(false)
    }
  }

  async function updateRole(userId, newRole) {
    setBusy(true)
    const { error: supaErr } = await supabase
      .from('profiles').update({ role: newRole }).eq('id', userId)
    if (supaErr) setErrorMsg('Failed to update role: ' + supaErr.message)
    else setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    setBusy(false)
  }

  // ── 2FA handlers ──────────────────────────────────────────────────────────

  function resetTwoFASetup() {
    setTwoFAMethod(null)
    setQrCode(null)
    setTotpInput('')
    setTgBotToken('')
    setTgChatId('')
    setTgSent(false)
    setTgInput('')
    setTwoFAMsg(null)
  }

  async function saveTelegramConfig() {
    setTwoFAMsg(null)
    if (!tgBotToken.trim() || !tgChatId.trim()) {
      setTwoFAMsg('Both Bot Token and Chat ID are required.')
      return
    }
    try {
      const json = await fetch(`${API}/admin/2fa/telegram/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: adminUserId, bot_token: tgBotToken.trim(), chat_id: tgChatId.trim() }),
      }).then((r) => r.json())
      if (json.success) {
        setTgConfig({ configured: true, masked_token: json.masked_token, chat_id: json.chat_id })
        setTgBotToken('')
        setTgChatId('')
      } else {
        setTwoFAMsg(json.error?.message ?? 'Failed to save config.')
      }
    } catch {
      setTwoFAMsg('Could not reach backend.')
    }
  }

  async function initiateTOTP() {
    setTwoFAMsg(null)
    try {
      const json = await fetch(`${API}/admin/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: adminUserId }),
      }).then((r) => r.json())
      if (json.success) setQrCode(json.qr_code)
      else setTwoFAMsg(json.error?.message ?? 'Setup failed.')
    } catch {
      setTwoFAMsg('Could not reach backend.')
    }
  }

  async function verifyTOTP() {
    setTwoFAMsg(null)
    try {
      const json = await fetch(`${API}/admin/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: adminUserId, token: totpInput }),
      }).then((r) => r.json())
      if (json.success) {
        setTwoFAMsg('2FA enabled — you will be prompted on next login.')
        setQrCode(null)
        setTotpInput('')
        setTwoFAStatus({ enabled: true, method: 'totp' })
      } else {
        setTwoFAMsg(json.error?.message ?? 'Verification failed.')
      }
    } catch {
      setTwoFAMsg('Could not reach backend.')
    }
  }

  async function sendTelegramOtp() {
    if (tgSending) return
    setTwoFAMsg(null)
    setTgSending(true)
    try {
      const res = await fetch(`${API}/admin/2fa/telegram/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: adminUserId }),
      })

      let json
      try {
        json = await res.json()
      } catch {
        setTwoFAMsg(`Server error (HTTP ${res.status}) — check the backend logs for details.`)
        return
      }

      if (json.success) {
        setTgSent(true)
      } else {
        setTwoFAMsg(json.error?.message ?? `Failed to send OTP (HTTP ${res.status}).`)
      }
    } catch {
      setTwoFAMsg('Could not reach the backend — make sure it is running on port 8000.')
    } finally {
      setTgSending(false)
    }
  }

  async function verifyTelegram() {
    setTwoFAMsg(null)
    try {
      const json = await fetch(`${API}/admin/2fa/telegram/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: adminUserId, code: tgInput }),
      }).then((r) => r.json())
      if (json.success) {
        setTwoFAMsg('Telegram 2FA enabled — you will be prompted on next login.')
        setTgSent(false)
        setTgInput('')
        setTwoFAStatus({ enabled: true, method: 'telegram' })
        setTwoFAMethod(null)
      } else {
        setTwoFAMsg(json.error?.message ?? 'Verification failed.')
      }
    } catch {
      setTwoFAMsg('Could not reach backend.')
    }
  }

  async function disable2FA() {
    setTwoFAMsg(null)
    try {
      const json = await fetch(`${API}/admin/2fa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: adminUserId }),
      }).then((r) => r.json())
      if (json.success) {
        setTwoFAStatus({ enabled: false, method: null })
        resetTwoFASetup()
        setTwoFAMsg('2FA has been disabled.')
      }
    } catch {
      setTwoFAMsg('Could not reach backend.')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-4xl pb-16">

      {/* ── Page title ─────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          {hasDevCookie && !user && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Dev mode
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Users · Feature flags · 2FA · Logs
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center justify-between">
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="text-red-400/60 hover:text-red-400 text-xs ml-4">✕</button>
        </div>
      )}

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Overview</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Movies in dataset" value={stats?.total_movies} icon="🎬" colour="indigo" />
          <StatCard label="Genres available" value={stats?.total_genres} icon="🗂️" colour="emerald" />
          <StatCard label="Registered users" value={users.length || (user ? 0 : '—')} icon="👤" colour="amber" />
        </div>
      </section>

      {/* ── Feature Flags ─────────────────────────────────────────────────── */}
      <section>
        <SectionHeading>Feature Flags</SectionHeading>
        <Panel>
          {!flags ? (
            <div className="p-4 text-sm text-text-muted animate-pulse">Loading flags…</div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.05)]">
              {Object.entries(flags).map(([flag, enabled]) => (
                <div key={flag} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-mono text-text-primary">{flag.replace(/_/g, ' ')}</p>
                    <p className="text-[11px] text-text-muted font-mono">{flag}</p>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => toggleFlag(flag, enabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                      enabled ? 'bg-indigo-500' : 'bg-white/10'
                    }`}
                    title={enabled ? 'Click to disable' : 'Click to enable'}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        enabled ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>

      {/* ── User Management ───────────────────────────────────────────────── */}
      <section>
        <SectionHeading>User Management</SectionHeading>
        <Panel className="overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-text-muted uppercase tracking-widest">User</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-text-muted uppercase tracking-widest">Role</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-text-muted uppercase tracking-widest">Joined</th>
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-text-muted uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-text-muted">
                    {!user
                      ? 'User list requires a Supabase login — dev mode shows backend data only.'
                      : !usersFetched
                      ? 'Loading…'
                      : 'No users returned — run the admin RLS policy in supabase/schema.sql to grant read-all access.'}
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-text-primary">{u.display_name ?? '—'}</p>
                    <p className="text-text-muted">{u.email}</p>
                  </td>
                  <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-3 text-text-muted">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.id !== user?.id && (
                      <button
                        disabled={busy}
                        onClick={() => updateRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                        className="px-2.5 py-1 rounded-lg border border-[rgba(255,255,255,0.1)] text-text-muted hover:text-text-primary hover:border-white/20 text-[11px] transition-all disabled:opacity-40"
                      >
                        {u.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </section>

      {/* ── Two-Factor Authentication ──────────────────────────────────────── */}
      <section>
        <SectionHeading>Two-Factor Authentication</SectionHeading>
        <Panel className="p-5 space-y-4">

          {/* Status row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">
                {twoFAStatus?.enabled
                  ? `2FA enabled — ${twoFAStatus.method === 'telegram' ? 'Telegram OTP' : 'TOTP Authenticator'}`
                  : '2FA disabled'}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {twoFAStatus?.enabled
                  ? 'You will be asked for a code on every login.'
                  : 'Set up an authenticator app or Telegram OTP to protect your account.'}
              </p>
            </div>
            <div className="flex gap-2">
              {twoFAStatus?.enabled && (
                <button
                  onClick={disable2FA}
                  className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all"
                >
                  Disable
                </button>
              )}
              {!twoFAStatus?.enabled && !twoFAMethod && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { resetTwoFASetup(); setTwoFAMethod('totp'); initiateTOTP() }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                  >
                    Google / TOTP
                  </button>
                  <button
                    onClick={() => { resetTwoFASetup(); setTwoFAMethod('telegram') }}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
                  >
                    Telegram
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* TOTP setup flow */}
          {twoFAMethod === 'totp' && qrCode && (
            <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <p className="text-xs text-text-secondary">
                Scan this QR code with Google Authenticator, Authy, or 1Password, then enter the 6-digit code to confirm.
              </p>
              <div className="flex gap-6 items-start flex-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${qrCode}`}
                  alt="TOTP QR code"
                  className="w-36 h-36 rounded-xl border border-[rgba(255,255,255,0.1)] bg-white p-1"
                />
                <div className="space-y-3 flex-1 min-w-[180px]">
                  <p className="text-xs text-text-muted">Enter the code from your app:</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-text-primary text-sm font-mono tracking-[0.3em] text-center focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    onClick={verifyTOTP}
                    disabled={totpInput.length < 6}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white text-sm font-semibold transition-colors"
                  >
                    Verify & Enable
                  </button>
                  <button onClick={resetTwoFASetup} className="w-full text-xs text-text-muted hover:text-text-secondary transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Telegram setup flow — 3 steps: config → send → verify */}
          {twoFAMethod === 'telegram' && (
            <div className="space-y-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">

              {/* Step 1 — Bot credentials */}
              {!tgConfig && (
                <div className="space-y-3 max-w-sm">
                  <div>
                    <p className="text-sm font-medium text-text-primary mb-0.5">Connect your Telegram bot</p>
                    <ol className="text-xs text-text-muted space-y-1 list-decimal list-inside mt-1">
                      <li>
                        Create a bot with{' '}
                        <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                          @BotFather
                        </a>{' '}
                        → copy the <span className="font-mono text-text-secondary">HTTP API token</span>.
                      </li>
                      <li>
                        Open Telegram, search for your bot, and send it <span className="font-mono text-text-secondary">/start</span>.
                      </li>
                      <li>
                        Open <span className="font-mono text-text-secondary break-all">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</span> in your browser — find{' '}
                        <span className="font-mono text-text-secondary">"chat":&#123;"id": 123456789&#125;</span> — that number is your <strong className="text-text-primary">Chat ID</strong>.
                      </li>
                    </ol>
                    <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-2">
                      ⚠ The Chat ID is your own <strong>numeric user ID</strong> (e.g. <span className="font-mono">123456789</span>), <em>not</em> the bot&apos;s username.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-text-muted">Bot Token (from BotFather)</label>
                    <input
                      type="password"
                      placeholder="123456789:AAF..."
                      value={tgBotToken}
                      onChange={(e) => setTgBotToken(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-text-primary text-sm font-mono focus:outline-none focus:border-sky-500 transition-colors"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-text-muted">Chat ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 123456789"
                      value={tgChatId}
                      onChange={(e) => setTgChatId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-text-primary text-sm font-mono focus:outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={saveTelegramConfig}
                      disabled={!tgBotToken.trim() || !tgChatId.trim()}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                    >
                      Save & continue
                    </button>
                    <button
                      onClick={resetTwoFASetup}
                      className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] text-text-muted hover:text-text-primary text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 — Send OTP */}
              {tgConfig && !tgSent && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-text-muted font-mono bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2">
                    <span className="text-sky-400">✓</span>
                    <span>Bot <span className="text-text-secondary">{tgConfig.masked_token}</span></span>
                    <span className="text-text-muted/40">·</span>
                    <span>Chat <span className="text-text-secondary">{tgConfig.chat_id}</span></span>
                    <button
                      onClick={() => setTgConfig(null)}
                      className="ml-auto text-text-muted/50 hover:text-text-muted transition-colors"
                      title="Change credentials"
                    >
                      ✎
                    </button>
                  </div>
                  <p className="text-xs text-text-muted">
                    Click below to send a 6-digit code to your Telegram chat.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={sendTelegramOtp}
                      disabled={tgSending}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                    >
                      {tgSending ? 'Sending…' : 'Send OTP via Telegram'}
                    </button>
                    <button
                      onClick={resetTwoFASetup}
                      className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.1)] text-text-muted hover:text-text-primary text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 — Verify OTP */}
              {tgConfig && tgSent && (
                <div className="space-y-3 max-w-xs">
                  <p className="text-xs text-text-muted">
                    Enter the code sent to your Telegram chat:
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={tgInput}
                    onChange={(e) => setTgInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-text-primary text-sm font-mono tracking-[0.3em] text-center focus:outline-none focus:border-sky-500 transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={verifyTelegram}
                    disabled={tgInput.length < 6}
                    className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-30 text-white text-sm font-semibold transition-colors"
                  >
                    Verify & Enable
                  </button>
                  <button
                    onClick={() => setTgSent(false)}
                    className="w-full text-xs text-text-muted hover:text-text-secondary transition-colors"
                  >
                    ← Resend code
                  </button>
                </div>
              )}

            </div>
          )}

          {twoFAMsg && (
            <p className={`text-xs px-3 py-2 rounded-lg ${
              twoFAMsg.toLowerCase().includes('enabled') || twoFAMsg.toLowerCase().includes('disabled')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {twoFAMsg}
            </p>
          )}
        </Panel>
      </section>

      {/* ── Backend Logs ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <SectionHeading>Backend Logs</SectionHeading>
          <button
            onClick={fetchLogs}
            className="text-[11px] text-text-muted hover:text-text-secondary transition-colors underline underline-offset-2"
          >
            Refresh
          </button>
        </div>
        <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#080909] p-4 max-h-72 overflow-y-auto font-mono text-[11px] space-y-0.5">
          {logs.length === 0 ? (
            <p className="text-text-muted py-4 text-center">No log entries yet — make some requests to the backend.</p>
          ) : logs.map((entry, i) => (
            <div key={i} className="flex gap-3 py-0.5">
              <span className="text-text-muted shrink-0 tabular-nums">{entry.ts}</span>
              <span className={
                entry.level === 'ERROR'   ? 'text-red-400 shrink-0' :
                entry.level === 'WARNING' ? 'text-amber-400 shrink-0' :
                'text-indigo-400 shrink-0'
              }>[{entry.level}]</span>
              <span className="text-text-secondary">{entry.message}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
