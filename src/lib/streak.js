import { supabase } from './supabase'

export const GOALS = [
  { pages: 5, name: 'Easy', hint: 'A quick peek every day' },
  { pages: 10, name: 'Steady', hint: 'A cosy reading habit' },
  { pages: 20, name: 'Bookworm', hint: 'For true story fans' },
]

export function userTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

// ---- date helpers (days are plain "YYYY-MM-DD" text) ----
export function parseDay(text) {
  const [y, m, d] = String(text).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function addDays(date, n) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + n)
  return copy
}

// Weeks start on Monday
export function mondayOf(date) {
  return addDays(date, -((date.getDay() + 6) % 7))
}

export function streakMessage(s) {
  const left = Math.max(0, s.goal - s.today_pages)
  const pages = (n) => `${n} ${n === 1 ? 'page' : 'pages'}`
  if (s.goal_met_today) {
    return s.current > 1 ? `Goal complete! Come back tomorrow to reach ${s.current + 1} days.` : 'Goal complete! Come back tomorrow to keep it going.'
  }
  if (s.current > 0) return `Read ${pages(left)} more today to keep your ${s.current}-day streak.`
  if (s.today_pages > 0) return `Read ${pages(left)} more today to start a streak.`
  if (s.longest > 0) return `Your streak ended. Read ${pages(s.goal)} today to start a new one!`
  return `Read ${pages(s.goal)} today to start your streak!`
}

// ---- one shared request, so the header and the page do not ask twice ----
let cache = null
const CACHE_MS = 4000

export function fetchStreak(userId, force = false) {
  const now = Date.now()
  if (!force && cache && cache.userId === userId && now - cache.at < CACHE_MS) return cache.promise

  const promise = Promise.resolve(supabase.rpc('get_streak', { p_tz: userTimeZone() })).then(({ data, error }) => {
    if (error || !data) throw error || new Error('Could not load your streak.')
    return data
  })
  const entry = { userId, at: now, promise }
  cache = entry
  promise.catch(() => {
    if (cache === entry) cache = null
  })
  return promise
}

export function invalidateStreak() {
  cache = null
}