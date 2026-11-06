import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Circle, Lock } from 'lucide-react'
import '../App.css'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import { ButtonSpinner } from '../components/Loaders'
import PasswordInput from '../components/PasswordInput'

const ADMIN_RECOVERY_EMAIL = 'admin@uom.lk'
// The server (server/routes/auth.js) only asks for 8 characters, so that is the only rule shown.
const MIN_PASSWORD_LENGTH = 8

// 42 -> "0:42"
const formatCooldown = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

function FormAlert({ type, children }) {
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div className={`form-alert form-alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={16} aria-hidden="true" />
      <p className="form-alert__body">{children}</p>
    </div>
  )
}

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isResetDone, setIsResetDone] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const isLongEnough = newPassword.length >= MIN_PASSWORD_LENGTH
  const passwordsMatch = newPassword !== '' && newPassword === confirmPassword

  useEffect(() => {
    if (resendCooldown <= 0) {
      return
    }

    const intervalId = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(intervalId)
  }, [resendCooldown])

  // Typing again means the last message no longer applies
  const editField = (setter) => (e) => {
    setter(e.target.value)
    setError('')
  }

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
      const response = await axios.post('/api/auth/forgot-password', {
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

  const handleResendCode = async () => {
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
      const response = await axios.post('/api/auth/forgot-password', {
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

    if (!isLongEnough) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for the new password.`)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post('/api/auth/reset-password', {
        code: verificationCode,
        email: email.trim(),
        newPassword
      })
      setSuccess(response.data?.message || 'Password reset successful.')
      setVerificationCode('')
      setNewPassword('')
      setConfirmPassword('')
      setIsResetDone(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.')
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

          <h1 className="login-title">{isResetDone ? 'Password Changed' : isCodeSent ? 'Reset Password' : 'Forgot Password'}</h1>
          <p className="login-subtitle">
            {isResetDone
              ? 'Your new password is saved.'
              : isCodeSent
                ? 'Enter the verification code sent to your email and set a new password.'
                : 'Enter your admin email to receive a verification code.'}
          </p>

          {/* (1) Email ── (2) Code & new password */}
          <ol className="auth-steps" aria-label="Reset steps">
            <li className="auth-step is-active" aria-current={!isCodeSent ? 'step' : undefined}>
              <span className="auth-step__number" aria-hidden="true">{isCodeSent ? <Check size={14} strokeWidth={3} /> : '1'}</span>
              Email
            </li>
            <li className={`auth-steps__line${isCodeSent ? ' is-active' : ''}`} aria-hidden="true" />
            <li className={`auth-step${isCodeSent ? ' is-active' : ''}`} aria-current={isCodeSent ? 'step' : undefined}>
              <span className="auth-step__number" aria-hidden="true">2</span>
              Code &amp; new password
            </li>
          </ol>

          {isResetDone ? (
            <div className="login-form">
              <FormAlert type="success">{success} You can now sign in with your new password.</FormAlert>
              <button type="button" className="sign-in-button" onClick={() => navigate('/login')} autoFocus>
                Go to login
              </button>
            </div>
          ) : !isCodeSent ? (
            <form className="login-form" onSubmit={handleSendResetLink}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-email">Email address</label>
                <input
                  id="reset-email"
                  type="email"
                  className="form-input"
                  placeholder="admin@university.ac.lk"
                  autoComplete="username"
                  value={email}
                  onChange={editField(setEmail)}
                  required
                />
              </div>

              {error && <FormAlert type="error">{error}</FormAlert>}
              {success && <FormAlert type="success">{success}</FormAlert>}

              <button type="submit" className="sign-in-button" disabled={loading}>
                {loading ? <><ButtonSpinner />Sending…</> : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-email">Email address</label>
                <input
                  id="reset-email"
                  type="email"
                  className="form-input"
                  autoComplete="username"
                  value={email}
                  onChange={editField(setEmail)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reset-code">Verification code</label>
                <input
                  id="reset-code"
                  type="text"
                  className="form-input code-input"
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={editField(setVerificationCode)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reset-new-password">New password</label>
                <PasswordInput
                  id="reset-new-password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-describedby="password-rules"
                  value={newPassword}
                  onChange={editField(setNewPassword)}
                  required
                />
                <ul className="password-rules" id="password-rules">
                  <li className={isLongEnough ? 'is-met' : ''}>
                    {isLongEnough ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
                    At least {MIN_PASSWORD_LENGTH} characters
                    <span className="sr-only">{isLongEnough ? ' (done)' : ' (not yet)'}</span>
                  </li>
                  <li className={passwordsMatch ? 'is-met' : ''}>
                    {passwordsMatch ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
                    Matches confirmation
                    <span className="sr-only">{passwordsMatch ? ' (done)' : ' (not yet)'}</span>
                  </li>
                </ul>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reset-confirm-password">Confirm new password</label>
                <PasswordInput
                  id="reset-confirm-password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={editField(setConfirmPassword)}
                  required
                />
              </div>

              {error && <FormAlert type="error">{error}</FormAlert>}
              {success && <FormAlert type="success">{success}</FormAlert>}

              <button type="submit" className="sign-in-button" disabled={loading}>
                {loading ? <><ButtonSpinner />Updating…</> : 'Reset Password'}
              </button>

              <button
                type="button"
                className="forgot-password resend-code"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || loading}
              >
                {resendCooldown > 0 ? `Resend code in ${formatCooldown(resendCooldown)}` : 'Resend verification code'}
              </button>
            </form>
          )}
        </div>

        <Link to="/login" className="auth-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to login
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}

export default ResetPasswordPage
