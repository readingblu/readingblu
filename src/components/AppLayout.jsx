import AppHeader from './AppHeader'
import Footer from './Footer'

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppHeader />
      <main className="w-full flex-1">{children}</main>
      <Footer />
    </div>
  )
}