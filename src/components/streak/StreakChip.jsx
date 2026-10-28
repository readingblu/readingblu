import { Link } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { useStreak } from '../../hooks/useStreak'

export default function StreakChip({ userId }) {
  const { data, failed } = useStreak(userId)
  if (failed) return null

  const s = data?.streak
  const n = s?.current ?? 0
  const lit = Boolean(s?.goal_met_today)
  const risk = Boolean(s?.at_risk)

  let flame = 'text-ink/30'
  if (lit) flame = 'fill-orange-400 text-orange-500'
  else if (n > 0) flame = 'fill-orange-200 text-orange-400'

  return (
    <Link
      to="/streak"
      aria-label={`Reading streak: ${n} ${n === 1 ? 'day' : 'days'}`}
      title="Your reading streak"
      className="inline-flex h-10 items-center gap-1 rounded-full border-2 border-ink bg-white px-2.5 text-sm font-extrabold hover:bg-sky max-[379px]:hidden"
    >
      <Flame className={`h-5 w-5 ${flame} ${risk ? 'animate-pulse' : ''}`} aria-hidden="true" />
      {n}
    </Link>
  )
}