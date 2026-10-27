import { useRef } from 'react'
import { FileUp } from 'lucide-react'

export default function FileField({ label, help, accept, multiple = false, disabled = false, summary, error, onFiles }) {
  const ref = useRef(null)

  return (
    <div>
      <p className="text-sm font-extrabold">{label}</p>
      {help && <p className="mt-0.5 text-xs font-semibold text-ink-soft">{help}</p>}

      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const list = Array.from(e.target.files || [])
          e.target.value = ''
          if (list.length > 0) onFiles(list)
        }}
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={disabled}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border-2 border-ink bg-white px-5 font-extrabold hover:bg-sky disabled:opacity-60"
        >
          <FileUp className="h-4 w-4" /> {summary ? 'Change' : 'Choose'}
        </button>
        {summary && <p className="min-w-0 break-words text-sm font-bold">{summary}</p>}
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}