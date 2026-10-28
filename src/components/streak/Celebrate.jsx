import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Trophy, X } from 'lucide-react'
import { badgeForBooks, badgeForStreak } from '../../lib/badges'
import './streak.css'

const COLORS = ['#8be31a', '#ff8fa3', '#fbbf24', '#38bdf8', '#ffffff']

function Confetti({ count = 28 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (((i * 53) % 100) / 100) * 0.6,
        dur: 1.7 + ((i * 29) % 10) / 10,
        color: COLORS[i % COLORS.length],
        size: 6 + (i % 4) * 2,
        rot: (i * 47) % 360,
      })),
    [count],
  )

  return (
    <div className="rb-confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            '--dur': `${p.dur}s`,
            '--delay': `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

// A friendly card when the daily goal is reached. It closes by itself after a few seconds.
export function GoalCelebration({ streak, onClose, fixed = false }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const badge = badgeForStreak(streak)

  useEffect(() => {
    const timer = setTimeout(() => closeRef.current(), 7000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`pointer-events-none ${fixed ? 'fixed' : 'absolute'} inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-[60] flex justify-center px-3`}
    >
      <div
        role="status"
        aria-live="polite"
        className="rb-slide pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-ink bg-white p-4 text-ink shadow-xl"
      >
        <Confetti />
        <div className="relative flex items-center gap-3">
          <div className="rb-flame flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100">
            <Flame className="h-9 w-9 fill-orange-400 text-orange-500" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold leading-tight">{streak === 1 ? 'Streak started!' : `${streak} day streak!`}</p>
            <p className="text-sm font-semibold text-ink-soft">Daily goal complete. Great reading!</p>
            {badge && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-0.5 text-xs font-extrabold">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> New badge: {badge.name}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-sky"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// A bigger moment when a book is finished
export function FinishCelebration({ title, count, onClose }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const badge = badgeForBooks(count)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="absolute inset-0 z-[65] flex items-center justify-center bg-ink/80 p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-title"
    >
      <div className="rb-pop relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-ink bg-white p-6 text-center text-ink">
        <Confetti count={40} />
        <div className="relative">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-lime">
            <Trophy className="h-10 w-10" aria-hidden="true" />
          </div>
          <h2 id="finish-title" className="mt-3 text-2xl font-extrabold">
            Book finished!
          </h2>
          <p className="mt-1 break-words font-bold">{title}</p>
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            {count === 1 ? 'Your first book is on your shelf.' : `That is ${count} books on your shelf.`}
          </p>
          {badge && (
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-lime px-3 py-1 text-sm font-extrabold">
              <Trophy className="h-4 w-4" aria-hidden="true" /> New badge: {badge.name}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/finished"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-lime font-extrabold shadow-[0_3px_0_0_var(--color-ink)]"
            >
              See my shelf
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-full border-2 border-ink bg-white font-extrabold hover:bg-sky"
            >
              Keep reading
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}