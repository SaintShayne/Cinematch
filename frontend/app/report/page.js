'use client'

import { useState, useRef } from 'react'
import PageHero from '../../components/layout/PageHero'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const CATEGORIES = [
  { value: 'bug',      label: 'Bug Report',       desc: 'Something is broken or not working as expected' },
  { value: 'feature',  label: 'Feature Request',  desc: 'An idea for something new or improved' },
  { value: 'feedback', label: 'General Feedback',  desc: 'Anything else you want to share' },
]

const ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.webm,.pdf'
const LIMITS = {
  image: { types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], maxMB: 5 },
  video: { types: ['video/mp4', 'video/quicktime', 'video/webm'],         maxMB: 20 },
  doc:   { types: ['application/pdf'],                                    maxMB: 10 },
}

function validateFile(file) {
  for (const { types, maxMB } of Object.values(LIMITS)) {
    if (types.includes(file.type)) {
      if (file.size > maxMB * 1024 * 1024)
        return `File too large. Max size for this type is ${maxMB} MB.`
      return null
    }
  }
  return 'Unsupported file type. Allowed: JPG, PNG, GIF, WEBP, MP4, MOV, WEBM, PDF.'
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ReportPage() {
  const [category,    setCategory]    = useState('bug')
  const [subject,     setSubject]     = useState('')
  const [description, setDescription] = useState('')
  const [email,       setEmail]       = useState('')
  const [file,        setFile]        = useState(null)
  const [fileError,   setFileError]   = useState(null)
  const [status,      setStatus]      = useState(null)
  const fileRef = useRef(null)

  const handleFile = (selected) => {
    setFileError(null)
    if (!selected) { setFile(null); return }
    const err = validateFile(selected)
    if (err) { setFileError(err); setFile(null); return }
    setFile(selected)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (fileError) return
    setStatus('loading')
    try {
      const fd = new FormData()
      fd.append('category',    category)
      fd.append('subject',     subject)
      fd.append('description', description)
      if (email) fd.append('email', email)
      if (file)  fd.append('attachment', file)

      const res  = await fetch(`${API}/report`, { method: 'POST', body: fd })
      const data = await res.json()
      setStatus(data.success ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="space-y-8 max-w-xl">
        <PageHero title="Report an Issue" subtitle="Help us make CineMatch better." />
        <div className="p-8 rounded-2xl bg-surface-elevated border border-[rgba(255,255,255,0.08)] text-center">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 mx-auto text-green-400 mb-3">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <p className="text-text-primary font-medium mb-1">Report sent</p>
          <p className="text-sm text-text-secondary">Thanks for taking the time. We read every report.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-xl">
      <PageHero
        title="Report an Issue"
        subtitle="Found a bug or have feedback? Let us know."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-text-primary uppercase tracking-widest">
            Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  category === c.value
                    ? 'bg-red/10 border-red/40 text-red'
                    : 'bg-surface-elevated border-[rgba(255,255,255,0.07)] text-text-secondary hover:border-[rgba(255,255,255,0.15)]'
                }`}
              >
                <p className="text-xs font-semibold">{c.label}</p>
                <p className="text-2xs text-text-muted mt-0.5 leading-tight">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary uppercase tracking-widest">
            Subject
          </label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Short summary of the issue"
            maxLength={120}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.07)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red/40 transition-colors"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary uppercase tracking-widest">
            Description
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail. What did you expect vs what actually happened?"
            rows={5}
            maxLength={2000}
            className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.07)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red/40 transition-colors resize-none"
          />
        </div>

        {/* Attachment */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary uppercase tracking-widest">
            Attachment <span className="text-text-muted font-normal normal-case">(optional)</span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.07)]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-text-muted flex-shrink-0">
                <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary truncate">{file.name}</p>
                <p className="text-2xs text-text-muted">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setFileError(null); if (fileRef.current) fileRef.current.value = '' }}
                className="text-text-muted hover:text-red transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full px-4 py-3 rounded-xl bg-surface-elevated border border-dashed border-[rgba(255,255,255,0.12)] text-sm text-text-muted hover:border-red/30 hover:text-text-secondary transition-colors text-center"
            >
              Click to attach a file
            </button>
          )}
          <p className="text-2xs text-text-muted leading-relaxed">
            Images (JPG, PNG, GIF, WEBP) up to 5 MB &middot; Videos (MP4, MOV, WEBM) up to 20 MB &middot; PDF up to 10 MB
          </p>
          {fileError && <p className="text-xs text-red">{fileError}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary uppercase tracking-widest">
            Email <span className="text-text-muted font-normal normal-case">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="So we can follow up if needed"
            className="w-full px-4 py-2.5 rounded-xl bg-surface-elevated border border-[rgba(255,255,255,0.07)] text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red/40 transition-colors"
          />
        </div>

        {status === 'error' && (
          <p className="text-xs text-red">Something went wrong. Please try again.</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading' || !!fileError}
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-red text-white hover:bg-red-bright transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? 'Sending...' : 'Submit report'}
        </button>
      </form>
    </div>
  )
}
