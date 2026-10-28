import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo'
import { authUrl } from '../lib/nav'

export default function PublicHeader({ minimal = false }) {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-5">
        <Logo to="/" className="h-9 sm:h-11" />
        {!minimal && (
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link to={authUrl(pathname)} className="px-3 py-2 text-sm font-extrabold text-ink hover:underline">
              Log in
            </Link>
            <Link
              to={authUrl(pathname, 'signup')}
              className="inline-flex h-10 items-center justify-center rounded-full bg-lime px-4 text-sm font-extrabold text-ink shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}