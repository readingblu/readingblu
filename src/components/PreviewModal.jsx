import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function PreviewModal({ title, pages, onClose }) {
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState({})
  const touchX = useRef(null)
  const total = pages.length

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, prev, next])

  const onTouchStart = (e) => {
    touchX.current = e.changedTouches[0].clientX
  }
  const onTouchEnd = (e) => {
    if (touchX.current == null) return
    const diff = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (diff > 60) prev()
    if (diff < -60) next()
  }

  const page = pages[index]
  const arrow =
    'absolute top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink shadow disabled:opacity-30'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${title}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{title}</p>
          <p className="text-xs font-bold text-white/70">
            Preview · page {index + 1} of {total}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1 px-12 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-16"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button type="button" onClick={prev} disabled={index === 0} aria-label="Previous page" className={`${arrow} left-1 sm:left-3`}>
          <ChevronLeft className="h-5 w-5" />
        </button>

        {failed[index] ? (
          <div className="flex h-full items-center justify-center text-center text-sm font-bold text-white/80">
            This page could not be loaded.
          </div>
        ) : (
          <img
            key={page.id}
            src={page.image_url}
            alt={`${title}, preview page ${page.page_number}`}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onError={() => setFailed((f) => ({ ...f, [index]: true }))}
            className="h-full w-full select-none object-contain"
          />
        )}

        <button type="button" onClick={next} disabled={index === total - 1} aria-label="Next page" className={`${arrow} right-1 sm:right-3`}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}