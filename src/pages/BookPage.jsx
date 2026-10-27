import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Check, Eye, Heart, Loader2, ShoppingCart, Sparkles } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import PreviewModal from '../components/PreviewModal'
import ReviewsSection from '../components/ReviewsSection'
import Toast from '../components/Toast'
import { Stars } from '../components/StarRating'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../hooks/useFavorites'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'

export default function BookPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { ids: favoriteIds, toggle } = useFavorites(user?.id)
  const { message, show } = useToast()

  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [coverFailed, setCoverFailed] = useState(false)
  const [owned, setOwned] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError(false)
    setBook(null)
    setOwned(false)
    setCoverFailed(false)
    setPreviewOpen(false)

    supabase
      .from('books')
      .select(
        'id, title, author, description, cover_url, page_count, rating_avg, rating_count, categories(name), book_previews(id, page_number, image_url)',
      )
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setLoadError(true)
        } else if (data) {
          const previews = [...(data.book_previews || [])].sort((a, b) => a.page_number - b.page_number)
          setBook({ ...data, book_previews: previews })
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug])

  const bookId = book?.id
  const userId = user?.id

  useEffect(() => {
    if (!bookId || !userId) return undefined
    let active = true
    supabase
      .from('purchases')
      .select('id')
      .eq('book_id', bookId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setOwned(Boolean(data))
      })
    return () => {
      active = false
    }
  }, [bookId, userId])

  const refreshRating = useCallback(async () => {
    if (!bookId) return
    const { data } = await supabase.from('books').select('rating_avg, rating_count').eq('id', bookId).maybeSingle()
    if (data) setBook((b) => (b ? { ...b, ...data } : b))
  }, [bookId])

  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate('/home')
  }

  const saved = bookId ? favoriteIds.has(bookId) : false

  const handleSave = async () => {
    const wasSaved = saved
    const ok = await toggle(bookId)
    if (!ok) show('Could not update your saved books. Please try again.')
    else show(wasSaved ? 'Removed from Saved' : 'Saved to your list')
  }

  const openPreview = () => {
    if (book.book_previews.length === 0) {
      show('Preview pages for this book are not available yet.')
      return
    }
    setPreviewOpen(true)
  }

  const closePreview = useCallback(() => setPreviewOpen(false), [])

  const hasRating = book && book.rating_count > 0
  const secondaryBtn =
    'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-white px-6 font-extrabold transition hover:bg-sky sm:w-auto'

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-5 sm:py-10">
        <button type="button" onClick={goBack} className="inline-flex items-center gap-1 text-sm font-extrabold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
          </div>
        )}

        {!loading && loadError && (
          <div role="alert" className="mt-8 rounded-3xl border-2 border-ink bg-white p-8 text-center">
            <p className="text-lg font-extrabold">We could not load this book</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">Please check your connection and refresh the page.</p>
          </div>
        )}

        {!loading && !loadError && !book && (
          <div className="mt-8 rounded-3xl border-2 border-ink bg-white p-8 text-center">
            <p className="text-lg font-extrabold">Book not found</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">It may have been removed or is not published.</p>
          </div>
        )}

        {!loading && book && (
          <>
            <div className="mt-6 grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8">
              <div className="mx-auto w-48 sm:w-full">
                {coverFailed || !book.cover_url ? (
                  <div className="flex aspect-[2/3] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-ink to-ink-soft text-lime">
                    <BookOpen className="h-14 w-14" />
                  </div>
                ) : (
                  <img
                    src={book.cover_url}
                    alt={`Cover of ${book.title}`}
                    draggable="false"
                    onError={() => setCoverFailed(true)}
                    className="aspect-[2/3] w-full rounded-2xl border-2 border-ink bg-sky object-cover shadow-[0_6px_0_0_var(--color-ink)]"
                  />
                )}
              </div>

              <div className="min-w-0">
                <h1 className="break-words text-3xl font-extrabold sm:text-4xl">{book.title}</h1>

                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky px-3 py-1 text-sm font-extrabold">
                  <Sparkles className="h-4 w-4 text-lime-deep" /> AI Generated
                </p>

                <p className="mt-3 text-sm font-bold text-ink-soft">
                  {book.categories?.name ? `${book.categories.name} · ` : ''}
                  {book.page_count ? `${book.page_count} pages · ` : ''}
                  From {book.author}
                </p>

                <p className="mt-4 whitespace-pre-line break-words leading-relaxed text-ink-soft">
                  {book.description || 'A description for this book is coming soon.'}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold">
                  <Stars value={book.rating_avg} size="h-5 w-5" />
                  {hasRating ? (
                    <span>
                      {Number(book.rating_avg).toFixed(1)}{' '}
                      <span className="font-semibold text-ink-soft">
                        ({book.rating_count} {book.rating_count === 1 ? 'rating' : 'ratings'})
                      </span>
                    </span>
                  ) : (
                    <span className="font-semibold text-ink-soft">No ratings yet</span>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => navigate(`/read/${slug}`)}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lime px-6 font-extrabold shadow-[0_4px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none sm:w-auto"
                  >
                    <BookOpen className="h-5 w-5" /> Read For Free
                  </button>

                  <button type="button" onClick={openPreview} className={secondaryBtn}>
                    <Eye className="h-5 w-5" /> Preview
                  </button>

                  {owned ? (
                    <span className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sky px-6 font-extrabold sm:w-auto">
                      <Check className="h-5 w-5 text-lime-deep" /> In your Library
                    </span>
                  ) : (
                    <button type="button" onClick={() => show('Payments are coming soon.')} className={secondaryBtn}>
                      <ShoppingCart className="h-5 w-5" /> Buy this
                    </button>
                  )}

                  <button type="button" onClick={handleSave} aria-pressed={saved} className={secondaryBtn}>
                    <Heart className={`h-5 w-5 ${saved ? 'fill-blush text-blush' : ''}`} />
                    {saved ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            <ReviewsSection key={book.id} bookId={book.id} userId={user.id} onChanged={refreshRating} notify={show} />
          </>
        )}
      </div>

      {previewOpen && book && <PreviewModal title={book.title} pages={book.book_previews} onClose={closePreview} />}

      <Toast message={message} />
    </AppLayout>
  )
}