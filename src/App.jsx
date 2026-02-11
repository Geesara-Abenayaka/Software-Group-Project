import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
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

import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/programs/:shortCode" element={<ProgramDetailPage />} />
        <Route path="/apply" element={<ApplicationFormPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/applications" element={<ApplicationsPage />} />
        <Route path="/admin/applications/:programId" element={<ApplicationDetailPage />} />
        <Route path="/admin/application/:applicationId" element={<ApplicationViewPage />} />
        <Route path="/admin/search" element={<SearchApplicationsPage />} />
        <Route path="/admin/download" element={<DownloadFormsPage />} />
        <Route path="/admin/marks" element={<MarksPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  )
}

export default App
