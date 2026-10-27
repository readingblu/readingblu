import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Coins, Crown, Heart, Library, Search, X } from 'lucide-react'
import Logo from './Logo'
import UserMenu from './UserMenu'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { useWallet } from '../hooks/useWallet'
import { formatCredits } from '../lib/credits'

function SearchBox({ value, onChange, onSubmit, className = '' }) {
  return (
    <form role="search" onSubmit={onSubmit} className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Browse e-books"
        aria-label="Browse e-books"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border-2 border-ink bg-paper pl-12 pr-11 text-base font-semibold outline-none placeholder:text-ink-soft/70 focus:bg-white focus:ring-4 focus:ring-lime/40 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-soft hover:bg-sky"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  )
}

export default function AppHeader() {
  const { user, signOut } = useAuth()
  const { profile } = useProfile(user?.id)
  const { wallet, loading, failed } = useWallet(user?.id)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const urlQuery = params.get('q') || ''
  const onHome = pathname === '/home'
  const [value, setValue] = useState(urlQuery)

  useEffect(() => {
    setValue((prev) => (prev.trim() === urlQuery.trim() ? prev : urlQuery))
  }, [urlQuery])

  const applyToUrl = (trimmed, replace) => {
    const next = new URLSearchParams(params)
    if (trimmed) next.set('q', trimmed)
    else next.delete('q')
    setParams(next, { replace })
  }

  useEffect(() => {
    if (!onHome) return undefined
    const trimmed = value.trim()
    if (trimmed === urlQuery.trim()) return undefined
    const timer = setTimeout(() => applyToUrl(trimmed, true), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, onHome, urlQuery, params])

  const submit = (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (onHome) {
      applyToUrl(trimmed, false)
    } else {
      navigate(trimmed ? `/home?q=${encodeURIComponent(trimmed)}` : '/home')
    }
  }

  let creditsText = '…'
  if (!loading) {
    if (failed || !wallet) creditsText = '–'
    else if (wallet.is_pro) creditsText = '∞'
    else creditsText = formatCredits(wallet.daily_pages + wallet.paid_pages)
  }

  const navLink = 'inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-extrabold hover:bg-sky'

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink/10 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-3 sm:px-5">
        <div className="flex items-center gap-2 py-2 sm:gap-4">
          <Logo to="/home" className="h-9 sm:h-11" />

          <SearchBox value={value} onChange={setValue} onSubmit={submit} className="hidden max-w-xl flex-1 md:block" />

          <nav aria-label="Your books" className="hidden items-center gap-1 lg:flex">
            <Link to="/saved" className={navLink}>
              <Heart className="h-4 w-4" /> Saved
            </Link>
            <Link to="/library" className={navLink}>
              <Library className="h-4 w-4" /> Library
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/upgrade"
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-lime px-3 text-sm font-extrabold text-ink shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none sm:px-4"
            >
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Upgrade</span>
              <span className="sr-only sm:hidden">Upgrade</span>
            </Link>

            <Link
              to="/upgrade"
              aria-label={`Credits: ${creditsText}`}
              title="Your credits"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-ink bg-white pl-1.5 pr-3 text-sm font-extrabold hover:bg-sky"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime">
                <Coins className="h-4 w-4 text-ink" />
              </span>
              {creditsText}
            </Link>

            <UserMenu profile={profile} onSignOut={signOut} />
          </div>
        </div>

        <SearchBox value={value} onChange={setValue} onSubmit={submit} className="pb-2 md:hidden" />
      </div>
    </header>
  )
}