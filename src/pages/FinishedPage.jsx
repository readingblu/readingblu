import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, BookMarked, BookOpen, Loader2, Trophy } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../context/AuthContext'
import { BOOK_BADGES } from '../lib/badges'
import { supabase } from '../lib/supabase'

function Cover({ url }) {
  const [failed, setFailed] = useState(false)
  if (!url || failed) {
    return (
      <div className="flex aspect-[2/3] w-full items-center justify-center rounded-xl bg-gradient-to-br from-ink to-ink-soft text-lime">
        <BookOpen className="h-10 w-10" />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      draggable="false"
      onError={() => setFailed(true)}
      className="aspect-[2/3] w-full rounded-xl bg-sky object-cover"
    />
  )
}

export default function FinishedPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!user?.id) return undefined
    let active = true
    setLoading(true)
    setError('')

    supabase
      .from('book_reads')
      .select('finished_at, books(id, title, slug, cover_url, is_published)')
      .eq('user_id', user.id)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(500)
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) {
          setError('We could not load your shelf. Please try again.')
          setItems([])
        } else {
          setItems(data.filter((r) => r.books && r.books.is_published))
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user?.id, reloadKey])

  const count = items.length
  const next = BOOK_BADGES.find((b) => b.books > count)

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-5 sm:py-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
            <Trophy className="h-7 w-7 text-lime-deep" /> My shelf
          </h1>
          <Link to="/streak" className="inline-flex h-10 items-center rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold hover:bg-sky">
            My streak
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-3xl border-2 border-ink bg-white p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-blush" />
            <p className="mt-3 font-bold">{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-4 rounded-full bg-lime px-6 py-2.5 font-extrabold shadow-[0_3px_0_0_var(--color-ink)]"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && count === 0 && (
          <div className="rounded-3xl border-2 border-ink bg-white p-8 text-center">
            <BookMarked className="mx-auto h-10 w-10 text-ink-soft" />
            <p className="mt-3 text-lg font-extrabold">Your shelf is empty, for now</p>
            <p className="mx-auto mt-1 max-w-sm text-sm font-semibold text-ink-soft">
              Read most of a book and reach its last page, and it lands here with a trophy.
            </p>
            <Link
              to="/home"
              className="mt-4 inline-flex rounded-full bg-lime px-6 py-2.5 font-extrabold shadow-[0_3px_0_0_var(--color-ink)]"
            >
              Find a book
            </Link>
          </div>
        )}

        {!loading && !error && count > 0 && (
          <>
            <div className="mb-5 rounded-3xl border-2 border-ink bg-ink p-4 text-white sm:p-5">
              <p className="text-3xl font-extrabold">
                {count} {count === 1 ? 'book' : 'books'} finished
              </p>
              <p className="mt-1 text-sm font-semibold text-white/80">
                {next ? `${next.books - count} more to earn the ${next.name} badge.` : 'You have earned every book badge. Amazing!'}
              </p>
            </div>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {items.map(({ finished_at, books: b }) => (
                <li key={b.id} className="flex min-w-0 flex-col rounded-2xl border-2 border-ink bg-white p-2 shadow-[0_4px_0_0_var(--color-ink)] sm:p-3">
                  <div className="relative">
                    <Link to={`/book/${b.slug}`} tabIndex={-1} aria-hidden="true" className="block">
                      <Cover url={b.cover_url} />
                    </Link>
                    <span className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-lime shadow">
                      <Trophy className="h-4 w-4" aria-label="Finished" />
                    </span>
                  </div>
                  <h2 className="mt-2 line-clamp-2 min-h-9 break-words text-sm font-bold leading-tight sm:min-h-10 sm:text-base">{b.title}</h2>
                  <p className="text-xs font-bold text-ink-soft">
                    Finished{' '}
                    {new Date(finished_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <Link
                    to={`/read/${b.slug}`}
                    className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-lime text-sm font-extrabold text-ink shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    Read again
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </AppLayout>
  )
}