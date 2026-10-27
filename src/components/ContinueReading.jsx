import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'

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
      loading="lazy"
      draggable="false"
      onError={() => setFailed(true)}
      className="h-24 w-16 shrink-0 rounded-lg border-2 border-ink bg-sky object-cover"
    />
  )
}

export default function ContinueReading({ userId }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!userId) return undefined
    let active = true

    supabase
      .from('reading_progress')
      .select('page_index, total_pages, updated_at, books(id, title, slug, cover_url, is_published)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(12)
      .then(({ data, error }) => {
        if (!active || error || !data) return
        const list = data
          .filter((r) => r.books && r.books.is_published && r.page_index < r.total_pages - 1)
          .slice(0, 3)
        setItems(list)
      })

    return () => {
      active = false
    }
  }, [userId])

  if (items.length === 0) return null

  return (
    <section aria-labelledby="continue-heading" className="mb-8">
      <h2 id="continue-heading" className="mb-3 text-xl font-extrabold sm:text-2xl">
        Continue reading
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((r) => {
          const pct = Math.min(100, Math.round(((r.page_index + 1) / r.total_pages) * 100))
          return (
            <li key={r.books.id} className="flex min-w-0 gap-3 rounded-2xl border-2 border-ink bg-white p-3 shadow-[0_4px_0_0_var(--color-ink)]">
              <Thumb url={r.books.cover_url} />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="line-clamp-2 break-words font-extrabold leading-tight">{r.books.title}</p>
                <p className="mt-1 text-xs font-bold text-ink-soft">
                  Page {r.page_index + 1} of {r.total_pages} · {pct}%
                </p>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sky" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Reading progress">
                  <div className="h-full rounded-full bg-lime-deep" style={{ width: `${pct}%` }} />
                </div>
                <Link
                  to={`/read/${r.books.slug}`}
                  className="mt-auto inline-flex h-9 items-center justify-center self-start rounded-full bg-lime px-4 text-sm font-extrabold shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Continue
                </Link>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}