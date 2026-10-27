import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Loader2, Sparkles } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { supabase } from '../lib/supabase'

export default function BookPage() {
  const { slug } = useParams()
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    supabase
      .from('books')
      .select('id, title, author, description, cover_url, page_count, categories(name)')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setBook(data)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug])

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-5 sm:py-10">
        <Link to="/home" className="inline-flex items-center gap-1 text-sm font-extrabold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to books
        </Link>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
          </div>
        )}

        {!loading && !book && (
          <div className="mt-8 rounded-3xl border-2 border-ink bg-white p-8 text-center">
            <p className="text-lg font-extrabold">Book not found</p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">It may have been removed or is not published.</p>
          </div>
        )}

        {!loading && book && (
          <div className="mt-6 grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8">
            <div className="mx-auto w-48 sm:w-full">
              {failed || !book.cover_url ? (
                <div className="flex aspect-[2/3] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-ink to-ink-soft text-lime">
                  <BookOpen className="h-14 w-14" />
                </div>
              ) : (
                <img
                  src={book.cover_url}
                  alt={`Cover of ${book.title}`}
                  draggable="false"
                  onError={() => setFailed(true)}
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
              {book.description && <p className="mt-4 leading-relaxed text-ink-soft">{book.description}</p>}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}