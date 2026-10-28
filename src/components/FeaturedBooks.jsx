import { useEffect, useState } from 'react'
import { Award } from 'lucide-react'
import BookCard from './BookCard'
import { supabase } from '../lib/supabase'

export default function FeaturedBooks({ favoriteIds, onToggleFavorite }) {
  const [books, setBooks] = useState([])

  useEffect(() => {
    let active = true
    supabase
      .from('books')
      .select('id, title, slug, cover_url, rating_avg, rating_count')
      .eq('is_published', true)
      .not('featured_at', 'is', null)
      .order('featured_at', { ascending: false })
      .limit(4)
      .then(({ data, error }) => {
        if (active && !error && data) setBooks(data)
      })
    return () => {
      active = false
    }
  }, [])

  if (books.length === 0) return null

  return (
    <section aria-labelledby="featured-heading" className="mb-8">
      <h2 id="featured-heading" className="flex items-center gap-2 text-xl font-extrabold sm:text-2xl">
        <Award className="h-6 w-6 text-lime-deep" /> Featured
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
        {books.map((b) => (
          <BookCard key={b.id} book={b} liked={favoriteIds.has(b.id)} onToggleFavorite={onToggleFavorite} />
        ))}
      </div>
    </section>
  )
}