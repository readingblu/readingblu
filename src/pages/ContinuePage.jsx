import { Navigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authUrl, safeNext } from '../lib/nav'

// Google sends people here after sign-in, for example /continue/book/the-moon-rabbit
export default function ContinuePage() {
  const { '*': rest } = useParams()
  const { session, loading } = useAuth()
  const target = safeNext(`/${rest || ''}`)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-8 w-8 animate-spin text-ink" aria-label="Signing you in" />
      </div>
    )
  }

  if (session) return <Navigate to={target || '/home'} replace />
  return <Navigate to={authUrl(target)} replace />
}