import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, BookOpen, Eye, EyeOff, Loader2, Pencil, Plus, Star, StarOff, Trash2 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import { deleteBookCompletely } from '../lib/bookAssets'

const PAGE_SIZE = 30
const FIELDS = 'id, title, slug, cover_url, is_published, page_count, featured_at, created_at'

function Thumb({ url }) {
  const [failed, setFailed] = useState(false)
  if (!url || failed) {
    return (
      <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink to-ink-soft text-lime">
        <BookOpen className="h-6 w-6" />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=""
      onError={() => setFailed(true)}
      className="h-24 w-16 shrink-0 rounded-lg border-2 border-ink bg-sky object-cover"
    />
  )
}

export default function AdminBooksPage() {
  const { message, show } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const requestId = useRef(0)

  // Show the "book created" message once
  useEffect(() => {
    const notice = location.state?.notice
    if (notice) {
      show(notice)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPage = useCallback(
    (offset) =>
      supabase
        .from('books')
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
        setError('We could not load the books. Please try again.')
        setBooks([])
      } else {
        setBooks(data)
        setTotal(count ?? data.length)
      }
      setLoading(false)
    })
  }, [fetchPage, reloadKey])

  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    const { data, error: err, count } = await fetchPage(books.length)
    if (err) {
      show('Could not load more books.')
    } else {
      setBooks((prev) => {
        const seen = new Set(prev.map((b) => b.id))
        return [...prev, ...data.filter((b) => !seen.has(b.id))]
      })
      if (count != null) setTotal(count)
    }
    setLoadingMore(false)
  }

  const togglePublish = async (book) => {
    if (!book.is_published && !book.page_count) {
      show('Upload the book pages before publishing.')
      return
    }
    setBusyId(book.id)
    const next = !book.is_published
    const { error: err } = await supabase.from('books').update({ is_published: next }).eq('id', book.id)
    if (err) {
      show('Could not change the status. Please try again.')
    } else {
      setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, is_published: next } : b)))
      show(next ? 'Book published' : 'Book hidden from readers')
    }
    setBusyId(null)
  }

  const toggleFeature = async (book) => {
    if (!book.is_published && !book.featured_at) {
      show('Publish the book before featuring it.')
      return
    }
    setBusyId(book.id)
    const next = book.featured_at ? null : new Date().toISOString()
    const { error: err } = await supabase.from('books').update({ featured_at: next }).eq('id', book.id)
    if (err) {
      show('Could not change the featured status. Please try again.')
    } else {
      setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, featured_at: next } : b)))
      show(next ? 'Book is now featured on Home' : 'Book removed from Featured')
    }
    setBusyId(null)
  }

  const remove = async (book) => {
    const ok = window.confirm(
      `Delete "${book.title}" permanently?\n\nThis also deletes its pages, previews, reviews, saved hearts and any purchase records for it. If you only want to hide it, use Unpublish instead.`,
    )
    if (!ok) return
    setBusyId(book.id)
    try {
      await deleteBookCompletely(book.id)
      setBooks((prev) => prev.filter((b) => b.id !== book.id))
      setTotal((t) => Math.max(0, t - 1))
      show('Book deleted')
    } catch {
      show('Could not delete the book. Please try again.')
    }
    setBusyId(null)
  }

  const smallBtn =
    'inline-flex h-10 items-center justify-center gap-1.5 rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold hover:bg-sky disabled:opacity-60'

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-5 sm:py-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Admin: books</h1>
            {!loading && !error && (
              <p className="text-sm font-bold text-ink-soft">
                {total} {total === 1 ? 'book' : 'books'} in total
              </p>
            )}
          </div>
          <Link
            to="/admin/books/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-lime px-5 font-extrabold shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <Plus className="h-4 w-4" /> New book
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

        {!loading && !error && books.length === 0 && (
          <div className="rounded-3xl border-2 border-ink bg-white p-8 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-ink-soft" />
            <p className="mt-3 text-lg font-extrabold">No books yet</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">Click “New book” to add your first e-book.</p>
          </div>
        )}

        {!loading && !error && books.length > 0 && (
          <>
            <ul className="space-y-3">
              {books.map((book) => (
                <li key={book.id} className="flex gap-4 rounded-3xl border-2 border-ink bg-white p-4">
                  <Thumb url={book.cover_url} />
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-lg font-extrabold leading-tight">{book.title}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-extrabold">
                      <span className={`rounded-full px-2.5 py-1 ${book.is_published ? 'bg-lime' : 'bg-blush/40'}`}>
                        {book.is_published ? 'Published' : 'Hidden'}
                      </span>
                      <span className="rounded-full bg-sky px-2.5 py-1">
                        {book.page_count ? `${book.page_count} pages` : 'No pages yet'}
                      </span>
                      {book.featured_at && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-lime/60 px-2.5 py-1">
                          <Star className="h-3 w-3" /> Featured
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link to={`/admin/books/${book.id}`} className={smallBtn}>
                        <Pencil className="h-4 w-4" /> Edit
                      </Link>
                      <button type="button" onClick={() => togglePublish(book)} disabled={busyId === book.id} className={smallBtn}>
                        {book.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {book.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button type="button" onClick={() => toggleFeature(book)} disabled={busyId === book.id} className={smallBtn}>
                        {book.featured_at ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                        {book.featured_at ? 'Unfeature' : 'Feature'}
                      </button>
                      <button type="button" onClick={() => remove(book)} disabled={busyId === book.id} className={smallBtn}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {books.length < total && (
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