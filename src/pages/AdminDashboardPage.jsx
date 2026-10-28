import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertCircle, BookOpen, Flag, Heart, Loader2, MessageSquare, RefreshCw, Users } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { supabase } from '../lib/supabase'

function StatCard({ icon: Icon, label, value, note, to, highlight }) {
  const body = (
    <>
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${highlight ? 'bg-blush' : 'bg-lime'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
      <p className="text-sm font-extrabold">{label}</p>
      {note && <p className="mt-0.5 text-xs font-semibold text-ink-soft">{note}</p>}
    </>
  )
  const cls = 'rounded-3xl border-2 border-ink bg-white p-4 shadow-[0_4px_0_0_var(--color-ink)]'
  return to ? (
    <Link to={to} className={`${cls} block transition hover:-translate-y-0.5`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    supabase.rpc('admin_stats').then(({ data, error: err }) => {
      if (!active) return
      if (err || !data) {
        setError('We could not load the numbers. Please try again.')
        setStats(null)
      } else {
        setStats(data)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [reloadKey])

  const linkBtn =
    'inline-flex h-10 items-center rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold hover:bg-sky'

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-5 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Admin: dashboard</h1>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold hover:bg-sky disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/admin" className={linkBtn}>Books</Link>
          <Link to="/admin/reviews" className={linkBtn}>Reviews</Link>
          <Link to="/admin/reports" className={linkBtn}>Reports</Link>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="mt-6 rounded-3xl border-2 border-ink bg-white p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-blush" />
            <p className="mt-3 font-bold">{error}</p>
          </div>
        )}

        {!loading && stats && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              <StatCard icon={Users} label="Readers" value={stats.readers} note={`${stats.new_readers_7d} new in the last 7 days`} />
              <StatCard icon={BookOpen} label="Published books" value={stats.books_published} note={`${stats.books_hidden} hidden`} to="/admin" />
              <StatCard icon={MessageSquare} label="Reviews" value={stats.reviews} to="/admin/reviews" />
              <StatCard icon={Heart} label="Saved books" value={stats.saved} note="hearts from all readers" />
              <StatCard
                icon={Flag}
                label="Open reports"
                value={stats.open_reports}
                note={stats.open_reports > 0 ? 'Please take a look' : 'All clear'}
                to="/admin/reports"
                highlight={stats.open_reports > 0}
              />
              <StatCard
                icon={Activity}
                label="Active readers (24h)"
                value={stats.active_readers_24h}
                note={`${stats.pages_opened_24h} pages opened`}
              />
            </div>

            <section className="mt-8 rounded-3xl border-2 border-ink bg-white p-5">
              <h2 className="text-xl font-extrabold">Most read books (last 7 days)</h2>
              {stats.top_books_7d.length === 0 ? (
                <p className="mt-2 text-sm font-semibold text-ink-soft">No reading yet in the last 7 days.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {stats.top_books_7d.map((b, i) => (
                    <li key={b.slug} className="flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-2.5">
                      <span className="min-w-0 break-words font-bold">
                        {i + 1}. <Link to={`/book/${b.slug}`} className="underline">{b.title}</Link>
                      </span>
                      <span className="shrink-0 text-sm font-extrabold">{b.pages} pages</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <p className="mt-4 text-xs font-semibold text-ink-soft">
              These numbers come from data ReadingBlu already stores, with no tracking tools. “Pages opened” counts the pages readers unlocked, so it is a close estimate and not exact analytics.
            </p>
          </>
        )}
      </div>
    </AppLayout>
  )
}