import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import HomePage from './pages/HomePage'
import ProgramDetailPage from './pages/ProgramDetailPage'

// The stylesheets of the pages below, loaded with the rest of the site and in the order the pages used to
// load them. Several pages share class names (.form-group, .section-title…), so if each page brought its
// own CSS when opened, a page could look different depending on which pages were visited before it.
import './styles/AdminDashboard.css'
import './styles/admin-tables.css'
import './styles/admin-summary.css'
import './styles/confirm-dialog.css'
import './styles/ApplicationFormPage.css'
import './styles/payment.css'
import './styles/ApplicationsPage.css'
import './styles/ApplicationDetailPage.css'
import './styles/ApplicationViewPage.css'
import './styles/SearchApplicationsPage.css'
import './styles/DownloadFormsPage.css'
import './styles/MarksPage.css'
import './styles/SettingsPage.css'
import FloatingAssistant from './components/FloatingAssistant'
import ToastHost from './components/ToastHost'
import { PageLoader } from './components/Loaders'

import './App.css'

// The admin pages and the application form are downloaded only when someone opens them, so a visitor
// browsing programmes doesn't load the admin code, jsPDF or the payment library.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const ApplicationFormPage = lazy(() => import('./pages/ApplicationFormPage'))
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'))
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'))
const ApplicationViewPage = lazy(() => import('./pages/ApplicationViewPage'))
const SearchApplicationsPage = lazy(() => import('./pages/SearchApplicationsPage'))
const DownloadFormsPage = lazy(() => import('./pages/DownloadFormsPage'))
const MarksPage = lazy(() => import('./pages/MarksPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function AppRoutes() {
  const location = useLocation()
  const hideChatbot =
    location.pathname.startsWith('/admin') ||
    location.pathname === '/login' ||
    location.pathname === '/reset-password'

  // After moving to another page, put focus on its content so screen readers start there.
  // Not on the first load: the browser already starts at the top of the page.
  const isFirstLoad = useRef(true)
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      return
    }
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [location.pathname])

  return (
    <>
      {/* Each new page fades in. The chat stays outside so it isn't reset on every page change. */}
      <div key={location.pathname} className="page-enter">
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/programs/:shortCode" element={<ProgramDetailPage />} />
        <Route path="/apply" element={<ApplicationFormPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/applications" element={<ApplicationsPage />} />
        <Route path="/admin/applications/:programId" element={<ApplicationDetailPage />} />
        <Route path="/admin/application/:applicationId" element={<ApplicationViewPage />} />
        <Route path="/admin/search" element={<SearchApplicationsPage />} />
        <Route path="/admin/download" element={<DownloadFormsPage />} />
        <Route path="/admin/marks" element={<MarksPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
      </Routes>
      </Suspense>
      </div>

      {!hideChatbot && <FloatingAssistant />}
      <ToastHost />
    </>
  )
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  )
}

export default App
