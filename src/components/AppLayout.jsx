import AppHeader from './AppHeader'
import PublicHeader from './PublicHeader'
import Footer from './Footer'
import { useAuth } from '../context/AuthContext'

export default function AppLayout({ children }) {
  const { session, loading } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {session ? <AppHeader /> : <PublicHeader minimal={loading} />}
      <main className="w-full flex-1">{children}</main>
      <Footer />
    </div>
  )
}