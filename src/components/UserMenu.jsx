import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Library, LogOut, User } from 'lucide-react'

export default function UserMenu({ profile, onSignOut }) {
  const [open, setOpen] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const name = profile?.display_name || 'Reader'
  const itemClass = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-sky'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-white hover:bg-sky"
      >
        {profile?.avatar_url && !imgFailed ? (
          <img
            src={profile.avatar_url}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-5 w-5" />
        )}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-56 rounded-2xl border-2 border-ink bg-white p-2 shadow-xl">
          <p className="truncate px-3 py-2 text-sm font-extrabold">{name}</p>
          <div className="my-1 h-px bg-ink/10" />
          <Link role="menuitem" to="/saved" onClick={() => setOpen(false)} className={itemClass}>
            <Heart className="h-4 w-4" /> Saved books
          </Link>
          <Link role="menuitem" to="/library" onClick={() => setOpen(false)} className={itemClass}>
            <Library className="h-4 w-4" /> My Library
          </Link>
          <div className="my-1 h-px bg-ink/10" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
            className={itemClass}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}