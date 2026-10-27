import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, BookX, ChevronDown, LayoutGrid, Loader2 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import BookCard from '../components/BookCard'
import CategoryList from '../components/CategoryList'
import CategoryDrawer from '../components/CategoryDrawer'
import ContinueReading from '../components/ContinueReading'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../hooks/useFavorites'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 25
const SORTS = ['newest', 'rating', 'title']

function fetchBooks(offset, categoryId, search, sort) {
  let query = supabase
    .from('books')
    .select('id, title, slug, cover_url, rating_avg, rating_count', { count: 'exact' })
    .eq('is_published', true)

  if (sort === 'rating') {
    query = query.order('rating_avg', { ascending: false }).order('rating_count', { ascending: false })
  } else if (sort === 'title') {
    query = query.order('title', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  query = query.order('id').range(offset, offset + PAGE_SIZE - 1)

  if (categoryId) query = query.eq('category_id', categoryId)
  if (search) {
    const escaped = search.replace(/[\\%_]/g, (m) => `\\${m}`)
    query = query.ilike('title', `%${escaped}%`)
  }
  return query
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5" aria-hidden="true">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border-2 border-ink/10 bg-white p-2 sm:p-3">
          <div className="aspect-[2/3] w-full rounded-xl bg-sky" />
          <div className="mt-3 h-4 w-3/4 rounded bg-sky" />
          <div className="mt-2 h-3 w-1/2 rounded bg-sky" />
          <div className="mt-3 h-10 w-full rounded-full bg-sky" />
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const catSlug = params.get('cat') || ''
  const q = (params.get('q') || '').trim()
  const sort = SORTS.includes(params.get('sort')) ? params.get('sort') : 'newest'

  const [categories, setCategories] = useState([])
  const [catsReady, setCatsReady] = useState(false)
  const [books, setBooks] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const requestId = useRef(0)
  const { ids: favoriteIds, toggle } = useFavorites(user?.id)
  const { message, show } = useToast()

  const activeCategory = categories.find((c) => c.slug === catSlug) || null
  const categoryId = activeCategory?.id ?? null

  // Load categories once
  useEffect(() => {
    let active = true
    supabase
      .from('categories')
      .select('id, name, slug, group_name')
      .order('sort_order')
      .then(({ data, error: err }) => {
        if (!active) return
        if (!err && data) setCategories(data)
        setCatsReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  // Load the first page whenever the category, search or sort changes
  useEffect(() => {
    if (!catsReady) return
    const id = ++requestId.current
    setLoading(true)
    setError('')

    fetchBooks(0, categoryId, q, sort).then(({ data, error: err, count }) => {
      if (id !== requestId.current) return
      if (err) {
        setError('We could not load the books. Please check your connection and try again.')
        setBooks([])
        setTotal(0)
      } else {
        setBooks(data)
        setTotal(count ?? data.length)
      }
      setLoading(false)
    })
  }, [catsReady, categoryId, q, sort, reloadKey])

  const loadMore = async () => {
    if (loadingMore) return
    const id = requestId.current
    setLoadingMore(true)
    const { data, error: err, count } = await fetchBooks(books.length, categoryId, q, sort)
    if (id === requestId.current) {
      if (err) {
        show('Could not load more books. Please try again.')
      } else {
        setBooks((prev) => {
          const seen = new Set(prev.map((b) => b.id))
          return [...prev, ...data.filter((b) => !seen.has(b.id))]
        })
        if (count != null) setTotal(count)
      }
    }
    setLoadingMore(false)
  }

  const selectCategory = useCallback(
    (slug) => {
      const next = new URLSearchParams(params)
      if (slug) next.set('cat', slug)
      else next.delete('cat')
      setParams(next)
      setDrawerOpen(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [params, setParams],
  )

  const changeSort = (value) => {
    const next = new URLSearchParams(params)
    if (value === 'newest') next.delete('sort')
    else next.set('sort', value)
    setParams(next)
  }

  const clearFilters = () => {
    setParams({})
    setDrawerOpen(false)
  }

  const handleFavorite = async (bookId) => {
    const ok = await toggle(bookId)
    if (!ok) show('Could not update your saved books. Please try again.')
  }

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const heading = q ? `Results for “${q}”` : activeCategory ? activeCategory.name : 'All books'
  const hasMore = books.length < total
  const noFilters = !q && !activeCategory

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 lg:py-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-3xl border-2 border-ink bg-white p-3">
            <CategoryList categories={categories} active={catSlug && activeCategory ? catSlug : ''} onSelect={selectCategory} />
          </div>
        </aside>

        <section className="min-w-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="mb-4 flex h-11 w-full items-center justify-between rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold lg:hidden"
          >
            <span className="flex min-w-0 items-center gap-2">
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <span className="truncate">{activeCategory?.name ?? 'All categories'}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0" />
          </button>

          {noFilters && <ContinueReading userId={user?.id} />}

          <div className="mb-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-extrabold sm:text-3xl">{heading}</h1>
              {!loading && !error && (
                <p className="text-sm font-bold text-ink-soft">
                  {total} {total === 1 ? 'book' : 'books'}
                </p>
              )}
            </div>

            <div className="shrink-0">
              <label htmlFor="sort-books" className="sr-only">
                Sort books
              </label>
              <select
                id="sort-books"
                value={sort}
                onChange={(e) => changeSort(e.target.value)}
                className="h-10 rounded-full border-2 border-ink bg-white px-3 text-sm font-extrabold outline-none focus:ring-4 focus:ring-lime/40"
              >
                <option value="newest">Newest</option>
                <option value="rating">Top rated</option>
                <option value="title">A to Z</option>
              </select>
            </div>
          </div>

          {loading && <SkeletonGrid />}

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
              <BookX className="mx-auto h-10 w-10 text-ink-soft" />
              <p className="mt-3 text-lg font-extrabold">{noFilters ? 'No books published yet' : 'No books found'}</p>
              <p className="mt-1 text-sm font-semibold text-ink-soft">
                {noFilters ? 'New books will appear here soon.' : 'Try a different search or category.'}
              </p>
              {!noFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 rounded-full bg-lime px-6 py-2.5 font-extrabold shadow-[0_3px_0_0_var(--color-ink)]"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {!loading && !error && books.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} liked={favoriteIds.has(book.id)} onToggleFavorite={handleFavorite} />
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex min-w-44 items-center justify-center gap-2 rounded-full border-2 border-ink bg-white px-8 py-3 font-extrabold shadow-[0_4px_0_0_var(--color-ink)] transition hover:bg-sky disabled:opacity-60"
                  >
                    {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loadingMore ? 'Loading…' : 'Load More'}
                  </button>
                ) : (
                  <p className="text-sm font-bold text-ink-soft">You’ve reached the end.</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <CategoryDrawer open={drawerOpen} onClose={closeDrawer}>
        <CategoryList categories={categories} active={catSlug && activeCategory ? catSlug : ''} onSelect={selectCategory} />
      </CategoryDrawer>

      <Toast message={message} />
    </AppLayout>
  )
}