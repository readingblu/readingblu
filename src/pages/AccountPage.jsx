import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Coins, Loader2, Trash2, User } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'

export default function AccountPage() {
  const { user } = useAuth()
  const { profile, loading } = useProfile(user?.id)
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canDelete = confirmText.trim() === 'DELETE' && !busy

  const deleteAccount = async () => {
    if (!canDelete) return
    setBusy(true)
    setError('')

    const { error: err } = await supabase.rpc('delete_my_account')
    if (err) {
      setError(err.message || 'We could not delete your account. Please try again or email support@readingblu.com.')
      setBusy(false)
      return
    }

    await supabase.auth.signOut({ scope: 'local' })
    navigate('/', { replace: true })
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-5 sm:py-10">
        <h1 className="text-2xl font-extrabold sm:text-3xl">My account</h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-lime">
                  <User className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="break-words text-lg font-extrabold">{profile?.display_name || 'Reader'}</p>
                  <p className="break-all text-sm font-semibold text-ink-soft">{user?.email}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-extrabold">
                <span className="inline-flex items-center gap-2 rounded-full bg-sky px-4 py-2">
                  <Coins className="h-4 w-4" /> {profile?.credits ?? 0} credits
                </span>
                <span className="rounded-full bg-sky px-4 py-2">{profile?.is_pro ? 'Pro member' : 'Free plan'}</span>
              </div>

              <p className="mt-4 text-sm font-semibold text-ink-soft">
                Your name and email come from your Google account. Reading is free for now, and credits and Pro are coming soon.
              </p>
            </section>

            <section className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-xl font-extrabold">
                <AlertTriangle className="h-5 w-5 text-blush" /> Delete my account
              </h2>

              {profile?.is_admin ? (
                <p className="mt-2 text-sm font-semibold text-ink-soft">
                  Admin accounts cannot be deleted from this page.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-sm font-semibold text-ink-soft">
                    This permanently deletes your account, saved books, reviews and any credits or purchases. It cannot be undone. See the{' '}
                    <Link to="/policies/account-deletion" className="font-extrabold text-ink underline">
                      Account Deletion policy
                    </Link>
                    .
                  </p>

                  <label htmlFor="confirm-delete" className="mt-4 block text-sm font-extrabold">
                    Type DELETE to confirm
                  </label>
                  <input
                    id="confirm-delete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    className="mt-1 w-full rounded-2xl border-2 border-ink/30 bg-paper px-4 py-3 text-base font-semibold outline-none focus:border-ink focus:bg-white"
                  />

                  {error && (
                    <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={!canDelete}
                    className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-blush px-6 font-extrabold transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete my account
                  </button>
                </>
              )}
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  )
}