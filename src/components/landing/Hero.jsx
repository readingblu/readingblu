import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import BookCover from './BookCover'
import { landingCovers } from '../../data/landingBooks'

function Row({ covers, reverse = false }) {
  const doubled = [...covers, ...covers]
  return (
    <div className="overflow-hidden py-3">
      <div className={`flex gap-4 ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}>
        {doubled.map((src, i) => (
          <div key={`${src}-${i}`} className="w-28 shrink-0 sm:w-36 lg:w-40">
            <BookCover src={src} className="aspect-[2/3] w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Hero() {
  const first = landingCovers.slice(0, 4)
  const second = landingCovers.slice(4)

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 pb-6 pt-10 text-center sm:pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-white px-4 py-1.5 text-xs font-extrabold text-ink sm:text-sm">
          <Sparkles className="h-4 w-4 text-lime-deep" /> Every book is AI-generated and clearly labelled
        </span>

        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
          Stories that spark <span className="text-lime-deep">curiosity</span>, ready to read free
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-base font-semibold text-ink-soft sm:text-lg">
          Browse a growing library of AI-created e-books, preview pages first, save your favourites, and read right in your browser.
        </p>

        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            to="/auth?mode=signup"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-lime px-7 py-3.5 text-base font-extrabold text-ink shadow-[0_4px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Start reading free <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center rounded-full border-2 border-ink bg-white px-7 py-3.5 text-base font-extrabold text-ink transition hover:bg-sky"
          >
            See what's inside
          </a>
        </div>
      </div>

      <div className="mt-4" aria-hidden="true">
        <Row covers={first} />
        <Row covers={second} reverse />
      </div>
    </section>
  )
}