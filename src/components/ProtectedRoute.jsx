import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authUrl } from '../lib/nav'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const { pathname, search } = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-8 w-8 animate-spin text-ink" aria-label="Loading" />
      </div>
    )
  }

  if (!session) return <Navigate to={authUrl(`${pathname}${search}`)} replace />
  return children
}