import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'

export default function AdminRoute({ children }) {
  const { user } = useAuth()
  const { profile, loading } = useProfile(user?.id)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-8 w-8 animate-spin text-ink" aria-label="Loading" />
      </div>
    )
  }

  if (!profile?.is_admin) return <Navigate to="/home" replace />
  return children
}