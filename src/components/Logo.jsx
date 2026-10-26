import { Link } from 'react-router-dom'

export default function Logo({ className = 'h-10 sm:h-12', to = '/' }) {
  return (
    <Link to={to} aria-label="ReadingBlu home" className="inline-flex shrink-0 items-center">
      <img src="/readingblu.png" alt="ReadingBlu" className={`${className} w-auto max-w-full object-contain`} />
    </Link>
  )
}