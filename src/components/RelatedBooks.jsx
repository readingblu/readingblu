import { useEffect, useState } from 'react'
import BookCard from './BookCard'
import { supabase } from '../lib/supabase'

export default function RelatedBooks({ bookId, categoryId, favoriteIds, onToggleFavorite }) {
  const [books, setBooks] = useState([])

  useEffect(() => {
    setBooks([])
    if (!categoryId || !bookId) return undefined
    let active = true

    supabase
      .from('books')
      .select('id, title, slug, cover_url, rating_avg, rating_count')
      .eq('is_published', true)
      .eq('category_id', categoryId)
      .neq('id', bookId)
      .order('rating_avg', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data, error }) => {
        if (active && !error && data) setBooks(data)
      })

    return () => {
      active = false
    }
  }, [bookId, categoryId])

  if (books.length === 0) return null

  return (
    <section aria-labelledby="related-heading" className="mt-10">
      <h2 id="related-heading" className="text-2xl font-extrabold">
        More like this
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {books.map((b) => (
          <BookCard key={b.id} book={b} liked={favoriteIds.has(b.id)} onToggleFavorite={onToggleFavorite} />
        ))}
      </div>
    </section>
  )
}