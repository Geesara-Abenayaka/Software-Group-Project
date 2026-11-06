import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { AlertCircle, ArrowLeft, Lock } from 'lucide-react'
import '../App.css'
import API_BASE_URL from '../utils/apiConfig'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import { ButtonSpinner } from '../components/Loaders'
import PasswordInput from '../components/PasswordInput'
import usePageTitle from '../utils/usePageTitle'
import { saveAdminSession } from '../utils/adminSession'

// Wrong email or password: shown with a link to reset the password
const WRONG_DETAILS = 'wrong-details'

function LoginPage() {
  usePageTitle('Admin login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  // Sent here by an admin page after the server said the session was no longer valid
  const [searchParams] = useSearchParams()
  const sessionEnded = searchParams.get('session') === 'ended'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      })

      if (response.data) {
        // The user and the signed session that admin pages send with every admin API request
        saveAdminSession(response.data)
        // Navigate to admin dashboard
        navigate('/admin/dashboard')
      }
    } catch (err) {
      // Say what went wrong and what to do next
      if (!err.response) {
        setError("We couldn't reach the server. Check your connection and try again.")
      } else if (err.response.status === 401) {
        setError(WRONG_DETAILS)
      } else {
        setError(err.response.data?.message || 'Sign in failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <SiteHeader subtitle="Admin Portal" />

      <main className="content-area auth-page" id="main" tabIndex={-1}>
        <div className="login-card">
          <div className="lock-icon-circle">
            <Lock size={28} className="lock-icon" aria-hidden="true" />
          </div>

          <h1 className="login-title">Admin Login</h1>
          <p className="login-subtitle">Sign in to manage programs and applications</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                placeholder="admin@university.ac.lk"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <PasswordInput
                id="login-password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                required
              />
            </div>

            {sessionEnded && !error && (
              <div className="form-alert form-alert--info" role="status">
                <AlertCircle size={16} aria-hidden="true" />
                <p className="form-alert__body">Your session has ended. Please sign in again.</p>
              </div>
            )}

            {error && (
              <div className="form-alert form-alert--error" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <p className="form-alert__body">
                  {error === WRONG_DETAILS ? (
                    <>
                      Incorrect email or password. Check them, or{' '}
                      <Link to="/reset-password">reset your password</Link>.
                    </>
                  ) : error}
                </p>
              </div>
            )}

            <button type="submit" className="sign-in-button" disabled={loading}>
              {loading ? <><ButtonSpinner />Signing in…</> : 'Sign in'}
            </button>

            <Link to="/reset-password" className="forgot-password">
              Forgot your password?
            </Link>
          </form>
        </div>

        <Link to="/" className="auth-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to programs
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}

export default LoginPage
