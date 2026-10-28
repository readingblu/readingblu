import { Flame } from 'lucide-react'
import { addDays, dayKey, mondayOf, parseDay } from '../../lib/streak'
import './streak.css'

// Flame badge for dark backgrounds
export function FlameBadge({ lit, size = 'lg' }) {
  const box = size === 'lg' ? 'h-20 w-20' : 'h-14 w-14'
  const icon = size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full ${box} ${lit ? 'bg-orange-500/20' : 'bg-white/10'}`}>
      <Flame
        aria-hidden="true"
        className={`${icon} ${lit ? 'rb-flame fill-orange-400 text-orange-500' : 'fill-white/10 text-white/40'}`}
      />
    </div>
  )
}

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Monday to Sunday of the current week, for dark backgrounds
export function WeekRow({ todayKey, days }) {
  const byDay = new Map((days || []).map((r) => [r.day, r]))
  const monday = mondayOf(parseDay(todayKey))

  return (
    <ol className="grid grid-cols-7 gap-1.5 sm:gap-3" aria-label="This week">
      {LABELS.map((label, i) => {
        const key = dayKey(addDays(monday, i))
        const rec = byDay.get(key)
        const future = key > todayKey
        const isToday = key === todayKey
        const met = Boolean(rec?.met)
        const some = (rec?.pages ?? 0) > 0

        let circle = 'bg-white/10'
        if (met) circle = 'bg-orange-500'
        else if (isToday) circle = 'border-2 border-lime bg-white/5'
        else if (future) circle = 'bg-white/5'

        const status = met ? 'goal reached' : some ? 'read a little' : future ? 'coming up' : 'no reading'

        return (
          <li key={key} className="flex min-w-0 flex-col items-center gap-1">
            <span className={`text-[11px] font-extrabold ${isToday ? 'text-lime' : 'text-white/60'}`}>{label}</span>
            <span className={`flex aspect-square w-full max-w-11 items-center justify-center rounded-full ${circle}`}>
              {met ? (
                <Flame className="h-5 w-5 fill-white text-white" aria-hidden="true" />
              ) : some && !future ? (
                <span className="h-2 w-2 rounded-full bg-white/70" aria-hidden="true" />
              ) : null}
            </span>
            <span className="sr-only">
              {NAMES[i]}: {status}
            </span>
          </li>
        )
      })}
    </ol>
  )
}