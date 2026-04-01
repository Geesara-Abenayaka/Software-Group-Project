import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import '../App.css'

const ADMIN_RECOVERY_EMAIL = 'admin@uom.lk'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (resendCooldown <= 0) {
      return
    }

    const intervalId = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [resendCooldown])

  const handleSendResetLink = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Email is required.')
      return
    }

    if (email.trim().toLowerCase() !== ADMIN_RECOVERY_EMAIL) {
      setError('Only admin email can reset password here.')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
        email: email.trim()
      })
      setSuccess(response.data?.message || 'If that admin email exists, a verification code has been sent.')
      setIsCodeSent(true)
      setResendCooldown(30)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async (e) => {
    e.preventDefault()

    if (resendCooldown > 0 || loading) {
      return
    }

    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Email is required.')
      return
    }

    if (email.trim().toLowerCase() !== ADMIN_RECOVERY_EMAIL) {
      setError('Only admin email can reset password here.')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post('http://localhost:5000/api/auth/forgot-password', {
        email: email.trim()
      })
      setSuccess(response.data?.message || 'Verification code sent.')
      setResendCooldown(30)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!verificationCode || !newPassword || !confirmPassword) {
      setError('Please fill all fields.')
      return
    }

    if (email.trim().toLowerCase() !== ADMIN_RECOVERY_EMAIL) {
      setError('Only admin email can reset password here.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post('http://localhost:5000/api/auth/reset-password', {
        code: verificationCode,
        email: email.trim(),
        newPassword
      })
      setSuccess(response.data?.message || 'Password reset successful.')
      setVerificationCode('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="graduation-cap-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
              <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
            </svg>
          </div>
          <div className="header-text">
            <h1 className="university-name">University of Moratuwa</h1>
            <p className="portal-subtitle">Admin Portal</p>
          </div>
        </div>
      </header>

      <div className="content-area">
        <button className="back-button" onClick={() => navigate('/login')}>
          <span className="back-arrow">←</span>
          <span>Back to Login</span>
        </button>

        <div className="login-card">
          <div className="lock-icon-circle">
            <div className="lock-icon">🔒</div>
          </div>

          <h2 className="login-title">{isCodeSent ? 'Reset Password' : 'Forgot Password'}</h2>
          <p className="login-subtitle">
            {isCodeSent
              ? 'Enter the verification code sent to your email and set a new password.'
              : 'Enter your admin email to receive a verification code.'}
          </p>

          {!isCodeSent ? (
            <form className="login-form" onSubmit={handleSendResetLink}>
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

              {error && <p style={{ color: 'red', fontSize: '14px', marginBottom: '10px' }}>{error}</p>}
              {success && <p style={{ color: 'green', fontSize: '14px', marginBottom: '10px' }}>{success}</p>}

              <button type="submit" className="sign-in-button" disabled={loading}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p style={{ color: 'red', fontSize: '14px', marginBottom: '10px' }}>{error}</p>}
              {success && <p style={{ color: 'green', fontSize: '14px', marginBottom: '10px' }}>{success}</p>}

              <button type="submit" className="sign-in-button" disabled={loading}>
                {loading ? 'Updating...' : 'Reset Password'}
              </button>

              <a
                href="#"
                className="forgot-password"
                onClick={handleResendCode}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
              </a>

            </form>
          )}
        </div>

        <footer className="footer">
          © 2024 University of Moratuwa. All rights reserved.
        </footer>
      </div>
    </div>
  )
}

export default ResetPasswordPage
