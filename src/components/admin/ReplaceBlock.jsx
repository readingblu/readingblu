import { useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import FileField from './FileField'

export default function ReplaceBlock({ title, help, accept, multiple, prepare, onUpload, status, notify }) {
  const [payload, setPayload] = useState(null)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [progress, setProgress] = useState(null)
  const busy = progress !== null

  const choose = async (files) => {
    setError('')
    setChecking(true)
    try {
      const result = await prepare(files)
      setPayload(result.payload)
      setSummary(result.summary)
    } catch (err) {
      setPayload(null)
      setSummary('')
      setError(err?.message || 'These files cannot be used.')
    }
    setChecking(false)
  }

  const start = async () => {
    setError('')
    setProgress({ done: 0, total: 1 })
    try {
      await onUpload(payload, (done, total) => setProgress({ done, total }))
      setPayload(null)
      setSummary('')
      notify(`${title} updated.`)
    } catch (err) {
      setError(err?.message || 'Upload failed. Nothing was changed. Please try again.')
    }
    setProgress(null)
  }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <section className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-ink-soft">{help}</p>
      <p className="mt-3 inline-flex rounded-full bg-sky px-3 py-1 text-sm font-extrabold">{status}</p>

      <div className="mt-4">
        <FileField
          label="New file"
          accept={accept}
          multiple={multiple}
          disabled={busy || checking}
          summary={checking ? 'Checking…' : summary}
          error={error}
          onFiles={choose}
        />
      </div>

      <button
        type="button"
        onClick={start}
        disabled={busy || checking || !payload}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lime px-5 font-extrabold shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {busy ? 'Uploading…' : 'Upload and replace'}
      </button>

      {busy && (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="h-3 overflow-hidden rounded-full bg-sky">
            <div className="h-full rounded-full bg-lime-deep transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm font-bold">
            Uploading {progress.done} of {progress.total}. Please keep this tab open.
          </p>
        </div>
      )}
    </section>
  )
}