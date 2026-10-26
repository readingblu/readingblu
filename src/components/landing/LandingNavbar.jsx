import { Link } from 'react-router-dom'
import Logo from '../Logo'

export default function LandingNavbar() {
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-5">
        <Logo />
        <nav className="flex items-center gap-2 sm:gap-4">
          <a href="#features" className="hidden text-sm font-bold text-ink-soft hover:text-ink md:inline">
            Features
          </a>
          <Link to="/auth" className="px-3 py-2 text-sm font-extrabold text-ink hover:underline">
            Log in
          </Link>
          <Link
            to="/auth?mode=signup"
            className="inline-flex items-center justify-center rounded-full bg-lime px-4 py-2 text-sm font-extrabold text-ink shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  )
}