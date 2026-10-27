import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Loader2, Lock, Mail } from 'lucide-react'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  )
}

export default function AuthPage() {
  const { session, loading, signInWithGoogle } = useAuth()
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'signup' ? 'signup' : 'login'
  const [adult, setAdult] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!loading && session) return <Navigate to="/home" replace />

  const ready = adult && accepted

  const handleGoogle = async () => {
    if (!ready) return
    setBusy(true)
    setError('')
    const { error: err } = await signInWithGoogle()
    if (err) {
      setError(err.message || 'Could not start Google sign-in. Please try again.')
      setBusy(false)
    }
  }

  const tabClass = (active) =>
    `flex-1 rounded-full px-4 py-2 text-sm font-extrabold transition ${active ? 'bg-ink text-white' : 'text-ink hover:bg-sky'}`

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-5 flex justify-center">
          <Logo className="h-16 sm:h-20" />
        </div>

        <div className="rounded-3xl border-2 border-ink bg-white p-6 shadow-[0_6px_0_0_var(--color-ink)] sm:p-8">
          <div className="flex gap-1 rounded-full border-2 border-ink p-1" role="tablist">
            <button role="tab" aria-selected={mode === 'login'} className={tabClass(mode === 'login')} onClick={() => setParams({})}>
              Log in
            </button>
            <button role="tab" aria-selected={mode === 'signup'} className={tabClass(mode === 'signup')} onClick={() => setParams({ mode: 'signup' })}>
              Sign up
            </button>
          </div>

          <h1 className="mt-5 text-center text-2xl font-extrabold">{mode === 'signup' ? 'Create your free account' : 'Welcome back'}</h1>
          <p className="mt-1 text-center text-sm font-semibold text-ink-soft">
            Stories for readers of all ages. Accounts are for parents and adults, and children can read through them.
          </p>

          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-ink-soft">
              <input
                type="checkbox"
                checked={adult}
                onChange={(e) => setAdult(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-lime-deep"
              />
              <span>I am 18 or older. If a child reads with my account, I am their parent or guardian.</span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-ink-soft">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-lime-deep"
              />
              <span>
                I accept the{' '}
                <Link to="/policies" target="_blank" rel="noopener noreferrer" className="font-extrabold text-ink underline">
                  Policies
                </Link>{' '}
                (Terms of Service, Privacy, Cookies, Content and Refund policies).
              </span>
            </label>
          </div>

          <button
            onClick={handleGoogle}
            disabled={!ready || busy}
            className="mt-4 inline-flex w-full items-center justify-center gap-3 rounded-full border-2 border-ink bg-white px-5 py-3 font-extrabold text-ink transition hover:bg-sky disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </button>
          {!ready && <p className="mt-2 text-center text-xs font-semibold text-ink-soft">Tick both boxes above to continue.</p>}
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="my-5 flex items-center gap-3 text-xs font-extrabold uppercase text-ink-soft">
            <span className="h-px flex-1 bg-ink/15" /> or <span className="h-px flex-1 bg-ink/15" />
          </div>

          <div className="space-y-3" aria-disabled="true">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
              <input disabled type="email" placeholder="Email address" aria-label="Email address" className="w-full rounded-full border-2 border-ink/20 bg-paper py-3 pl-12 pr-4 text-sm font-semibold opacity-60" />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
              <input disabled type="password" placeholder="Password" aria-label="Password" className="w-full rounded-full border-2 border-ink/20 bg-paper py-3 pl-12 pr-4 text-sm font-semibold opacity-60" />
            </div>
            <button disabled className="w-full cursor-not-allowed rounded-full bg-ink/10 px-5 py-3 font-extrabold text-ink-soft">
              {mode === 'signup' ? 'Sign up with email' : 'Log in with email'} (coming soon)
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-sm font-semibold text-ink-soft">
          <Link to="/" className="underline">Back to home</Link>
        </p>
      </div>
    </div>
  )
}