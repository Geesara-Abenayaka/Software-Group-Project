import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../App.css'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      })

      if (response.data) {
        // Store user data if needed
        localStorage.setItem('user', JSON.stringify(response.data.user))
        // Navigate to home page
        navigate('/home')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="graduation-cap-icon">🎓</div>
          <div className="header-text">
            <h1 className="university-name">University of Moratuwa</h1>
            <p className="portal-subtitle">Admin Portal</p>
          </div>
        </div>
      </header>

      <div className="content-area">
        <button className="back-button" onClick={() => navigate('/')}>
          <span className="back-arrow">←</span>
          <span>Back to Home</span>
        </button>

        <div className="login-card">
          <div className="lock-icon-circle">
            <div className="lock-icon">🔒</div>
          </div>

          <h2 className="login-title">Admin Login</h2>
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

            <a href="#" className="forgot-password">
              Forgot your password?
            </a>
          </form>
        </div>

        <footer className="footer">
          © 2024 University of Moratuwa. All rights reserved.
        </footer>
      </div>
    </div>
  )
}

export default LoginPage
