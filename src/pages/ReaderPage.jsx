import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Coins, Loader2, ShieldAlert, ZoomIn, ZoomOut } from 'lucide-react'
import Watermark from '../components/reader/Watermark'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { DAILY_CREDITS, formatCredits, formatReset } from '../lib/credits'

const IMG_MAX_HEIGHT = 'calc(100dvh - 10rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))'
const URL_LIFETIME_SECONDS = 15 * 60
const URL_REUSE_MS = 10 * 60 * 1000
const MIN_ZOOM = 1
const MAX_ZOOM = 100
const ZOOM_HOLD_DELAY_MS = 350 // hold a zoom button this long and it starts repeating
const ZOOM_HOLD_REPEAT_MS = 45
const UNLOCK_DELAY_MS = 150 // fast-flip window: while flipping faster than this, only the page you stop on is paid for
const IMG_CACHE_LIMIT = 6 // previous + current + next two pages, plus a little slack

// Stop an image download and drop its pixels so the browser is free to reclaim the memory
function releaseEntry(entry) {
  if (!entry) return
  const { img } = entry
  img.onload = null
  img.onerror = null
  if (!entry.done) entry.reject(new Error('cancelled'))
  img.removeAttribute('src')
}

function clearImageCache(cache) {
  cache.forEach(releaseEntry)
  cache.clear()
}

// Cancel downloads that are still running for pages the reader has already flipped past
function abortPendingImages(cache, keepPaths) {
  cache.forEach((entry, path) => {
    if (!entry.done && !keepPaths.has(path)) {
      cache.delete(path)
      releaseEntry(entry)
    }
  })
}

// Download + decode an image once and keep a reference so the next page appears instantly.
// Cached by storage path (signed URLs change), least recently used goes first.
function preloadImage(cache, path, url) {
  const hit = cache.get(path)
  if (hit) {
    if (hit.url === url) {
      cache.delete(path)
      cache.set(path, hit)
      return hit.promise
    }
    cache.delete(path)
    releaseEntry(hit)
  }
  const img = new Image()
  img.decoding = 'async'
  const entry = { url, img, done: false, promise: null, reject: null }
  entry.promise = new Promise((resolve, reject) => {
    entry.reject = reject
    img.onload = async () => {
      try {
        if (img.decode) await img.decode() // decode now so painting the page later is instant
      } catch {
        // it still shows fine without pre-decoding
      }
      entry.done = true
      resolve(img)
    }
    img.onerror = () => {
      if (cache.get(path) === entry) cache.delete(path)
      reject(new Error('Could not load the page image.'))
    }
  })
  entry.promise.catch(() => {})
  img.src = url
  cache.set(path, entry)
  while (cache.size > IMG_CACHE_LIMIT) {
    const [oldPath, oldEntry] = cache.entries().next().value
    cache.delete(oldPath)
    releaseEntry(oldEntry)
  }
  return entry.promise
}

