import { LogOut } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export default function HomePage() {
  const { user, signOut } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b-2 border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <Logo />
          <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border-2 border-ink px-4 py-2 text-sm font-extrabold hover:bg-sky">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-14 text-center">
        <h1 className="text-3xl font-extrabold">Welcome, {name}!</h1>
        <p className="mt-3 font-semibold text-ink-soft">
          You are signed in. The book library, categories and search are being built in the next phase.
        </p>
      </main>
    </div>
  )
}