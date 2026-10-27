import { useState } from 'react'
import { Check, Coins, Crown, Info } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'

const creditPackages = [
  { name: 'Standard', credits: 10, pages: 100, price: '$0.50' },
  { name: 'Recommended', credits: 25, pages: 250, price: '$1.00', badge: 'Best Price' },
  { name: 'Maximum', credits: 50, pages: 500, price: '$1.99' },
]

export default function UpgradePage() {
  const [tab, setTab] = useState('credits')
  const { message, show } = useToast()

  const tabClass = (active) =>
    `flex-1 rounded-full px-4 py-2.5 text-sm font-extrabold transition sm:px-6 ${active ? 'bg-ink text-white' : 'text-ink hover:bg-sky'}`

  const comingSoon = () => show('Payments are coming soon.')

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-5 sm:py-12">
        <h1 className="text-center text-3xl font-extrabold sm:text-4xl">Upgrade your reading</h1>
        <p className="mx-auto mt-2 max-w-xl text-center font-semibold text-ink-soft">
          1 credit unlocks 10 pages. Credits never expire.
        </p>

        <div className="mx-auto mt-5 flex max-w-xl items-start gap-3 rounded-2xl bg-sky p-4 text-sm font-semibold">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Payments are not live yet, and reading is free for now. You do not need credits to read.</p>
        </div>

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
                Ad free unlimited reading on available products
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