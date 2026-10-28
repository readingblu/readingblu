import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BookMarked, Check, Flame, Loader2, Target, Trophy } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import Toast from '../components/Toast'
import { FlameBadge, WeekRow } from '../components/streak/StreakParts'
import { GoalCelebration } from '../components/streak/Celebrate'
import { useAuth } from '../context/AuthContext'
import { useStreak } from '../hooks/useStreak'
import { useToast } from '../hooks/useToast'
import { BOOK_BADGES, PAGE_BADGES, STREAK_BADGES } from '../lib/badges'
import { GOALS, addDays, dayKey, invalidateStreak, mondayOf, parseDay, streakMessage, userTimeZone } from '../lib/streak'
import { supabase } from '../lib/supabase'

function Calendar({ todayKey, days }) {
  const byDay = new Map(days.map((r) => [r.day, r]))
  const start = addDays(mondayOf(parseDay(todayKey)), -35)
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i)
    return { key: dayKey(date), num: date.getDate() }
  })

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-extrabold text-ink-soft sm:gap-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5 sm:gap-2">
        {cells.map(({ key, num }) => {
          const rec = byDay.get(key)
          const future = key > todayKey
          const isToday = key === todayKey
          const met = Boolean(rec?.met)
          const some = (rec?.pages ?? 0) > 0

          let cls = 'bg-sky text-ink-soft'
          if (met) cls = 'bg-orange-500 text-white'
          else if (some) cls = 'bg-orange-100 text-orange-700'

          return (
            <div
              key={key}
              title={met ? `${key}: goal reached` : some ? `${key}: ${rec.pages} pages` : key}
              className={`flex aspect-square items-center justify-center rounded-xl text-xs font-extrabold sm:text-sm ${cls} ${future ? 'opacity-40' : ''} ${isToday ? 'ring-2 ring-ink' : ''}`}
            >
              {met ? <Flame className="h-4 w-4 fill-white text-white" aria-label={`${key} goal reached`} /> : num}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Badge({ icon: Icon, name, hint, earned }) {
  return (
    <li className={`rounded-2xl border-2 p-3 text-center ${earned ? 'border-ink bg-white' : 'border-ink/15 bg-paper'}`}>
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${earned ? 'bg-lime' : 'bg-ink/10'}`}>
        <Icon className={`h-7 w-7 ${earned ? 'text-ink' : 'text-ink/30'}`} aria-hidden="true" />
      </div>
      <p className={`mt-2 break-words text-sm font-extrabold ${earned ? '' : 'text-ink-soft'}`}>{name}</p>
      <p className="text-xs font-semibold text-ink-soft">{earned ? 'Earned!' : hint}</p>
    </li>
  )
}

export default function StreakPage() {
  const { user } = useAuth()
  const { data, loading, failed, refresh } = useStreak(user?.id)
  const { message, show } = useToast()
  const [saving, setSaving] = useState(0)
  const [celebrate, setCelebrate] = useState(null)

  const changeGoal = async (pages) => {
    if (saving || data?.streak.goal === pages) return
    setSaving(pages)
    const { data: res, error } = await supabase.rpc('set_daily_goal', { p_goal: pages, p_tz: userTimeZone() })
    if (error || !res) {
      show('Could not change your goal. Please try again.')
    } else {
      invalidateStreak()
      await refresh()
      show(`Daily goal set to ${pages} pages`)
      if (res.goal_just_met) setCelebrate(res.streak.current)
    }
    setSaving(0)
  }

  const card = 'rounded-3xl border-2 border-ink bg-white p-4 sm:p-6'

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
        <Link to="/home" className="inline-flex items-center gap-1 text-sm font-extrabold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
          </div>
        )}

        {!loading && (failed || !data) && (
          <div role="alert" className="mt-6 rounded-3xl border-2 border-ink bg-white p-8 text-center">
            <p className="font-bold">We could not load your streak. Please refresh the page.</p>
          </div>
        )}

        {!loading && data && (
          <>
            {(() => {
              const s = data.streak
              return (
                <div className="mt-4 space-y-5">
                  <section className="overflow-hidden rounded-3xl border-2 border-ink bg-ink p-5 text-white sm:p-6">
                    <div className="flex items-center gap-4">
                      <FlameBadge lit={s.goal_met_today || s.current > 0} />
                      <div className="min-w-0">
                        <p className="text-5xl font-extrabold leading-none">{s.current}</p>
                        <p className="mt-1 text-lg font-bold text-white/85">day streak</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white/80">{streakMessage(s)}</p>
                    <div className="mt-4">
                      <WeekRow todayKey={data.today} days={data.days} />
                    </div>
                  </section>

                  <section aria-label="Your numbers" className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Trophy, value: s.longest, label: 'Longest streak' },
                      { icon: Target, value: s.total_pages, label: 'Pages read' },
                      { icon: BookMarked, value: data.finished_count, label: 'Books finished' },
                    ].map(({ icon: Icon, value, label }) => (
                      <div key={label} className="rounded-2xl border-2 border-ink bg-white p-3 text-center">
                        <Icon className="mx-auto h-5 w-5" aria-hidden="true" />
                        <p className="mt-1 text-2xl font-extrabold">{value}</p>
                        <p className="text-xs font-extrabold text-ink-soft">{label}</p>
                      </div>
                    ))}
                  </section>

                  <section className={card} aria-labelledby="goal-heading">
                    <h2 id="goal-heading" className="text-xl font-extrabold">
                      Daily goal
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-ink-soft">
                      Read this many pages in a day to grow your streak. Each page counts once a day.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Daily goal">
                      {GOALS.map((g) => {
                        const on = s.goal === g.pages
                        return (
                          <button
                            key={g.pages}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => changeGoal(g.pages)}
                            disabled={Boolean(saving)}
                            className={`rounded-2xl border-2 p-3 text-left transition ${on ? 'border-ink bg-lime' : 'border-ink/30 bg-white hover:bg-sky'} disabled:opacity-70`}
                          >
                            <span className="flex items-center justify-between gap-2 font-extrabold">
                              {g.name}
                              {saving === g.pages ? <Loader2 className="h-4 w-4 animate-spin" /> : on ? <Check className="h-4 w-4" /> : null}
                            </span>
                            <span className="block text-2xl font-extrabold">{g.pages} pages</span>
                            <span className="block text-xs font-semibold text-ink-soft">{g.hint}</span>
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  <section className={card} aria-labelledby="cal-heading">
                    <h2 id="cal-heading" className="text-xl font-extrabold">
                      Last 6 weeks
                    </h2>
                    <div className="mt-3">
                      <Calendar todayKey={data.today} days={data.days} />
                    </div>
                    <p className="mt-3 text-xs font-semibold text-ink-soft">
                      A flame means you reached your goal that day. A pale day means you read a little.
                    </p>
                  </section>

                  <section className={card} aria-labelledby="badges-heading">
                    <h2 id="badges-heading" className="text-xl font-extrabold">
                      Badges
                    </h2>

                    <h3 className="mt-4 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Streak badges</h3>
                    <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {STREAK_BADGES.map((b) => (
                        <Badge key={b.days} icon={b.icon} name={b.name} hint={`${b.days}-day streak`} earned={s.longest >= b.days} />
                      ))}
                    </ul>

                    <h3 className="mt-5 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Book badges</h3>
                    <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {BOOK_BADGES.map((b) => (
                        <Badge
                          key={b.books}
                          icon={b.icon}
                          name={b.name}
                          hint={`Finish ${b.books} ${b.books === 1 ? 'book' : 'books'}`}
                          earned={data.finished_count >= b.books}
                        />
                      ))}
                    </ul>

                    <h3 className="mt-5 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Page badges</h3>
                    <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PAGE_BADGES.map((b) => (
                        <Badge key={b.pages} icon={b.icon} name={b.name} hint={`Read ${b.pages} pages`} earned={s.total_pages >= b.pages} />
                      ))}
                    </ul>
                  </section>

                  <Link
                    to="/finished"
                    className="flex items-center justify-between rounded-3xl border-2 border-ink bg-lime px-5 py-4 font-extrabold shadow-[0_4px_0_0_var(--color-ink)]"
                  >
                    <span className="flex items-center gap-2">
                      <BookMarked className="h-5 w-5" /> See my finished books
                    </span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )
            })()}
          </>
        )}
      </div>

      {celebrate !== null && <GoalCelebration fixed streak={celebrate} onClose={() => setCelebrate(null)} />}
      <Toast message={message} />
    </AppLayout>
  )
}