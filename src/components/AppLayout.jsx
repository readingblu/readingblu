import AppHeader from './AppHeader'
import PublicHeader from './PublicHeader'
import MobileTabBar from './MobileTabBar'
import Footer from './Footer'
import { useAuth } from '../context/AuthContext'

export default function AppLayout({ children }) {
  const { session, loading } = useAuth()

  return (
    <div
      className={`flex min-h-screen flex-col bg-paper ${
        session ? 'pb-[calc(4.25rem_+_env(safe-area-inset-bottom))] md:pb-0' : ''
      }`}
    >
      {session ? <AppHeader /> : <PublicHeader minimal={loading} />}
      <main className="w-full flex-1">{children}</main>
      <Footer />
      {session && <MobileTabBar />}
    </div>
  )
}