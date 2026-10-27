import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, ShieldAlert } from 'lucide-react'
import Watermark from '../components/reader/Watermark'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const SIGN_SECONDS = 6 * 60 * 60
const IMG_MAX_HEIGHT = 'calc(100dvh - 10rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))'

async function signRows(rows) {
  if (rows.length === 0) return []
  const { data, error } = await supabase.storage
    .from('book-pages')
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      SIGN_SECONDS,
    )
  if (error || !data) throw error || new Error('Could not open the pages.')
  const map = new Map(data.map((d) => [d.path, d.signedUrl]))
  return rows.map((r) => map.get(r.storage_path) || null)
}

function readSaved(bookId, total) {
  try {
    const raw = Number(localStorage.getItem(`rb-progress-${bookId}`))
    if (Number.isInteger(raw) && raw >= 0 && raw < total) return raw
  } catch {
    // storage unavailable, start from page 1
  }
  return 0
}

function Message({ title, text, children }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
      <div className="max-w-sm">
        <ShieldAlert className="mx-auto h-10 w-10 text-lime" />
        <p className="mt-3 text-xl font-extrabold">{title}</p>
        {text && <p className="mt-1 text-sm font-semibold text-white/75">{text}</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </div>
  )
}

export default function ReaderPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const userId = user?.id

  const [state, setState] = useState('loading') // loading | ready | notfound | error
  const [book, setBook] = useState(null)
  const [rows, setRows] = useState([])
  const [urls, setUrls] = useState([])
  const [index, setIndex] = useState(0)
  const [hidden, setHidden] = useState(false)
  const [shield, setShield] = useState(false)
  const [pageError, setPageError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const touch = useRef(null)
  const pending = useRef(null)

  const total = rows.length
  const covered = hidden || shield

  // Send the latest reading position to the server
  const flush = useCallback(() => {
    const p = pending.current
    if (!p || !userId) return
    pending.current = null
    supabase
      .from('reading_progress')
      .upsert(
        { user_id: userId, book_id: p.book_id, page_index: p.page_index, total_pages: p.total_pages, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,book_id' },
      )
      .then(() => {})
  }, [userId])

  // Load the book, its pages and where the reader stopped
  useEffect(() => {
    let active = true
    setState('loading')
    setBook(null)
    setRows([])
    setUrls([])
    setPageError(false)

    ;(async () => {
      const { data: b, error: bookErr } = await supabase.from('books').select('id, title, slug').eq('slug', slug).maybeSingle()
      if (!active) return
      if (bookErr) {
        setState('error')
        return
      }
      if (!b) {
        setState('notfound')
        return
      }

      const { data: r, error: pagesErr } = await supabase
        .from('book_pages')
        .select('page_number, storage_path')
        .eq('book_id', b.id)
        .order('page_number')
      if (!active) return
      if (pagesErr) {
        setState('error')
        return
      }

      let start = readSaved(b.id, r.length)
      if (userId) {
        const { data: prog } = await supabase
          .from('reading_progress')
          .select('page_index')
          .eq('book_id', b.id)
          .eq('user_id', userId)
          .maybeSingle()
        if (!active) return
        if (prog && Number.isInteger(prog.page_index) && prog.page_index >= 0 && prog.page_index < r.length) {
          start = prog.page_index
        }
      }

      try {
        const signed = await signRows(r)
        if (!active) return
        setBook(b)
        setRows(r)
        setUrls(signed)
        setIndex(start)
        setState('ready')
      } catch {
        if (active) setState('error')
      }
    })()

    return () => {
      active = false
    }
  }, [slug, reloadKey, userId])

  const step = useCallback(
    (delta) => {
      setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0)))
      setPageError(false)
    },
    [total],
  )

  const jump = (value) => {
    setIndex(Math.min(Math.max(value, 0), Math.max(total - 1, 0)))
    setPageError(false)
  }

  // Remember where the reader stopped (on this device and on the account)
  useEffect(() => {
    if (state !== 'ready' || !book || total === 0) return undefined
    try {
      localStorage.setItem(`rb-progress-${book.id}`, String(index))
    } catch {
      // ignore
    }
    pending.current = { book_id: book.id, page_index: index, total_pages: total }
    const timer = setTimeout(flush, 800)
    return () => clearTimeout(timer)
  }, [index, state, book, total, flush])

  // Make sure the last position is sent when leaving the reader
  useEffect(() => () => flush(), [flush])

  // Preload the next two pages
  useEffect(() => {
    ;[index + 1, index + 2].forEach((i) => {
      if (urls[i]) {
        const img = new Image()
        img.src = urls[i]
      }
    })
  }, [index, urls])

  // Lock page scrolling behind the reader
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Copy protection deterrents
  useEffect(() => {
    let timer
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'c', 'x', 'a', 'u'].includes(key)) e.preventDefault()
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    const onKeyUp = (e) => {
      if (e.key === 'PrintScreen') {
        try {
          const result = navigator.clipboard?.writeText('')
          if (result && result.catch) result.catch(() => {})
        } catch {
          // ignore
        }
        setShield(true)
        clearTimeout(timer)
        timer = setTimeout(() => setShield(false), 2000)
      }
    }
    const onVisibility = () => {
      const isHidden = document.visibilityState === 'hidden'
      setHidden(isHidden)
      if (isHidden) flush()
    }
    const onBlur = () => setHidden(true)
    const onFocus = () => setHidden(document.visibilityState === 'hidden')

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [step, flush])

  const retryPage = async () => {
    try {
      const signed = await signRows(rows)
      setUrls(signed)
      setPageError(false)
    } catch {
      setPageError(true)
    }
  }

  const onTouchStart = (e) => {
    const t = e.changedTouches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx > 0 ? -1 : 1)
  }

  const block = (e) => e.preventDefault()
  const watermarkText = `${user?.email || 'ReadingBlu reader'} · ${(user?.id || '').slice(0, 6)} · ReadingBlu`
  const currentUrl = urls[index]
  const navBtn =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow disabled:opacity-30'

  return (
    <>
      <div
        className="reader-shell fixed inset-0 z-50 flex flex-col bg-ink text-white"
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        onContextMenu={block}
        onCopy={block}
        onCut={block}
        onDragStart={block}
      >
        <header className="flex shrink-0 items-center gap-3 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <Link
            to={`/book/${slug}`}
            aria-label="Back to book"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{book?.title ?? 'Reader'}</p>
            {state === 'ready' && total > 0 && (
              <p className="text-xs font-bold text-white/70">
                Page {index + 1} of {total}
              </p>
            )}
          </div>
        </header>

        {state === 'loading' && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
          </div>
        )}

        {state === 'notfound' && (
          <Message title="Book not found" text="It may have been removed or is not published.">
            <Link to="/home" className="rounded-full bg-lime px-6 py-2.5 font-extrabold text-ink">
              Browse books
            </Link>
          </Message>
        )}

        {state === 'error' && (
          <Message title="We could not open this book" text="Please check your connection and try again.">
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-full bg-lime px-6 py-2.5 font-extrabold text-ink"
            >
              Try again
            </button>
          </Message>
        )}

        {state === 'ready' && total === 0 && (
          <Message title="Pages are not available yet" text="The pages of this book have not been uploaded yet. Please check back soon.">
            <Link to={`/book/${slug}`} className="rounded-full bg-lime px-6 py-2.5 font-extrabold text-ink">
              Back to book
            </Link>
          </Message>
        )}

        {state === 'ready' && total > 0 && (
          <>
            <main
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-2 py-2"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <Loader2 className="absolute h-8 w-8 animate-spin text-white/60" aria-hidden="true" />

              {currentUrl && !pageError ? (
                <div className="relative z-10 inline-block leading-none">
                  <img
                    key={currentUrl}
                    src={currentUrl}
                    alt={`${book.title}, page ${index + 1}`}
                    draggable={false}
                    onError={() => setPageError(true)}
                    className={`block h-auto w-auto max-w-full select-none rounded-md bg-white object-contain ${covered ? 'invisible' : ''}`}
                    style={{ maxHeight: IMG_MAX_HEIGHT }}
                  />
                  <Watermark text={watermarkText} />
                  {covered && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-ink p-4 text-center text-sm font-extrabold">
                      Reading is paused. Return to this tab to continue.
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative z-10 max-w-xs text-center">
                  <p className="font-extrabold">This page could not be loaded.</p>
                  <button
                    type="button"
                    onClick={retryPage}
                    className="mt-3 rounded-full bg-lime px-6 py-2.5 font-extrabold text-ink"
                  >
                    Try again
                  </button>
                </div>
              )}
            </main>

            <footer className="flex shrink-0 items-center gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
              <button type="button" onClick={() => step(-1)} disabled={index === 0} aria-label="Previous page" className={navBtn}>
                <ChevronLeft className="h-6 w-6" />
              </button>
              <input
                type="range"
                min={1}
                max={total}
                value={index + 1}
                disabled={total < 2}
                onChange={(e) => jump(Number(e.target.value) - 1)}
                aria-label="Go to page"
                className="h-2 min-w-0 flex-1 accent-lime"
              />
              <button type="button" onClick={() => step(1)} disabled={index >= total - 1} aria-label="Next page" className={navBtn}>
                <ChevronRight className="h-6 w-6" />
              </button>
            </footer>
          </>
        )}
      </div>

      <div className="print-only">Printing is disabled for ReadingBlu books.</div>
    </>
  )
}