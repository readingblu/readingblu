import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-5 text-center">
      <h1 className="text-6xl font-extrabold">404</h1>
      <p className="mt-2 font-semibold text-ink-soft">This page could not be found.</p>
      <Link to="/" className="mt-6 rounded-full bg-lime px-6 py-3 font-extrabold shadow-[0_4px_0_0_var(--color-ink)]">
        Go home
      </Link>
    </div>
  )
}