import './App.css'

function App() {
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
        <button className="back-button">
          <span className="back-arrow">←</span>
          <span>Back to Home</span>
        </button>

        <div className="login-card">
          <div className="lock-icon-circle">
            <div className="lock-icon">🔒</div>
          </div>

          <h2 className="login-title">Admin Login</h2>
          <p className="login-subtitle">Enter your credentials to access the admin panel</p>

          <form className="login-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="admin@university.ac.lk"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••"
              />
            </div>

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

export default App
