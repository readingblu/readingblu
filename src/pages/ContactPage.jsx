import { Link } from 'react-router-dom'
import { Mail, Phone, ArrowLeft } from 'lucide-react'
import Logo from '../components/Logo'
import Footer from '../components/Footer'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b-2 border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <Logo />
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-extrabold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Contact us</h1>
        <p className="mt-2 font-semibold text-ink-soft">Questions, billing issues, copyright notices or privacy requests: reach us here.</p>
        <div className="mt-8 space-y-4">
          <a href="mailto:support@readingblu.com" className="flex items-center gap-4 rounded-3xl border-2 border-ink bg-white p-5 shadow-[0_5px_0_0_var(--color-ink)] hover:bg-sky">
            <Mail className="h-7 w-7 shrink-0" />
            <span className="min-w-0 break-all font-extrabold">support@readingblu.com</span>
          </a>
          <a href="tel:+94742153235" className="flex items-center gap-4 rounded-3xl border-2 border-ink bg-white p-5 shadow-[0_5px_0_0_var(--color-ink)] hover:bg-sky">
            <Phone className="h-7 w-7 shrink-0" />
            <span className="font-extrabold">+94-74-215-3235</span>
          </a>
        </div>
        <p className="mt-8 text-sm font-bold text-ink-soft">ReadingBlu is from Al Joodh.</p>
      </main>
      <Footer />
    </div>
  )
}