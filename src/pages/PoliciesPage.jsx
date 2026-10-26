import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Logo from '../components/Logo'
import Footer from '../components/Footer'
import { policies, LAST_UPDATED } from '../data/policies'

export default function PoliciesPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const current = policies.find((p) => p.slug === slug)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [slug])

  if (!current) return <Navigate to="/policies/terms" replace />

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

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="lg:hidden">
          <label htmlFor="policy-select" className="mb-1 block text-sm font-extrabold">Choose a policy</label>
          <select
            id="policy-select"
            value={current.slug}
            onChange={(e) => navigate(`/policies/${e.target.value}`)}
            className="w-full rounded-2xl border-2 border-ink bg-white px-4 py-3 font-bold"
          >
            {policies.map((p) => (
              <option key={p.slug} value={p.slug}>{p.title}</option>
            ))}
          </select>
        </div>

        <aside className="hidden lg:block">
          <nav aria-label="Policies" className="sticky top-6 rounded-3xl border-2 border-ink bg-white p-3">
            {policies.map((p) => (
              <Link
                key={p.slug}
                to={`/policies/${p.slug}`}
                className={`block rounded-2xl px-4 py-2 text-sm font-bold transition ${p.slug === current.slug ? 'bg-lime text-ink' : 'text-ink-soft hover:bg-sky'}`}
              >
                {p.title}
              </Link>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 break-words rounded-3xl border-2 border-ink bg-white p-6 sm:p-9">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{current.title}</h1>
          <p className="mt-1 text-sm font-bold text-ink-soft">Last updated: {LAST_UPDATED}</p>
          <p className="mt-4 rounded-2xl bg-sky p-4 text-sm font-semibold">{current.summary}</p>
          {current.sections.map((s) => (
            <section key={s.h} className="mt-7">
              <h2 className="text-xl font-bold">{s.h}</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">{s.p}</p>
            </section>
          ))}
          <p className="mt-9 border-t-2 border-ink/10 pt-5 text-sm font-semibold text-ink-soft">
            Questions about this policy? Email{' '}
            <a href="mailto:support@readingblu.com" className="font-extrabold text-ink underline">support@readingblu.com</a>.
          </p>
        </article>
      </div>
      <Footer />
    </div>
  )
}