function useIsDesktop() {
  const query = '(min-width: 768px)'
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatch(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return match
}

function signPath(cache, path) {
  const hit = cache.get(path)
  if (hit && Date.now() - hit.at < URL_REUSE_MS) return hit.promise
  const entry = { at: Date.now(), promise: null }
  entry.promise = supabase.storage
    .from('book-pages')
    .createSignedUrl(path, URL_LIFETIME_SECONDS)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) throw error || new Error('Could not open the page.')
      return data.signedUrl
    })
  entry.promise.catch(() => {
    if (cache.get(path) === entry) cache.delete(path)
  })
  cache.set(path, entry)
  return entry.promise
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
  const [shownIdx, setShownIdx] = useState(0)
  const [hidden, setHidden] = useState(false)
  const [shield, setShield] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [pageTick, setPageTick] = useState(0)
  const [zoomPct, setZoomPct] = useState(null) // null = fit to screen
  const [nat, setNat] = useState(null) // natural size of the current page image
  const [box, setBox] = useState({ w: 0, h: 0 }) // space available for the page
  const [mainEl, setMainEl] = useState(null)

  const isDesktop = useIsDesktop()

  const touch = useRef(null)
  const pending = useRef(null)
  const unlocked = useRef(new Map()) // page_number -> expiry (ms)
  const urlCache = useRef(new Map())
  const imgCache = useRef(new Map()) // storage path -> { url, img, promise } (keeps preloaded images alive)
  const unlockInflight = useRef(new Map()) // page_number -> unlock_page call already running
  const walletSeq = useRef(0)
  const walletApplied = useRef(0)
  const indexRef = useRef(0) // always the latest index, even between renders
  const shownIdxRef = useRef(-1) // index of the page currently on screen
  const lastNavAt = useRef(0)
  const scrubbing = useRef(false)
  const zoomHold = useRef({ delay: null, repeat: null })
  const fitRef = useRef(100)
  const leaving = useRef(false)
  const guardDepth = useRef(0)
  const startIdx = useRef(null)

  const total = rows.length
  const covered = hidden || shield

  // Fit-to-screen scale (phones never scale a page above 100%, like before)
  const fitScale = nat && box.w > 0 && box.h > 0 ? Math.min(box.w / nat.w, box.h / nat.h, isDesktop ? Infinity : 1) : 1
  const fitPct = fitScale * 100
  const scalePct = zoomPct ?? fitPct
  const shownPct = Math.round(scalePct)
  const isZoomed = zoomPct !== null && zoomPct > fitPct + 0.5

  useEffect(() => {
    fitRef.current = fitPct
  }, [fitPct])

  // One percent per step, from MIN_ZOOM to MAX_ZOOM
  const zoomBy = useCallback((dir) => {
    setZoomPct((z) => {
      let cur = Math.round(z ?? fitRef.current)
      if ((dir > 0 && cur >= MAX_ZOOM) || (dir < 0 && cur <= MIN_ZOOM)) return z
      if (dir < 0) cur = Math.min(cur, MAX_ZOOM + 1) // a fit above the maximum steps down to the maximum
      return cur + dir
    })
  }, [])

  const stopZoomHold = useCallback(() => {
    clearTimeout(zoomHold.current.delay)
    clearInterval(zoomHold.current.repeat)
    window.removeEventListener('pointerup', stopZoomHold)
    window.removeEventListener('pointercancel', stopZoomHold)
  }, [])

  // Press = one step, hold = keeps stepping, so 1% steps are still quick to travel
  const startZoomHold = useCallback(
    (dir) => {
      stopZoomHold()
      zoomBy(dir)
      zoomHold.current.delay = setTimeout(() => {
        zoomHold.current.repeat = setInterval(() => zoomBy(dir), ZOOM_HOLD_REPEAT_MS)
      }, ZOOM_HOLD_DELAY_MS)
      window.addEventListener('pointerup', stopZoomHold)
      window.addEventListener('pointercancel', stopZoomHold)
    },
    [zoomBy, stopZoomHold],
  )

  useEffect(() => stopZoomHold, [stopZoomHold])

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

  // One place that talks to unlock_page. Results are recorded even if the reader has already moved on
  // (the page may be paid for by then), identical calls are shared, and an older balance never
  // overwrites a newer one.
  const unlockPage = useCallback((bookId, pageNumber) => {
    const inflight = unlockInflight.current
    const existing = inflight.get(pageNumber)
    if (existing) return existing
    const openMap = unlocked.current
    const seq = ++walletSeq.current
    const promise = Promise.resolve(supabase.rpc('unlock_page', { p_book: bookId, p_page: pageNumber }))
      .then(({ data, error }) => {
        if (!error && data) {
          if (data.wallet && seq > walletApplied.current) {
            walletApplied.current = seq
            setWallet(data.wallet)
          }
          if (data.status === 'ok') openMap.set(pageNumber, Date.parse(data.expires_at))
        }
        return { data, error }
      })
      .finally(() => {
        if (inflight.get(pageNumber) === promise) inflight.delete(pageNumber)
      })
    inflight.set(pageNumber, promise)
    return promise
  }, [])

  // Load the book, its page list, your balance, your open pages and your bookmark
  useEffect(() => {
    let active = true
    setState('loading')
    setBook(null)
    setRows([])
    setPageUrl(null)
    clearImageCache(imgCache.current) // emptied in place: the Map itself never changes, so effects can safely capture it
    unlocked.current = new Map()
    urlCache.current = new Map()
    unlockInflight.current = new Map()
    shownIdxRef.current = -1
    setNat(null)
    setZoomPct(null)

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
        indexRef.current = start
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

  // Open (and, if needed, pay for) the page you are on, then show it.
  // The old page stays on screen until the new one is fully downloaded.
  useEffect(() => {
    if (state !== 'ready' || rows.length === 0 || !book) return undefined
    const row = rows[index]
    if (!row) return undefined
    let active = true
    const imgs = imgCache.current
    const urls = urlCache.current
    const isOpen = () => (unlocked.current.get(row.page_number) || 0) > Date.now()

    // Stop downloads that belong to pages the reader has already flipped past
    const keep = new Set([row.storage_path])
    ;[-1, 1, 2].forEach((d) => {
      if (rows[index + d]) keep.add(rows[index + d].storage_path)
    })
    abortPendingImages(imgs, keep)

    setPageStatus('loading')

    // Gives up quietly (null) as soon as the reader has left this page
    const loadPage = async () => {
      const url = await signPath(urls, row.storage_path)
      if (!active) return null
      const img = await preloadImage(imgs, row.storage_path, url)
      return { url, img }
    }

    // Sign and download the image while the unlock check runs. It is only SHOWN after the unlock succeeds.
    const warm = loadPage().catch(() => null)

    const run = async () => {
      try {
        if (!isOpen()) {
          const { data, error } = await unlockPage(book.id, row.page_number)
          if (!active) return
          if (error || !data) throw error || new Error('Could not unlock the page.')
          if (data.status === 'no_credits') {
            shownIdxRef.current = -1
            setPageUrl(null)
            setPageStatus('nocredits')
            return
          }
          if (data.status !== 'ok') throw new Error('Could not unlock the page.')
        }
        const loaded = (await warm) || (await loadPage())
        if (!active || !loaded) return
        // The reader's zoom is kept when flipping pages (only "fit to screen" or a new book resets it)
        shownIdxRef.current = index
        setNat({ w: loaded.img.naturalWidth, h: loaded.img.naturalHeight })
        setPageUrl(loaded.url)
        setShownIdx(index)
        setPageStatus('ready')
      } catch {
        if (active) {
          shownIdxRef.current = -1
          setPageUrl(null)
          setPageStatus('error')
        }
      }
    }

    // Flipping very fast waits a moment so skipped pages are not paid for.
    // A normal, deliberate flip (no other flip just before it) opens right away.
    const now = Date.now()
    const sincePrev = now - lastNavAt.current
    lastNavAt.current = now
    const delay = isOpen() || sincePrev > UNLOCK_DELAY_MS ? 0 : UNLOCK_DELAY_MS
    let timer
    if (delay === 0) run()
    else timer = setTimeout(run, delay)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [state, rows, index, book, pageTick, unlockPage])

  // Get the neighbouring pages ready: sign their links and download the images ahead of time.
  // This never unlocks or charges anything; a page is still only shown after unlock_page succeeds.
  useEffect(() => {
    if (state !== 'ready' || pageStatus !== 'ready') return undefined
    let active = true
    const imgs = imgCache.current
    const urls = urlCache.current
    ;[1, 2, -1].forEach(async (d) => {
      const row = rows[index + d]
      if (!row) return
      const expiry = unlocked.current.get(row.page_number)
      const open = expiry && expiry > Date.now()
      if (d !== 1 && !open) return // beyond the very next page, only pages that are already open are prepared
      try {
        const url = await signPath(urls, row.storage_path)
        if (!active) return
        await preloadImage(imgs, row.storage_path, url)
      } catch {
        // ignore preload problems
      }
    })
    return () => {
      active = false
    }
  }, [state, rows, index, pageStatus])

  // Index and slider always move together; indexRef keeps quick repeated presses (key held down) correct
  const goTo = useCallback(
    (n) => {
      const next = Math.min(Math.max(n, 0), Math.max(total - 1, 0))
      indexRef.current = next
      setIndex(next)
      setSliderValue(next + 1)
    },
    [total],
  )
  const step = useCallback((delta) => goTo(indexRef.current + delta), [goTo])
  const jump = goTo

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

  // Track the space available for the page so "fit" always fits.
  // Measuring is deferred to the next frame and skipped when nothing changed, which keeps
  // ResizeObserver from reporting "loop completed with undelivered notifications".
  useEffect(() => {
    if (!mainEl) return undefined
    let frame = 0
    const measure = () => {
      frame = 0
      const cs = window.getComputedStyle(mainEl)
      const w = Math.max(0, Math.floor(mainEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)))
      const h = Math.max(0, Math.floor(mainEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)))
      setBox((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure)
    }
    measure()
    const ro = new ResizeObserver(schedule)
    ro.observe(mainEl)
    return () => {
      ro.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [mainEl])

  // A newly shown page always starts at its top-left corner
  useEffect(() => {
    if (mainEl) mainEl.scrollTo(0, 0)
  }, [mainEl, shownIdx])

  // Release every preloaded image when the reader closes
  useEffect(() => {
    const imgs = imgCache.current // captured in the effect body; same Map for the whole life of the component
    return () => clearImageCache(imgs)
  }, [])

  // Lock page scrolling behind the reader
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Phone and browser Back button: show the "come back within 24 hours" message first.
  // One guard entry sits on top of the reader's history entry. It is added only once (never stacked,
  // even if this effect runs again) and remembers how the reader was opened, so Leave can undo exactly
  // what was added.
  useEffect(() => {
    if (state !== 'ready' || total === 0) return undefined
    const current = window.history.state
    if (current?.rbGuard) {
      startIdx.current = typeof current.rbStartIdx === 'number' ? current.rbStartIdx : null
    } else {
      startIdx.current = typeof current?.idx === 'number' ? current.idx : null
      window.history.pushState({ rbGuard: true, rbStartIdx: startIdx.current }, '')
    }
    guardDepth.current = 1

    const onPop = () => {
      if (leaving.current) return
      setLeaveOpen(true)
      window.history.pushState({ rbGuard: true, rbStartIdx: startIdx.current }, '')
      guardDepth.current = 1
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
    }
  }, [state, total])

  const leave = () => {
    flush()
    leaving.current = true
    setLeaveOpen(false)
    const bookPath = `/book/${slug}`
    const depth = guardDepth.current
    if (typeof startIdx.current === 'number' && startIdx.current > 0) {
      // Opened from inside the app: step back over the guard and the reader to the page before it
      window.history.go(-(depth + 1))
    } else if (depth > 0) {
      // Opened directly (shared link): step back over the guard first, then REPLACE the reader entry
      // with the book page, so Back from the book page can never land on the reader again
      let done = false
      const finish = () => {
        if (done) return
        done = true
        window.removeEventListener('popstate', finish)
        navigate(bookPath, { replace: true })
      }
      window.addEventListener('popstate', finish)
      window.history.go(-depth)
      setTimeout(finish, 400) // safety net if the browser never reports the move
    } else {
      navigate(bookPath, { replace: true })
    }
    setTimeout(() => {
      leaving.current = false
    }, 1500)
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
    // When zoomed in, swiping pans the page instead of flipping it
    if (!touch.current || isZoomed) {
      touch.current = null
      return
    }
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx > 0 ? -1 : 1)
  }

  const beginScrub = () => {
    scrubbing.current = true
  }
  const commitScrub = (e) => {
    if (!scrubbing.current) return
    scrubbing.current = false
    jump(Number(e.currentTarget.value) - 1)
  }

  const block = (e) => e.preventDefault()
  const watermarkText = `${user?.email || 'ReadingBlu reader'} · ${(user?.id || '').slice(0, 6)} · ReadingBlu`
  const navBtn =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow disabled:opacity-30'
  const zoomBtn = 'inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-full disabled:opacity-30'
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
                Page {sliderValue} of {total}
              </p>
            )}
          </div>
          {state === 'ready' && total > 0 && (
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 p-0.5">
              <button
                type="button"
                onPointerDown={() => startZoomHold(-1)}
                onClick={(e) => e.detail === 0 && zoomBy(-1)}
                disabled={shownPct <= MIN_ZOOM}
                aria-label="Zoom out"
                className={zoomBtn}
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomPct(null)}
                aria-label="Fit to screen"
                title="Fit to screen"
                className="h-9 min-w-[3.25rem] px-1 text-sm font-extrabold tabular-nums"
              >
                {shownPct}%
              </button>
              <button
                type="button"
                onPointerDown={() => startZoomHold(1)}
                onClick={(e) => e.detail === 0 && zoomBy(1)}
                disabled={shownPct >= MAX_ZOOM}
                aria-label="Zoom in"
                className={zoomBtn}
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          )}
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
              ref={setMainEl}
              className="relative flex min-h-0 flex-1 overflow-auto px-2 py-2"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {pageStatus === 'loading' && !pageUrl && (
                <Loader2 className="absolute inset-0 m-auto h-8 w-8 animate-spin text-white/60" aria-label="Opening page" />
              )}
              {pageStatus === 'loading' && pageUrl && (
                <Loader2 className="fixed right-4 top-20 z-30 h-5 w-5 animate-spin text-white/70" aria-label="Opening page" />
              )}

              {pageUrl && (pageStatus === 'ready' || pageStatus === 'loading') && (
                <div className="relative z-10 m-auto shrink-0 leading-none">
                  <img
                    key={pageUrl}
                    src={pageUrl}
                    alt={`${book.title}, page ${shownIdx + 1}`}
                    draggable={false}
                    onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                    onError={() => setPageStatus('error')}
                    className={`block h-auto max-w-none select-none rounded-md bg-white ${covered || !nat ? 'invisible' : ''}`}
                    style={nat ? { width: `${(nat.w * scalePct) / 100}px` } : { maxHeight: IMG_MAX_HEIGHT, maxWidth: '100%' }}
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
                <div className="relative z-10 m-auto max-w-sm text-center">
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
                <div className="relative z-10 m-auto max-w-xs text-center">
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
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setSliderValue(v) // header follows the thumb while dragging
                  if (!scrubbing.current) jump(v - 1) // changes that are not a drag or key press (assistive tech)
                }}
                onPointerDown={beginScrub}
                onTouchStart={beginScrub}
                onKeyDown={beginScrub}
                onPointerUp={commitScrub}
                onPointerCancel={commitScrub}
                onTouchEnd={commitScrub}
                onTouchCancel={commitScrub}
                onKeyUp={commitScrub}
                onBlur={commitScrub}
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