import { Star } from 'lucide-react'

export function Stars({ value, size = 'h-4 w-4' }) {
  const rounded = Math.round(Number(value) || 0)
  return (
    <span className="inline-flex" role="img" aria-label={`${Number(value) || 0} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= rounded ? 'fill-lime text-lime-deep' : 'text-ink/25'}`} />
      ))}
    </span>
  )
}

export function StarInput({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="rounded-full p-1 transition hover:scale-110"
        >
          <Star className={`h-8 w-8 ${n <= value ? 'fill-lime text-lime-deep' : 'text-ink/30'}`} />
        </button>
      ))}
    </div>
  )
}