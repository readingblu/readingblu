import { Link } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'

const links = [
  { to: '/policies/privacy', label: 'Privacy Policy' },
  { to: '/policies/terms', label: 'Terms of Service' },
  { to: '/policies/digital-content', label: 'Content Policy' },
  { to: '/policies/payments-refunds', label: 'Refund Policy' },
  { to: '/policies', label: 'All Policies' },
  { to: '/contact', label: 'Contact' },
]

export default function Footer() {
  return (
    <footer className="mt-16 bg-ink text-white">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl font-bold text-lime">ReadingBlu</p>
            <p className="mt-2 max-w-xs text-sm text-white/75">
              Magical AI-generated e-books, published by Al Joodh and clearly labelled as AI-made.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {links.map((l) => (
              <Link key={l.to + l.label} to={l.to} className="text-white/85 underline-offset-4 hover:text-lime hover:underline">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-2 text-sm">
            <a href="mailto:support@readingblu.com" className="flex items-center gap-2 break-all text-white/85 hover:text-lime">
              <Mail className="h-4 w-4 shrink-0" /> support@readingblu.com
            </a>
            <a href="tel:+94742153235" className="flex items-center gap-2 text-white/85 hover:text-lime">
              <Phone className="h-4 w-4 shrink-0" /> +94-74-215-3235
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/15 pt-5 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ReadingBlu. All rights reserved.</p>
          <p className="font-bold text-white">From Al Joodh</p>
        </div>
      </div>
    </footer>
  )
}