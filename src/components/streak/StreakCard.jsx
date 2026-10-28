import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useStreak } from '../../hooks/useStreak'
import { streakMessage } from '../../lib/streak'
import { FlameBadge, WeekRow } from './StreakParts'

export default function StreakCard({ userId }) {
  const { data, loading, failed } = useStreak(userId)

  if (loading) return <div className="mb-6 h-44 animate-pulse rounded-3xl bg-sky" aria-hidden="true" />
  if (failed || !data) return null

  const s = data.streak
  const lit = s.goal_met_today
  const done = Math.min(s.today_pages, s.goal)
  const pct = Math.round((done / s.goal) * 100)

  return (
    <section
      aria-label="Your reading streak"
      className="mb-6 overflow-hidden rounded-3xl border-2 border-ink bg-ink p-4 text-white shadow-[0_5px_0_0_rgba(11,31,75,0.35)] sm:p-5"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <FlameBadge lit={lit || s.current > 0} />
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-extrabold leading-none sm:text-4xl">
            {s.current} <span className="text-lg font-bold text-white/80 sm:text-xl">day {s.current === 1 ? 'streak' : 'streak'}</span>
          </p>
          <p className="mt-1.5 text-sm font-semibold text-white/80">{streakMessage(s)}</p>
        </div>
        <Link
          to="/streak"
          aria-label="See streak details"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      <div className="mt-4">
        <WeekRow todayKey={data.today} days={data.days} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-extrabold text-white/80">
          <span>Daily goal</span>
          <span>
            {done}/{s.goal} pages today
          </span>
        </div>
        <div
          className="mt-1.5 h-3 overflow-hidden rounded-full bg-white/15"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Daily reading goal"
        >
          <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </section>
  )
}