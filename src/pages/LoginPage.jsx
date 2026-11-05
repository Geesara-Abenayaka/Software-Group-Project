import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../App.css'
import API_BASE_URL from '../utils/apiConfig'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      })

      if (response.data) {
        // Store user data if needed
        localStorage.setItem('user', JSON.stringify(response.data.user))
        // Navigate to admin dashboard
        navigate('/admin/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="app">
      <SiteHeader subtitle="Admin Portal" />

      <main className="content-area" id="main" tabIndex={-1}>
        <button className="back-button" onClick={() => navigate('/')}>
          <span className="back-arrow">←</span>
          <span>Back to Home</span>
        </button>

        <div className="login-card">
          <div className="lock-icon-circle">
            <div className="lock-icon">🔒</div>
          </div>

          <h1 className="login-title">Admin Login</h1>
          <p className="login-subtitle">Enter your credentials to access the admin panel</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="admin@university.ac.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p style={{color: 'red', fontSize: '14px', marginBottom: '10px'}}>{error}</p>}

            <button type="submit" className="sign-in-button">
              Sign In
            </button>

            <Link to="/reset-password" className="forgot-password">
              Forgot your password?
            </Link>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default LoginPage
