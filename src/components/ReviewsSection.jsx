import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Stars, StarInput } from './StarRating'

const PAGE_SIZE = 10
const FIELDS = 'id, user_id, rating, comment, created_at, author_name'

function shortName(name) {
  const parts = (name || 'Reader').trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

export default function ReviewsSection({ bookId, userId, onChanged, notify }) {
  const [reviews, setReviews] = useState([])
  const [total, setTotal] = useState(0)
  const [mine, setMine] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [list, own] = await Promise.all([
      supabase
        .from('reviews')
        .select(FIELDS, { count: 'exact' })
        .eq('book_id', bookId)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1),
      supabase.from('reviews').select(FIELDS).eq('book_id', bookId).eq('user_id', userId).maybeSingle(),
    ])

    if (list.error) {
      setError('We could not load the reviews. Please try again.')
      setLoading(false)
      return
    }

    setError('')
    setReviews(list.data)
    setTotal(list.count ?? list.data.length)
    setMine(own.data ?? null)
    if (own.data) {
      setRating(own.data.rating)
      setComment(own.data.comment || '')
    }
    setLoading(false)
  }, [bookId, userId])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    const { data, error: err } = await supabase
      .from('reviews')
      .select(FIELDS)
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .range(reviews.length, reviews.length + PAGE_SIZE - 1)
    if (err) {
      notify('Could not load more reviews.')
    } else {
      setReviews((prev) => {
        const seen = new Set(prev.map((r) => r.id))
        return [...prev, ...data.filter((r) => !seen.has(r.id))]
      })
    }
    setLoadingMore(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (rating < 1) {
      notify('Please choose a star rating first.')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.from('reviews').upsert(
      { book_id: bookId, user_id: userId, rating, comment: comment.trim() || null },
      { onConflict: 'book_id,user_id' },
    )
    if (err) {
      notify('Could not save your review. Please try again.')
    } else {
      notify('Thank you! Your review was saved.')
      await load()
      onChanged()
    }
    setSaving(false)
  }

  const remove = async () => {
    if (!mine) return
    setSaving(true)
    const { error: err } = await supabase.from('reviews').delete().eq('id', mine.id)
    if (err) {
      notify('Could not delete your review. Please try again.')
    } else {
      setRating(0)
      setComment('')
      setMine(null)
      notify('Your review was deleted.')
      await load()
      onChanged()
    }
    setSaving(false)
  }

  return (
    <section aria-labelledby="reviews-heading" className="mt-10">
      <h2 id="reviews-heading" className="text-2xl font-extrabold">
        Ratings & reviews
      </h2>

      <form onSubmit={submit} className="mt-4 rounded-3xl border-2 border-ink bg-white p-4 sm:p-6">
        <h3 className="text-lg font-extrabold">{mine ? 'Your review' : 'Share your feedback'}</h3>
        <div className="mt-2">
          <StarInput value={rating} onChange={setRating} />
        </div>
        <label htmlFor="review-comment" className="sr-only">
          Your comment (optional)
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="What did you think of this book? (optional)"
          className="mt-3 w-full resize-y rounded-2xl border-2 border-ink/30 bg-paper p-3 text-base font-semibold outline-none focus:border-ink focus:bg-white"
        />
        <div className="mt-1 text-right text-xs font-bold text-ink-soft">{comment.length}/1000</div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lime px-6 font-extrabold shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {mine ? 'Update review' : 'Submit review'}
          </button>
          {mine && (
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-2 border-ink bg-white px-6 font-extrabold hover:bg-sky disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      </form>

      <div className="mt-6">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading reviews" />
          </div>
        )}

        {!loading && error && (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && reviews.length === 0 && (
          <p className="rounded-2xl bg-sky p-4 text-center text-sm font-bold">No reviews yet. Be the first to share your thoughts.</p>
        )}

        {!loading && !error && reviews.length > 0 && (
          <>
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-2xl border-2 border-ink/15 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 break-words font-extrabold">
                      {shortName(r.author_name)}
                      {r.user_id === userId && (
                        <span className="ml-2 rounded-full bg-lime px-2 py-0.5 text-xs font-extrabold">You</span>
                      )}
                    </p>
                    <time dateTime={r.created_at} className="text-xs font-bold text-ink-soft">
                      {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </time>
                  </div>
                  <div className="mt-1">
                    <Stars value={r.rating} />
                  </div>
                  {r.comment && <p className="mt-2 whitespace-pre-line break-words text-sm font-semibold text-ink-soft">{r.comment}</p>}
                </li>
              ))}
            </ul>

            {reviews.length < total && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-6 py-2.5 font-extrabold hover:bg-sky disabled:opacity-60"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Show more reviews
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}