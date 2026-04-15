'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../../../lib/api'

function BackLink({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
    >
      ← Back
    </button>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function age(birthday, deathday) {
  const end = deathday ? new Date(deathday) : new Date()
  const start = new Date(birthday)
  const years = end.getFullYear() - start.getFullYear()
  const m = end.getMonth() - start.getMonth()
  return m < 0 || (m === 0 && end.getDate() < start.getDate()) ? years - 1 : years
}

// ── Known For horizontal scroll ───────────────────────────────────────────────

function KnownForCard({ movie }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <Link
      href={`/movies/${encodeURIComponent(movie.title)}`}
      className="flex-shrink-0 w-28 group"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-high border border-[rgba(255,255,255,0.06)] group-hover:border-[rgba(255,255,255,0.18)] transition-all duration-200 group-hover:-translate-y-0.5">
        {movie.poster_url && !imgErr ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            sizes="112px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted opacity-20">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-text-secondary group-hover:text-text-primary transition-colors leading-tight line-clamp-2 text-center">
        {movie.title}
      </p>
      {movie.character && (
        <p className="mt-0.5 text-[10px] text-text-muted text-center leading-tight line-clamp-1">
          {movie.character}
        </p>
      )}
    </Link>
  )
}

// ── Credits list ──────────────────────────────────────────────────────────────

function CreditRow({ credit, roleKey }) {
  return (
    <div className="flex items-baseline gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <span className="text-xs text-text-muted w-10 flex-shrink-0 tabular-nums">
        {credit.release_year ?? '—'}
      </span>
      <div className="flex-1 min-w-0">
        <Link
          href={`/movies/${encodeURIComponent(credit.title)}`}
          className="text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          {credit.title}
        </Link>
        {credit[roleKey] && (
          <span className="text-xs text-text-muted ml-2">
            {roleKey === 'character' ? `as ${credit.character}` : credit.job}
          </span>
        )}
      </div>
      {credit.vote_average > 0 && (
        <span className="text-xs text-yellow-400 flex-shrink-0">
          ★ {credit.vote_average.toFixed(1)}
        </span>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PersonSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="flex flex-col sm:flex-row gap-8">
        <div className="w-36 sm:w-44 flex-shrink-0">
          <div className="aspect-[2/3] rounded-xl skeleton" />
        </div>
        <div className="flex-1 space-y-4 pt-2">
          <div className="skeleton h-8 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/3 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
          <div className="skeleton h-4 w-2/5 rounded" />
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PersonPage() {
  const { slug } = useParams()
  const router = useRouter()
  const name = decodeURIComponent(slug)

  const [person, setPerson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('acting') // 'acting' | 'crew'

  useEffect(() => {
    setLoading(true)
    setError(false)
    api.person(name)
      .then((data) => setPerson(data.person))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [name])

  if (loading) return (
    <div className="space-y-6">
      <BackLink onClick={() => router.back()} />
      <PersonSkeleton />
    </div>
  )

  if (error || !person) return (
    <div className="space-y-6">
      <BackLink onClick={() => router.back()} />
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-4xl">🎬</p>
        <p className="text-text-primary font-semibold">Person not found</p>
        <p className="text-sm text-text-muted">"{name}" isn't in the CineMatch database.</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-elevated border border-[rgba(255,255,255,0.1)] text-text-secondary hover:text-text-primary transition-colors"
        >
          Go back
        </button>
      </div>
    </div>
  )

  const bioShort = person.biography?.length > 600
  const bioText = bioShort && !bioExpanded
    ? person.biography.slice(0, 600) + '…'
    : person.biography

  const hasActing = person.cast_credits?.length > 0
  const hasCrew   = person.crew_credits?.length > 0

  return (
    <div className="space-y-10">

      <BackLink onClick={() => router.back()} />

      {/* ── Hero ── */}
      <div className="flex flex-col sm:flex-row gap-8">

        {/* Profile photo */}
        <div className="w-36 sm:w-44 flex-shrink-0">
          <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated border border-[rgba(255,255,255,0.06)]">
            {person.profile_url && !imgError ? (
              <Image
                src={person.profile_url}
                alt={person.name}
                fill
                sizes="(max-width: 640px) 144px, 176px"
                className="object-cover object-top"
                onError={() => setImgError(true)}
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted opacity-20">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary leading-tight">
              {person.name}
            </h1>
            {person.known_for_department && (
              <p className="mt-1 text-sm text-text-muted">{person.known_for_department}</p>
            )}
          </div>

          <div className="space-y-1 text-sm">
            {person.birthday && (
              <p>
                <span className="text-text-muted">Born</span>
                <span className="ml-2 text-text-secondary">
                  {formatDate(person.birthday)}
                  {!person.deathday && (
                    <span className="ml-1 text-text-muted text-xs">
                      (age {age(person.birthday, null)})
                    </span>
                  )}
                </span>
              </p>
            )}
            {person.deathday && (
              <p>
                <span className="text-text-muted">Died</span>
                <span className="ml-2 text-text-secondary">
                  {formatDate(person.deathday)}
                  {person.birthday && (
                    <span className="ml-1 text-text-muted text-xs">
                      (aged {age(person.birthday, person.deathday)})
                    </span>
                  )}
                </span>
              </p>
            )}
            {person.place_of_birth && (
              <p>
                <span className="text-text-muted">Birthplace</span>
                <span className="ml-2 text-text-secondary">{person.place_of_birth}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Biography ── */}
      {person.biography && (
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
            Biography
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed max-w-2xl whitespace-pre-line">
            {bioText}
          </p>
          {bioShort && (
            <button
              onClick={() => setBioExpanded((v) => !v)}
              className="mt-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              {bioExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </section>
      )}

      {/* ── Known For ── */}
      {person.known_for?.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
            Known For
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {person.known_for.map((m) => (
              <KnownForCard key={m.title} movie={m} />
            ))}
          </div>
        </section>
      )}

      {/* ── Credits ── */}
      {(hasActing || hasCrew) && (
        <section>
          {/* Tab bar */}
          <div className="flex gap-1 mb-4 border-b border-[rgba(255,255,255,0.06)] pb-0">
            {hasActing && (
              <button
                onClick={() => setActiveTab('acting')}
                className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === 'acting'
                    ? 'text-text-primary border-red'
                    : 'text-text-muted border-transparent hover:text-text-secondary'
                }`}
              >
                Acting
                <span className="ml-1.5 text-text-muted font-normal">
                  {person.cast_credits.length}
                </span>
              </button>
            )}
            {hasCrew && (
              <button
                onClick={() => setActiveTab('crew')}
                className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
                  activeTab === 'crew'
                    ? 'text-text-primary border-red'
                    : 'text-text-muted border-transparent hover:text-text-secondary'
                }`}
              >
                {person.known_for_department === 'Directing' ? 'Directing' : 'Crew'}
                <span className="ml-1.5 text-text-muted font-normal">
                  {person.crew_credits.length}
                </span>
              </button>
            )}
          </div>

          {activeTab === 'acting' && hasActing && (
            <div className="bg-surface-elevated border border-[rgba(255,255,255,0.06)] rounded-xl px-5 py-1">
              {person.cast_credits.map((c, i) => (
                <CreditRow key={`${c.title}-${i}`} credit={c} roleKey="character" />
              ))}
            </div>
          )}

          {activeTab === 'crew' && hasCrew && (
            <div className="bg-surface-elevated border border-[rgba(255,255,255,0.06)] rounded-xl px-5 py-1">
              {person.crew_credits.map((c, i) => (
                <CreditRow key={`${c.title}-${i}`} credit={c} roleKey="job" />
              ))}
            </div>
          )}
        </section>
      )}

    </div>
  )
}
