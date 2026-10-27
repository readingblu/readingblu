import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Coins, Loader2, ShieldAlert } from 'lucide-react'
import Watermark from '../components/reader/Watermark'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { DAILY_CREDITS, formatCredits, formatReset } from '../lib/credits'

const IMG_MAX_HEIGHT = 'calc(100dvh - 10rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))'
const URL_LIFETIME_SECONDS = 15 * 60
const URL_REUSE_MS = 10 * 60 * 1000

async function signPath(cache, path) {
  const hit = cache.get(path)
  if (hit && Date.now() - hit.at < URL_REUSE_MS) return hit.url
  const { data, error } = await supabase.storage.from('book-pages').createSignedUrl(path, URL_LIFETIME_SECONDS)
  if (error || !data?.signedUrl) throw error || new Error('Could not open the page.')
  cache.set(path, { url: data.signedUrl, at: Date.now() })
  return data.signedUrl
}

function readLocalProgress(bookId, total) {
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
  const navigate = useNavigate()
  const userId = user?.id

  const [state, setState] = useState('loading') // loading | ready | notfound | error
  const [book, setBook] = useState(null)
  const [rows, setRows] = useState([])
  const [wallet, setWallet] = useState(null)
  const [index, setIndex] = useState(0)
  const [sliderValue, setSliderValue] = useState(1)
  const [pageStatus, setPageStatus] = useState('loading') // loading | ready | nocredits | error
  const [pageUrl, setPageUrl] = useState(null)
  const [hidden, setHidden] = useState(false)
  const [shield, setShield] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [pageTick, setPageTick] = useState(0)

  const touch = useRef(null)
  const pending = useRef(null)
  const unlocked = useRef(new Map()) // page_number -> expiry (ms)
  const urlCache = useRef(new Map())
  const leaving = useRef(false)
  const guardOn = useRef(false)
  const startIdx = useRef(null)

  const total = rows.length
  const covered = hidden || shield

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

  // Load the book, its page list, your balance, your open pages and your bookmark
  useEffect(() => {
    let active = true
    setState('loading')
    setBook(null)
    setRows([])
    setPageUrl(null)
    unlocked.current = new Map()
    urlCache.current = new Map()

    ;(async () => {
      try {
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

        const [pagesRes, walletRes, unlockRes, progRes] = await Promise.all([
          supabase.from('book_pages').select('page_number, storage_path').eq('book_id', b.id).order('page_number'),
          supabase.rpc('get_wallet'),
          supabase
            .from('page_unlocks')
            .select('page_number, expires_at')
            .eq('book_id', b.id)
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString()),
          supabase.from('reading_progress').select('page_index').eq('book_id', b.id).eq('user_id', userId).maybeSingle(),
        ])
        if (!active) return

        if (pagesRes.error || walletRes.error || !walletRes.data) {
          setState('error')
          return
        }

        const list = pagesRes.data
        ;(unlockRes.data || []).forEach((u) => unlocked.current.set(u.page_number, Date.parse(u.expires_at)))

        let start = readLocalProgress(b.id, list.length)
        const saved = progRes.data?.page_index
        if (Number.isInteger(saved) && saved >= 0 && saved < list.length) start = saved

        setBook(b)
        setRows(list)
        setWallet(walletRes.data)
        setIndex(start)
        setSliderValue(start + 1)
        setState('ready')
      } catch {
        if (active) setState('error')
      }
    })()

    return () => {
      active = false
    }
  }, [slug, reloadKey, userId])

  // Open (and, if needed, pay for) the page you are on, then show it
  useEffect(() => {
    if (state !== 'ready' || rows.length === 0 || !book) return undefined
    const row = rows[index]
    if (!row) return undefined
    let active = true
    setPageUrl(null)
    setPageStatus('loading')

    const run = async () => {
      try {
        const expiry = unlocked.current.get(row.page_number)
        if (!expiry || expiry <= Date.now()) {
          const { data, error } = await supabase.rpc('unlock_page', { p_book: book.id, p_page: row.page_number })
          if (!active) return
          if (error || !data) throw error || new Error('Could not unlock the page.')
          if (data.wallet) setWallet(data.wallet)
          if (data.status === 'no_credits') {
            setPageStatus('nocredits')
            return
          }
          if (data.status !== 'ok') throw new Error('Could not unlock the page.')
          unlocked.current.set(row.page_number, Date.parse(data.expires_at))
        }
        const url = await signPath(urlCache.current, row.storage_path)
        if (!active) return
        setPageUrl(url)
        setPageStatus('ready')
      } catch {
        if (active) setPageStatus('error')
      }
    }

    // A short pause means flipping quickly past a page does not use credits
    const alreadyOpen = (unlocked.current.get(row.page_number) || 0) > Date.now()
    const timer = setTimeout(run, alreadyOpen ? 0 : 350)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [state, rows, index, book, pageTick])

  // Preload only pages that are already open
  useEffect(() => {
    if (state !== 'ready' || pageStatus !== 'ready') return
    ;[1, 2].forEach(async (d) => {
      const row = rows[index + d]
      if (!row) return
      const expiry = unlocked.current.get(row.page_number)
      if (!expiry || expiry <= Date.now()) return
      try {
        const url = await signPath(urlCache.current, row.storage_path)
        const img = new Image()
        img.src = url
      } catch {
        // ignore preload problems
      }
    })
  }, [state, rows, index, pageStatus])

  const step = useCallback(
    (delta) => {
      setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0)))
    },
    [total],
  )

  const jump = useCallback(
    (value) => {
      setIndex(Math.min(Math.max(value, 0), Math.max(total - 1, 0)))
    },
    [total],
  )

  useEffect(() => {
    setSliderValue(index + 1)
  }, [index])

  // Remember where the reader stopped
  useEffect(() => {
    if (state !== 'ready' || !book || total === 0) return undefined
    if (pageStatus !== 'ready' && pageStatus !== 'nocredits') return undefined
    try {
      localStorage.setItem(`rb-progress-${book.id}`, String(index))
    } catch {
      // ignore
    }
    pending.current = { book_id: book.id, page_index: index, total_pages: total }
    const timer = setTimeout(flush, 800)
    return () => clearTimeout(timer)
  }, [index, pageStatus, state, book, total, flush])

  useEffect(() => () => flush(), [flush])

  // Lock page scrolling behind the reader
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Phone and browser Back button: show the "come back within 24 hours" message first
  useEffect(() => {
    if (state !== 'ready' || total === 0) return undefined
    startIdx.current = window.history.state?.idx ?? null
    window.history.pushState({ rbGuard: true }, '')
    guardOn.current = true

    const onPop = () => {
      if (leaving.current) return
      setLeaveOpen(true)
      window.history.pushState({ rbGuard: true }, '')
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      guardOn.current = false
    }
  }, [state, total])

  const leave = () => {
    flush()
    leaving.current = true
    setLeaveOpen(false)
    if (guardOn.current && typeof startIdx.current === 'number' && startIdx.current > 0) {
      window.history.go(-2)
    } else {
      navigate(`/book/${slug}`, { replace: true })
    }
  }

  const onBackClick = () => {
    if (state === 'ready' && total > 0) setLeaveOpen(true)
    else navigate(`/book/${slug}`)
  }

  // Copy protection deterrents
  useEffect(() => {
    let timer
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'c', 'x', 'a', 'u'].includes(key)) e.preventDefault()
      if (e.key === 'Escape') setLeaveOpen(false)
      if (e.target && e.target.tagName === 'INPUT') return
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
  const navBtn =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow disabled:opacity-30'
  const creditsLabel = wallet ? (wallet.is_pro ? '∞' : formatCredits(wallet.daily_pages + wallet.paid_pages)) : ''

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
          <button
            type="button"
            onClick={onBackClick}
            aria-label="Back"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{book?.title ?? 'Reader'}</p>
            {state === 'ready' && total > 0 && (
              <p className="text-xs font-bold text-white/70">
                Page {index + 1} of {total}
              </p>
            )}
          </div>
          {state === 'ready' && creditsLabel && (
            <Link
              to="/upgrade"
              aria-label={`Credits left: ${creditsLabel}`}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 text-sm font-extrabold"
            >
              <Coins className="h-4 w-4 text-lime" /> {creditsLabel}
            </Link>
          )}
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
              {pageStatus === 'loading' && <Loader2 className="absolute h-8 w-8 animate-spin text-white/60" aria-label="Opening page" />}

              {pageStatus === 'ready' && pageUrl && (
                <div className="relative z-10 inline-block leading-none">
                  <img
                    key={pageUrl}
                    src={pageUrl}
                    alt={`${book.title}, page ${index + 1}`}
                    draggable={false}
                    onError={() => setPageStatus('error')}
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
              )}

              {pageStatus === 'nocredits' && (
                <div className="relative z-10 max-w-sm text-center">
                  <Coins className="mx-auto h-10 w-10 text-lime" />
                  <p className="mt-3 text-xl font-extrabold">You are out of credits for now</p>
                  <p className="mt-1 text-sm font-semibold text-white/75">
                    Your {DAILY_CREDITS} free daily credits refresh on {formatReset(wallet?.next_reset)}. Pages you already opened stay
                    available for 24 hours.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <Link to="/upgrade" className="rounded-full bg-lime px-6 py-2.5 font-extrabold text-ink">
                      See credits
                    </Link>
                    {index > 0 && (
                      <button type="button" onClick={() => step(-1)} className="rounded-full bg-white px-6 py-2.5 font-extrabold text-ink">
                        Previous page
                      </button>
                    )}
                  </div>
                </div>
              )}

              {pageStatus === 'error' && (
                <div className="relative z-10 max-w-xs text-center">
                  <p className="font-extrabold">This page could not be loaded.</p>
                  <button
                    type="button"
                    onClick={() => setPageTick((t) => t + 1)}
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
                value={sliderValue}
                disabled={total < 2}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                onPointerUp={(e) => jump(Number(e.currentTarget.value) - 1)}
                onTouchEnd={(e) => jump(Number(e.currentTarget.value) - 1)}
                onKeyUp={(e) => jump(Number(e.currentTarget.value) - 1)}
                aria-label="Go to page"
                className="h-2 min-w-0 flex-1 accent-lime"
              />
              <button type="button" onClick={() => step(1)} disabled={index >= total - 1} aria-label="Next page" className={navBtn}>
                <ChevronRight className="h-6 w-6" />
              </button>
            </footer>
          </>
        )}

        {leaveOpen && (
          <div
            className="absolute inset-0 z-[70] flex items-center justify-center bg-ink/80 p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-title"
          >
            <div className="w-full max-w-sm rounded-3xl border-2 border-ink bg-white p-6 text-center text-ink">
              <h2 id="leave-title" className="text-xl font-extrabold">
                Leaving already?
              </h2>
              <p className="mt-2 font-semibold text-ink-soft">
                You can continue from where you left off by returning within 24 hours.
              </p>
              <p className="mt-1 text-sm font-semibold text-ink-soft">Pages you opened stay unlocked for 24 hours.</p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setLeaveOpen(false)}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-lime font-extrabold shadow-[0_3px_0_0_var(--color-ink)]"
                >
                  Keep reading
                </button>
                <button
                  type="button"
                  onClick={leave}
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-full border-2 border-ink bg-white font-extrabold hover:bg-sky"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="print-only">Printing is disabled for ReadingBlu books.</div>
    </>
  )
}