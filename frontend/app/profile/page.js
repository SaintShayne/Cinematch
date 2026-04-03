'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '../../components/auth/AuthGuard'
import PageHero from '../../components/layout/PageHero'
import SectionHeader from '../../components/ui/SectionHeader'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useAuth } from '../../lib/context/AuthContext'
import { createClient } from '../../lib/supabase/client'
import { useWatchlist } from '../../lib/hooks/useWatchlist'
import { useRecentlyViewed } from '../../lib/hooks/useRecentlyViewed'

function ProfileContent() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { watchlist } = useWatchlist()
  const { recentlyViewed } = useRecentlyViewed()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.display_name || ''
  )
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    setSaveMsg('')

    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() },
    })

    setSaving(false)
    setSaveMsg(error ? 'Failed to update. Try again.' : 'Profile updated.')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const avatar =
    user?.user_metadata?.avatar_url || null
  const initials = (
    user?.user_metadata?.display_name ||
    user?.email ||
    '?'
  )[0].toUpperCase()

  return (
    <div className="space-y-10 max-w-xl">
      <PageHero title="Profile" subtitle="Manage your CineMatch account" />

      {/* Avatar + name */}
      <div className="flex items-center gap-5">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-red/20 flex items-center justify-center text-2xl font-bold text-red">
            {initials}
          </div>
        )}
        <div>
          <p className="text-lg font-semibold text-text-primary">
            {user?.user_metadata?.display_name || 'No display name'}
          </p>
          <p className="text-sm text-text-secondary">{user?.email}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Watchlist', value: watchlist.length },
          { label: 'Recently viewed', value: recentlyViewed.length },
          { label: 'Member since', value: user?.created_at ? new Date(user.created_at).getFullYear() : '—' },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.06)] text-center"
          >
            <p className="text-2xl font-bold text-text-primary">{s.value}</p>
            <p className="text-2xs text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Edit display name */}
      <div>
        <SectionHeader title="Edit profile" />
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <Input
            label="Display name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={user?.email || ''}
            disabled
            inputClassName="opacity-50"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
            {saveMsg && (
              <p className={`text-xs ${saveMsg.includes('Failed') ? 'text-red' : 'text-green-400'}`}>
                {saveMsg}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
        <SectionHeader title="Account" />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/watchlist')}
          >
            View watchlist
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}
