import { NavLink } from 'react-router-dom'
import { Flame, Heart, Home, Library, User } from 'lucide-react'

const TABS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/streak', label: 'Streak', icon: Flame },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/saved', label: 'Saved', icon: Heart },
  { to: '/account', label: 'Me', icon: User },
]

export default function MobileTabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-extrabold ${isActive ? 'text-ink' : 'text-ink-soft'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full transition ${isActive ? 'bg-lime' : ''}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}