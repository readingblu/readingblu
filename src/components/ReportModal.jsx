import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Loader2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { REPORT_REASONS } from '../lib/reports'

export default function ReportModal({ book, userId, onClose, notify }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, busy])

  const submit = async (e) => {
    e.preventDefault()
    if (!reason) {
      setError('Please choose a reason.')
      return
    }
    setBusy(true)
    setError('')
    const { error: err } = await supabase
      .from('reports')
      .insert({ book_id: book.id, user_id: userId, reason, details: details.trim() || null })

    if (err) {
      setError(
        err.message && err.message.includes('several reports')
          ? 'You have sent several reports today. Please try again tomorrow.'
          : 'We could not send your report. Please try again.',
      )
      setBusy(false)
      return
    }
    notify('Thank you. Your report was sent.')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
    >
      <form
        onSubmit={submit}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-3xl border-2 border-ink bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="report-title" className="flex items-center gap-2 text-xl font-extrabold">
              <Flag className="h-5 w-5 shrink-0" /> Report a problem
            </h2>
            <p className="mt-0.5 break-words text-sm font-bold text-ink-soft">{book.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink hover:bg-sky"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-extrabold">What is the problem?</legend>
          <div className="mt-2 space-y-2">
            {REPORT_REASONS.map((r) => (
              <label key={r.value} className="flex cursor-pointer items-start gap-3 text-sm font-bold">
                <input
                  type="radio"
                  name="report-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-lime-deep"
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="report-details" className="mt-4 block text-sm font-extrabold">
          More details (optional)
        </label>
        <textarea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Tell us what you noticed. Please do not include personal details."
          className="mt-1 w-full resize-y rounded-2xl border-2 border-ink/30 bg-paper p-3 text-base font-semibold outline-none focus:border-ink focus:bg-white"
        />
        <p className="mt-1 text-right text-xs font-bold text-ink-soft">{details.length}/1000</p>

        <p className="mt-2 text-xs font-semibold text-ink-soft">
          To report a copyright problem formally, see our{' '}
          <Link to="/policies/copyright-takedown" target="_blank" rel="noopener noreferrer" className="font-extrabold text-ink underline">
            Copyright Complaints policy
          </Link>
          .
        </p>

        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-lime font-extrabold shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Send report
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full border-2 border-ink bg-white font-extrabold hover:bg-sky disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}