import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Heart, Star } from 'lucide-react'

// Cover shape: width / height. 2/3 is tall and thin, 1/1 is a full square.
// 4/5 sits in between: almost a box, still a little taller than wide.
const COVER_RATIO = 'aspect-[4/5]'

export default function BookCard({ book, liked, onToggleFavorite }) {
  const [failed, setFailed] = useState(false)
  const hasRating = book.rating_count > 0

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border-2 border-ink bg-white p-2 shadow-[0_4px_0_0_var(--color-ink)] sm:p-3">
      <div className="relative">
        <Link to={`/book/${book.slug}`} tabIndex={-1} aria-hidden="true" className="block">
          {failed || !book.cover_url ? (
            <div className={`flex ${COVER_RATIO} w-full items-center justify-center rounded-xl bg-gradient-to-br from-ink to-ink-soft text-lime`}>
              <BookOpen className="h-10 w-10" />
            </div>
          ) : (
            <img
              src={book.cover_url}
              alt=""
              loading="lazy"
              draggable="false"
              onError={() => setFailed(true)}
              className={`${COVER_RATIO} w-full rounded-xl bg-sky object-cover`}
            />
          )}
        </Link>

        <button
          type="button"
          onClick={() => onToggleFavorite(book.id)}
          aria-pressed={liked}
          aria-label={liked ? `Remove ${book.title} from saved` : `Save ${book.title}`}
          className="absolute right-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow transition hover:scale-105"
        >
          <Heart className={`h-5 w-5 ${liked ? 'fill-blush text-blush' : 'text-ink'}`} />
        </button>
      </div>

      <h3 className="mt-2 line-clamp-2 min-h-9 text-sm font-bold leading-tight sm:min-h-10 sm:text-base">{book.title}</h3>

      <div className="mt-1 flex items-center gap-1 text-xs font-bold text-ink-soft sm:text-sm">
        <Star className="h-4 w-4 shrink-0 fill-lime text-lime-deep" />
        {hasRating ? (
          <span>
            {Number(book.rating_avg).toFixed(1)} <span className="font-semibold">({book.rating_count})</span>
          </span>
        ) : (
          <span className="font-semibold">No ratings yet</span>
        )}
      </div>

      <Link
        to={`/book/${book.slug}`}
        className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-lime text-sm font-extrabold text-ink shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
      >
        View
      </Link>
    </article>
  )
}