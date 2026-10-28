import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function Tile({ book }) {
  const [failed, setFailed] = useState(false)
  return (
    <Link to={`/book/${book.slug}`} className="group block min-w-0">
      {failed || !book.cover_url ? (
        <div className="flex aspect-[2/3] w-full items-center justify-center rounded-xl bg-gradient-to-br from-ink to-ink-soft text-lime">
          <BookOpen className="h-10 w-10" />
        </div>
      ) : (
        <img
          src={book.cover_url}
          alt={`Cover of ${book.title}`}
          loading="lazy"
          draggable="false"
          onError={() => setFailed(true)}
          className="aspect-[2/3] w-full rounded-xl border-2 border-ink bg-white object-cover shadow-[0_5px_0_0_rgba(11,31,75,0.9)] transition group-hover:-translate-y-1"
        />
      )}
      <p className="mt-3 line-clamp-2 break-words text-sm font-extrabold leading-tight sm:text-base">{book.title}</p>
    </Link>
  )
}

export default function LatestBooks() {
  const [books, setBooks] = useState([])

  useEffect(() => {
    let active = true
    supabase
      .from('books')
      .select('id, title, slug, cover_url')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data, error }) => {
        if (active && !error && data) setBooks(data)
      })
    return () => {
      active = false
    }
  }, [])

  if (books.length === 0) return null

  return (
    <section aria-labelledby="latest-heading" className="mx-auto max-w-6xl px-5 pb-6">
      <h2 id="latest-heading" className="text-center text-3xl font-extrabold sm:text-4xl">
        Fresh on ReadingBlu
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center font-semibold text-ink-soft">
        Take a peek at our newest books. Preview pages are free to look at.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        {books.map((b) => (
          <Tile key={b.id} book={b} />
        ))}
      </div>
    </section>
  )
}