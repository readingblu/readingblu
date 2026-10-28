import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import PoliciesPage from './pages/PoliciesPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import HomePage from './pages/HomePage.jsx'
import UpgradePage from './pages/UpgradePage.jsx'
import BookPage from './pages/BookPage.jsx'
import SavedPage from './pages/SavedPage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import ReaderPage from './pages/ReaderPage.jsx'
import AdminBooksPage from './pages/AdminBooksPage.jsx'
import AdminBookEditPage from './pages/AdminBookEditPage.jsx'
import AdminReviewsPage from './pages/AdminReviewsPage.jsx'
import AdminReportsPage from './pages/AdminReportsPage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminRoute from './components/AdminRoute.jsx'

function Admin({ children }) {
  return (
    <ProtectedRoute>
      <AdminRoute>{children}</AdminRoute>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/policies" element={<PoliciesPage />} />
      <Route path="/policies/:slug" element={<PoliciesPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upgrade"
        element={
          <ProtectedRoute>
            <UpgradePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book/:slug"
        element={
          <ProtectedRoute>
            <BookPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/read/:slug"
        element={
          <ProtectedRoute>
            <ReaderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saved"
        element={
          <ProtectedRoute>
            <SavedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            <LibraryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        }
      />
      <Route path="/admin" element={<Admin><AdminBooksPage /></Admin>} />
      <Route path="/admin/dashboard" element={<Admin><AdminDashboardPage /></Admin>} />
      <Route path="/admin/reviews" element={<Admin><AdminReviewsPage /></Admin>} />
      <Route path="/admin/reports" element={<Admin><AdminReportsPage /></Admin>} />
      <Route path="/admin/books/new" element={<Admin><AdminBookEditPage /></Admin>} />
      <Route path="/admin/books/:id" element={<Admin><AdminBookEditPage /></Admin>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}