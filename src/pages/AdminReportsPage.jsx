import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, Flag, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import { reasonLabel } from '../lib/reports'

const PAGE_SIZE = 20
const FIELDS = 'id, reason, details, status, created_at, resolved_at, reporter_name, books(title, slug)'

export default function AdminReportsPage() {
  const { message, show } = useToast()
  const [status, setStatus] = useState('open')
  const [reports, setReports] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const requestId = useRef(0)

  const fetchPage = useCallback(
    (offset) =>
      supabase
        .from('reports')
        .select(FIELDS, { count: 'exact' })
        .eq('status', status)
        .order('created_at', { ascending: false })
        .order('id')
        .range(offset, offset + PAGE_SIZE - 1),
    [status],
  )

  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    setError('')
    fetchPage(0).then(({ data, error: err, count }) => {
      if (id !== requestId.current) return
      if (err) {
        setError('We could not load the reports. Please try again.')
        setReports([])
      } else {
        setReports(data)
        setTotal(count ?? data.length)
      }
      setLoading(false)
    })
  }, [fetchPage, reloadKey])

  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    const { data, error: err, count } = await fetchPage(reports.length)
    if (err) {
      show('Could not load more reports.')
    } else {
      setReports((prev) => {
        const seen = new Set(prev.map((r) => r.id))
        return [...prev, ...data.filter((r) => !seen.has(r.id))]
      })
      if (count != null) setTotal(count)
    }
    setLoadingMore(false)
  }

  const setReportStatus = async (report, next) => {
    setBusyId(report.id)
    const { data, error: err } = await supabase
      .from('reports')
      .update({ status: next, resolved_at: next === 'resolved' ? new Date().toISOString() : null })
      .eq('id', report.id)
      .select('id')
    if (err || !data || data.length === 0) {
      show('Could not update the report. Please try again.')
    } else {
      setReports((prev) => prev.filter((r) => r.id !== report.id))
      setTotal((t) => Math.max(0, t - 1))
      show(next === 'resolved' ? 'Marked as resolved' : 'Reopened')
    }
    setBusyId(null)
  }

  const remove = async (report) => {
    if (!window.confirm('Delete this report permanently?')) return
    setBusyId(report.id)
    const { data, error: err } = await supabase.from('reports').delete().eq('id', report.id).select('id')
    if (err || !data || data.length === 0) {
      show('Could not delete the report. Please try again.')
    } else {
      setReports((prev) => prev.filter((r) => r.id !== report.id))
      setTotal((t) => Math.max(0, t - 1))
      show('Report deleted')
    }
    setBusyId(null)
  }

  const tabClass = (active) =>
    `flex-1 rounded-full px-4 py-2 text-sm font-extrabold transition ${active ? 'bg-ink text-white' : 'text-ink hover:bg-sky'}`
  const smallBtn =
    'inline-flex h-10 items-center justify-center gap-1.5 rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold hover:bg-sky disabled:opacity-60'

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
        <Link to="/admin/dashboard" className="inline-flex items-center gap-1 text-sm font-extrabold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <h1 className="mt-3 flex items-center gap-2 text-2xl font-extrabold sm:text-3xl">
          <Flag className="h-7 w-7" /> Admin: reports
        </h1>

        <div className="mt-4 flex max-w-sm gap-1 rounded-full border-2 border-ink bg-white p-1" role="tablist">
          <button role="tab" aria-selected={status === 'open'} onClick={() => setStatus('open')} className={tabClass(status === 'open')}>
            Open
          </button>
          <button role="tab" aria-selected={status === 'resolved'} onClick={() => setStatus('resolved')} className={tabClass(status === 'resolved')}>
            Resolved
          </button>
        </div>

        {!loading && !error && (
          <p className="mt-3 text-sm font-bold text-ink-soft">
            {total} {status} {total === 1 ? 'report' : 'reports'}, newest first
          </p>
        )}

        <div className="mt-4">
          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
            </div>
          )}

          {!loading && error && (
            <div role="alert" className="rounded-3xl border-2 border-ink bg-white p-8 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-blush" />
              <p className="mt-3 font-bold">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-4 rounded-full bg-lime px-6 py-2.5 font-extrabold shadow-[0_3px_0_0_var(--color-ink)]"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && reports.length === 0 && (
            <div className="rounded-3xl border-2 border-ink bg-white p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-lime-deep" />
              <p className="mt-3 text-lg font-extrabold">{status === 'open' ? 'No open reports' : 'No resolved reports yet'}</p>
              <p className="mt-1 text-sm font-semibold text-ink-soft">
                {status === 'open' ? 'When a reader reports a problem, it appears here.' : 'Reports you resolve are kept here.'}
              </p>
            </div>
          )}

          {!loading && !error && reports.length > 0 && (
            <>
              <ul className="space-y-3">
                {reports.map((r) => (
                  <li key={r.id} className="rounded-3xl border-2 border-ink bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 break-words font-extrabold">{reasonLabel(r.reason)}</p>
                      <time dateTime={r.created_at} className="text-xs font-bold text-ink-soft">
                        {new Date(r.created_at).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </time>
                    </div>

                    {r.books ? (
                      <p className="mt-0.5 break-words text-sm font-bold text-ink-soft">
                        Book:{' '}
                        <Link to={`/book/${r.books.slug}`} className="underline">
                          {r.books.title}
                        </Link>
                      </p>
                    ) : null}
                    <p className="text-sm font-semibold text-ink-soft">From: {r.reporter_name || 'Reader'}</p>

                    {r.details ? (
                      <p className="mt-2 whitespace-pre-line break-words rounded-2xl bg-paper p-3 text-sm font-semibold">{r.details}</p>
                    ) : (
                      <p className="mt-2 text-sm font-semibold italic text-ink-soft/70">No extra details.</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {status === 'open' ? (
                        <button type="button" onClick={() => setReportStatus(r, 'resolved')} disabled={busyId === r.id} className={smallBtn}>
                          {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Mark resolved
                        </button>
                      ) : (
                        <button type="button" onClick={() => setReportStatus(r, 'open')} disabled={busyId === r.id} className={smallBtn}>
                          <RotateCcw className="h-4 w-4" /> Reopen
                        </button>
                      )}
                      <button type="button" onClick={() => remove(r)} disabled={busyId === r.id} className={smallBtn}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {reports.length < total && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-8 py-3 font-extrabold shadow-[0_4px_0_0_var(--color-ink)] hover:bg-sky disabled:opacity-60"
                  >
                    {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Toast message={message} />
    </AppLayout>
  )
}