import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Heart, Loader2 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import BookCard from '../components/BookCard'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../hooks/useFavorites'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'

export default function SavedPage() {
  const { user } = useAuth()
  const { toggle } = useFavorites(user?.id)
  const { message, show } = useToast()

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
      .from('favorites')
      .select('created_at, books(id, title, slug, cover_url, rating_avg, rating_count, is_published)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error: err }) => {
        if (!active) return
        if (err) {
          setError('We could not load your saved books. Please try again.')
          setItems([])
        } else {
          setItems(data.map((row) => row.books).filter((b) => b && b.is_published))
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user?.id, reloadKey])

  const handleFavorite = async (bookId) => {
    const ok = await toggle(bookId)
    if (!ok) {
      show('Could not update your saved books. Please try again.')
      return
    }
    setItems((prev) => prev.filter((b) => b.id !== bookId))
    show('Removed from Saved')
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-5 sm:py-10">
        <div className="mb-5 flex items-end justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
            <Heart className="h-7 w-7 fill-blush text-blush" /> Saved books
          </h1>
          {!loading && !error && (
            <p className="text-sm font-bold text-ink-soft">
              {items.length} {items.length === 1 ? 'book' : 'books'}
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

        {!loading && !error && items.length === 0 && (
          <div className="rounded-3xl border-2 border-ink bg-white p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-ink-soft" />
            <p className="mt-3 text-lg font-extrabold">Nothing saved yet</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">Tap the heart on any book to keep it here.</p>
            <Link
              to="/home"
              className="mt-4 inline-flex rounded-full bg-lime px-6 py-2.5 font-extrabold shadow-[0_3px_0_0_var(--color-ink)]"
            >
              Browse books
            </Link>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((book) => (
              <BookCard key={book.id} book={book} liked onToggleFavorite={handleFavorite} />
            ))}
          </div>
        )}
      </div>

      <Toast message={message} />
    </AppLayout>
  )
}