import { useState } from 'react'
import { BookOpen } from 'lucide-react'

export default function BookCover({ src, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-ink to-ink-soft text-lime ${className}`}
        aria-hidden="true"
      >
        <BookOpen className="h-10 w-10" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt="ReadingBlu book cover"
      loading="lazy"
      draggable="false"
      onError={() => setFailed(true)}
      className={`rounded-xl border-2 border-ink bg-white object-cover shadow-[0_6px_0_0_rgba(11,31,75,0.9)] ${className}`}
    />
  )
}