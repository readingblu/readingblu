import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Loader2, MessageSquare, Trash2 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import Toast from '../components/Toast'
import { Stars } from '../components/StarRating'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 20
const FIELDS = 'id, rating, comment, created_at, author_name, books(title, slug)'

export default function AdminReviewsPage() {
  const { message, show } = useToast()
  const [reviews, setReviews] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const requestId = useRef(0)

  const fetchPage = useCallback(
    (offset) =>
      supabase
        .from('reviews')
        .select(FIELDS, { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id')
        .range(offset, offset + PAGE_SIZE - 1),
    [],
  )

  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    setError('')
    fetchPage(0).then(({ data, error: err, count }) => {
      if (id !== requestId.current) return
      if (err) {
        setError('We could not load the reviews. Please try again.')
        setReviews([])
      } else {
        setReviews(data)
        setTotal(count ?? data.length)
      }
      setLoading(false)
    })
  }, [fetchPage, reloadKey])

  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    const { data, error: err, count } = await fetchPage(reviews.length)
    if (err) {
      show('Could not load more reviews.')
    } else {
      setReviews((prev) => {
        const seen = new Set(prev.map((r) => r.id))
        return [...prev, ...data.filter((r) => !seen.has(r.id))]
      })
      if (count != null) setTotal(count)
    }
    setLoadingMore(false)
  }

  const remove = async (review) => {
    const ok = window.confirm('Delete this review permanently? The book rating will update automatically.')
    if (!ok) return
    setBusyId(review.id)
    const { data, error: err } = await supabase.from('reviews').delete().eq('id', review.id).select('id')
    if (err || !data || data.length === 0) {
      show('Could not delete the review. Please try again.')
    } else {
      setReviews((prev) => prev.filter((r) => r.id !== review.id))
      setTotal((t) => Math.max(0, t - 1))
      show('Review deleted')
    }
    setBusyId(null)
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-extrabold hover:underline">
          <ArrowLeft className="h-4 w-4" /> All books
        </Link>

        <div className="mt-3 mb-5">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
            <MessageSquare className="h-7 w-7" /> Admin: reviews
          </h1>
          {!loading && !error && (
            <p className="text-sm font-bold text-ink-soft">
              {total} {total === 1 ? 'review' : 'reviews'}, newest first
            </p>
          )}
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

        {!loading && !error && reviews.length === 0 && (
          <div className="rounded-3xl border-2 border-ink bg-white p-8 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-ink-soft" />
            <p className="mt-3 text-lg font-extrabold">No reviews yet</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">Reviews from readers will appear here.</p>
          </div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <>
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-3xl border-2 border-ink bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 break-words font-extrabold">{r.author_name || 'Reader'}</p>
                    <time dateTime={r.created_at} className="text-xs font-bold text-ink-soft">
                      {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </time>
                  </div>

                  {r.books && (
                    <Link to={`/book/${r.books.slug}`} className="mt-0.5 inline-block break-words text-sm font-bold text-ink-soft underline">
                      {r.books.title}
                    </Link>
                  )}

                  <div className="mt-1">
                    <Stars value={r.rating} />
                  </div>

                  {r.comment ? (
                    <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold text-ink-soft">{r.comment}</p>
                  ) : (
                    <p className="mt-2 text-sm font-semibold italic text-ink-soft/70">Rating only, no comment.</p>
                  )}

                  <button
                    type="button"
                    onClick={() => remove(r)}
                    disabled={busyId === r.id}
                    className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold hover:bg-sky disabled:opacity-60"
                  >
                    {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete
                  </button>
                </li>
              ))}
            </ul>

            {reviews.length < total && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-8 py-3 font-extrabold shadow-[0_4px_0_0_var(--color-ink)] hover:bg-sky disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Toast message={message} />
    </AppLayout>
  )
}