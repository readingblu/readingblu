import { BookOpenCheck, Sparkles, Eye, Heart, Library, Coins } from 'lucide-react'

const features = [
  { icon: BookOpenCheck, title: 'Free credits every day', text: 'Get 2 free credits every day, enough to read 20 pages. Pages you open stay unlocked for 24 hours, so you can switch books and come back to where you stopped.' },
  { icon: Sparkles, title: 'Honestly AI-made', text: 'Every book is generated with AI and published by us. Each book page carries a clear AI-generated label.' },
  { icon: Eye, title: 'Preview before you read', text: 'Every book has a sample of pages so you can see if it is your kind of story.' },
  { icon: Heart, title: 'Save your favourites', text: 'Tap the heart on any book to keep it in your Saved list for later.' },
  { icon: Library, title: 'Your personal Library', text: 'Books you purchase will live in your Library, ready whenever you are.' },
  { icon: Coins, title: 'Credit packs and Pro (coming soon)', text: 'Extra credit packs and an unlimited Pro plan are on the way. Payments are not live yet.', soon: true },
]

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-14">
      <h2 className="text-center text-3xl font-extrabold sm:text-4xl">Made for happy readers</h2>
      <p className="mx-auto mt-2 max-w-xl text-center font-semibold text-ink-soft">Simple, safe and built to work beautifully on phones, tablets and desktops.</p>

      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, text, soon }) => (
          <article key={title} className="rounded-3xl border-2 border-ink bg-white p-6 shadow-[0_5px_0_0_var(--color-ink)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime">
              <Icon className="h-6 w-6 text-ink" />
            </div>
            <h3 className="mt-4 flex flex-wrap items-center gap-2 text-xl font-bold">
              {title}
              {soon && <span className="rounded-full bg-blush/30 px-2 py-0.5 text-xs font-extrabold text-ink">Soon</span>}
            </h3>
            <p className="mt-1.5 text-sm font-semibold leading-relaxed text-ink-soft">{text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}