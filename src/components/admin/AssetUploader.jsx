import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Upload } from 'lucide-react'
import { sortFiles, validateImages } from '../../lib/bookAssets'

export default function AssetUploader({ title, help, max, status, onUpload, notify }) {
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const busy = progress !== null

  const choose = (e) => {
    const list = sortFiles(e.target.files)
    e.target.value = ''
    const problem = validateImages(list, max)
    if (problem) {
      setError(problem)
      setFiles([])
      return
    }
    setError('')
    setFiles(list)
  }

  const start = async () => {
    setError('')
    setProgress({ done: 0, total: files.length })
    try {
      await onUpload(files, (done, total) => setProgress({ done, total }))
      setFiles([])
      notify(`${title} saved.`)
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

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={max > 1}
        onChange={choose}
        className="hidden"
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-2 border-ink bg-white px-5 font-extrabold hover:bg-sky disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" /> Choose {max > 1 ? 'images' : 'image'}
        </button>
        <button
          type="button"
          onClick={start}
          disabled={busy || files.length === 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lime px-5 font-extrabold shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? 'Uploading…' : 'Upload and replace'}
        </button>
      </div>

      {files.length > 0 && !busy && (
        <p className="mt-3 break-words text-sm font-semibold text-ink-soft">
          {files.length} selected, in this order: <strong>{files[0].name}</strong>
          {files.length > 1 && (
            <>
              {' '}→ … → <strong>{files[files.length - 1].name}</strong>
            </>
          )}
          . Uploading replaces the current ones.
        </p>
      )}

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

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </section>
  )
}