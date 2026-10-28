import { useState } from 'react'
import { Check, Clock, Coins, Crown, Gift, Info, Loader2 } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import Toast from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../hooks/useWallet'
import { useToast } from '../hooks/useToast'
import { DAILY_CREDITS, formatCredits, formatReset } from '../lib/credits'

const creditPackages = [
  { name: 'Standard', credits: 10, pages: 100, price: '$0.50' },
  { name: 'Recommended', credits: 25, pages: 250, price: '$1.00', badge: 'Best Price' },
  { name: 'Maximum', credits: 50, pages: 500, price: '$1.99' },
]

function Stat({ icon: Icon, label, value, note }) {
  return (
    <div className="rounded-2xl border-2 border-ink/15 bg-paper p-4 text-center">
      <Icon className="mx-auto h-5 w-5" />
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      <p className="text-sm font-extrabold">{label}</p>
      {note && <p className="mt-0.5 text-xs font-semibold text-ink-soft">{note}</p>}
    </div>
  )
}

export default function UpgradePage() {
  const { user } = useAuth()
  const { wallet, loading, failed } = useWallet(user?.id)
  const [tab, setTab] = useState('credits')
  const { message, show } = useToast()

  const tabClass = (active) =>
    `flex-1 rounded-full px-4 py-2.5 text-sm font-extrabold transition sm:px-6 ${active ? 'bg-ink text-white' : 'text-ink hover:bg-sky'}`

  const comingSoon = () => show('Payments are coming soon.')

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-5 sm:py-12">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">Your credits</h1>
        <p className="mx-auto mt-2 max-w-xl text-center font-semibold text-ink-soft">
          1 credit unlocks 10 pages. Everyone gets {DAILY_CREDITS} free credits every day, and the first 5 pages of every book are always free.
        </p>

        <section aria-label="Your balance" className="mx-auto mt-6 max-w-2xl rounded-3xl border-2 border-ink bg-white p-4 sm:p-6">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
            </div>
          )}
          {!loading && (failed || !wallet) && (
            <p role="alert" className="text-center text-sm font-bold">We could not load your credits. Please refresh the page.</p>
          )}
          {!loading && wallet && (
            <>
              {wallet.is_pro ? (
                <p className="text-center text-lg font-extrabold">You have Pro: unlimited reading on available books.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <Stat icon={Coins} label="Total" value={formatCredits(wallet.daily_pages + wallet.paid_pages)} note="available now" />
                  <Stat icon={Gift} label="Daily" value={formatCredits(wallet.daily_pages)} note={`of ${DAILY_CREDITS} today`} />
                  <Stat icon={Crown} label="Purchased" value={formatCredits(wallet.paid_pages)} note="never expire" />
                </div>
              )}
              <p className="mt-4 flex items-start gap-2 text-sm font-semibold text-ink-soft">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                Your daily credits refresh on {formatReset(wallet.next_reset)}. Unused daily credits do not carry over.
              </p>
            </>
          )}
        </section>

        <section aria-label="How credits work" className="mx-auto mt-4 max-w-2xl rounded-2xl bg-sky p-4 text-sm font-semibold">
          <p className="flex items-start gap-2 font-extrabold">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /> How it works
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>The first 5 pages of every book are free, so you can peek at the cover and the opening pages without using credits.</li>
            <li>After that, each page you open uses a tenth of a credit. Credits are shared across all your books.</li>
            <li>A page you open stays unlocked for 24 hours, so you can switch books and come back to where you stopped.</li>
            <li>Daily credits are used first, then purchased credits. You keep getting daily credits even after you buy credits.</li>
            <li>Payments are not live yet, so you cannot buy credits right now.</li>
          </ul>
        </section>

        <div className="mx-auto mt-7 flex max-w-md gap-1 rounded-full border-2 border-ink bg-white p-1" role="tablist">
          <button role="tab" aria-selected={tab === 'credits'} onClick={() => setTab('credits')} className={tabClass(tab === 'credits')}>
            Credit Packages
          </button>
          <button role="tab" aria-selected={tab === 'subscription'} onClick={() => setTab('subscription')} className={tabClass(tab === 'subscription')}>
            Subscription Packages
          </button>
        </div>

        {tab === 'credits' && (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {creditPackages.map((pkg) => (
              <article
                key={pkg.name}
                className={`relative flex flex-col rounded-3xl border-2 border-ink bg-white p-6 text-center shadow-[0_5px_0_0_var(--color-ink)] ${pkg.badge ? 'md:-translate-y-2' : ''}`}
              >
                {pkg.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lime px-3 py-1 text-xs font-extrabold text-ink shadow-[0_2px_0_0_var(--color-ink)]">
                    {pkg.badge}
                  </span>
                )}
                <h2 className="text-xl font-extrabold">{pkg.name}</h2>
                <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-lime">
                  <Coins className="h-7 w-7" />
                </div>
                <p className="mt-3 text-3xl font-extrabold">{pkg.credits} credits</p>
                <p className="text-sm font-bold text-ink-soft">({pkg.pages} pages)</p>
                <p className="mt-4 text-2xl font-extrabold">{pkg.price}</p>
                <button
                  type="button"
                  onClick={comingSoon}
                  className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-lime font-extrabold shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Buy
                </button>
              </article>
            ))}
          </div>
        )}

        {tab === 'subscription' && (
          <div className="mx-auto mt-8 max-w-md">
            <article className="flex flex-col rounded-3xl border-2 border-ink bg-white p-6 text-center shadow-[0_5px_0_0_var(--color-ink)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime">
                <Crown className="h-7 w-7" />
              </div>
              <h2 className="mt-3 text-2xl font-extrabold">Pro</h2>
              <p className="mt-3 flex items-start justify-center gap-2 text-left font-bold">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-lime-deep" />
                Unlimited reading on available products
              </p>
              <p className="mt-4 text-3xl font-extrabold">$7.99</p>
              <button
                type="button"
                onClick={comingSoon}
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-lime font-extrabold shadow-[0_3px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Subscribe
              </button>
            </article>
          </div>
        )}
      </div>

      <Toast message={message} />
    </AppLayout>
  )
}