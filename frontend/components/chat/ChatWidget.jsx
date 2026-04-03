'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '../../lib/utils'
import { api } from '../../lib/api'
import { useWatchlist } from '../../lib/hooks/useWatchlist'

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim()
}

function MessageBubble({ message, onMovieClick }) {
  const isUser = message.role === 'user'
  const chips = (!isUser && message.suggested_movies) || []

  return (
    <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-red/20 flex-shrink-0 flex items-center justify-center text-sm">
          🎬
        </div>
      )}
      <div className="flex flex-col gap-2 max-w-[82%]">
        <div
          className={cn(
            'px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap break-words',
            isUser
              ? 'bg-red/20 text-text-primary rounded-tr-sm'
              : 'bg-surface-high text-text-secondary rounded-tl-sm'
          )}
        >
          {stripMarkdown(message.content)}
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((title) => (
              <button
                key={title}
                onClick={() => onMovieClick(title)}
                className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-[rgba(255,255,255,0.1)] text-2xs text-text-secondary hover:text-text-primary hover:border-red/40 hover:bg-red/8 transition-all duration-150 text-left"
              >
                🎬 {title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatWidget() {
  const router = useRouter()
  const { watchlist } = useWatchlist()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
        50
      )
      inputRef.current?.focus()
    }
  }, [open, messages])

  const handleMovieClick = (title) => {
    router.push(`/?q=${encodeURIComponent(title)}`)
    setOpen(false)
  }

  const sendMessage = async (textOverride) => {
    const text = (textOverride ?? input).trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const contextTitles = watchlist.slice(0, 5).map((w) => w.movie_title)
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const data = await api.chat(history, text, contextTitles)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          suggested_movies: data.suggested_movies || [],
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "Sorry, I'm having trouble connecting right now. Try again in a moment.",
          suggested_movies: [],
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 rounded-2xl bg-surface border border-[rgba(255,255,255,0.1)] shadow-elevated flex flex-col overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-2">
              <span className="text-base">🎬</span>
              <span className="text-sm font-semibold text-text-primary">CineMatch</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text-primary transition-colors p-1 rounded"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 max-h-80">
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-text-muted">
                  Ask me anything about movies — recommendations, directors, genres, or trivia.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {[
                    'Movies like Interstellar',
                    'Best horror films',
                    'Classic 90s comedies',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="px-2 py-1 rounded-md bg-surface-elevated text-2xs text-text-secondary hover:text-text-primary hover:bg-surface-high border border-[rgba(255,255,255,0.07)] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <MessageBubble
                  key={i}
                  message={msg}
                  onMovieClick={handleMovieClick}
                />
              ))
            )}

            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-red/20 flex-shrink-0 flex items-center justify-center text-sm">
                  🎬
                </div>
                <div className="px-3 py-2 rounded-xl rounded-tl-sm bg-surface-high">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-3 pb-3 pt-2 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about movies…"
                disabled={loading}
                className="flex-1 bg-surface-elevated border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red/50 transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red text-white hover:bg-red-bright disabled:opacity-40 transition-colors flex-shrink-0"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open CineMatch chat"
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center shadow-red-glow transition-all duration-200',
          open
            ? 'bg-surface-elevated border border-[rgba(255,255,255,0.12)] text-text-secondary'
            : 'bg-red text-white hover:bg-red-bright'
        )}
      >
        {open ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path
              fillRule="evenodd"
              d="M2 5a2 2 0 012-2h12a2 2 0 012 2v5a2 2 0 01-2 2H8.5l-3.5 3v-3H4a2 2 0 01-2-2V5z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
    </div>
  )
}