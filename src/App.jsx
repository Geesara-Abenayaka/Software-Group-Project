import { useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import HomePage from './pages/HomePage'
import ProgramDetailPage from './pages/ProgramDetailPage'
import AdminDashboard from './pages/AdminDashboard'
import ApplicationFormPage from './pages/ApplicationFormPage'
import ApplicationsPage from './pages/ApplicationsPage'
import ApplicationDetailPage from './pages/ApplicationDetailPage'
import ApplicationViewPage from './pages/ApplicationViewPage'
import SearchApplicationsPage from './pages/SearchApplicationsPage'
import DownloadFormsPage from './pages/DownloadFormsPage'
import MarksPage from './pages/MarksPage'
import SettingsPage from './pages/SettingsPage'
import FloatingAssistant from './components/FloatingAssistant'
import ToastHost from './components/ToastHost'

import './App.css'

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
