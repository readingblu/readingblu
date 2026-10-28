import { Link } from 'react-router-dom'
import LandingNavbar from '../components/landing/LandingNavbar'
import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import LatestBooks from '../components/landing/LatestBooks'
import Footer from '../components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <LandingNavbar />
      <main>
        <Hero />
        <Features />
        <LatestBooks />
        <section className="mx-auto mt-10 max-w-4xl px-5">
          <div className="rounded-3xl bg-ink p-8 text-center text-white sm:p-12">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Ready for your next story?</h2>
            <p className="mx-auto mt-2 max-w-md font-semibold text-white/80">Create a free account with Google and get 2 free credits every day.</p>
            <Link
              to="/auth?mode=signup"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-lime px-8 py-3.5 text-base font-extrabold text-ink transition hover:-translate-y-0.5"
            >
              Get started free
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}