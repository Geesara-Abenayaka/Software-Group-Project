import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ClipboardList, Search, Download, BarChart2, Settings, LogOut, User, Sun, Moon } from 'lucide-react';
import axios from 'axios';
import { isAdminDarkModeEnabled, setAdminDarkModeEnabled } from '../utils/adminTheme';
import '../styles/SettingsPage.css';

function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isNightMode, setIsNightMode] = useState(() => isAdminDarkModeEnabled());

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleToggleNightMode = () => {
    setIsNightMode((prevMode) => {
      const nextMode = !prevMode;
      setAdminDarkModeEnabled(nextMode);
      return nextMode;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      setPasswordFeedback({ type: 'error', message: 'User session missing. Please login again.' });
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Please fill all password fields.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordFeedback({ type: 'error', message: 'Use at least one uppercase letter, one lowercase letter and one number.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password and confirm password do not match.' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordFeedback({ type: '', message: '' });

    try {
      const response = await axios.post('http://localhost:5000/api/auth/change-password', {
        userId: user.id,
        currentPassword,
        newPassword
      });

      setPasswordFeedback({ type: 'success', message: response.data?.message || 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Unable to change password. Please try again.'
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="admin-app">
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="header-left">
            <div className="header-text">
              <h1 className="university-name">University of Moratuwa</h1>
              <p className="portal-subtitle">Postgraduate Management Information System</p>
            </div>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                <User size={20} color="white" />
              </div>
              <div className="user-details">
                <span className="user-role">Admin User</span>
                <span className="user-email">{user?.email || 'admin@uom.lk'}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>
      <nav className="admin-navbar">
        <div className="navbar-content">
          <button className="navbar-btn" onClick={() => navigate('/admin/dashboard')}>
            <GraduationCap size={18} className="nav-icon" />
            Programs
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/applications')}>
            <ClipboardList size={18} className="nav-icon" />
            Applications
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/search')}>
            <Search size={18} className="nav-icon" />
            Search
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/download')}>
            <Download size={18} className="nav-icon" />
            Download
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/marks')}>
            <BarChart2 size={18} className="nav-icon" />
            Marks
          </button>
          <button className="navbar-btn active">
            <Settings size={18} className="nav-icon" />
            Settings
          </button>
        </div>
      </nav>
      <div className="admin-content-full">
        <main className="admin-main-full settings-main">
          <div className="settings-section">
            <div className="display-mode-row">
              <h2 className="settings-title">Display Mode</h2>
              <div className="mode-toggle-row">
                <button
                  type="button"
                  className={`mode-switch ${isNightMode ? 'active' : ''}`}
                  onClick={handleToggleNightMode}
                  role="switch"
                  aria-checked={isNightMode}
                  aria-label="Toggle night mode"
                >
                  <span className="mode-switch-icon mode-switch-icon-sun">
                    <Sun size={14} />
                  </span>
                  <span className="mode-switch-icon mode-switch-icon-moon">
                    <Moon size={14} />
                  </span>
                  <span className="mode-switch-dot"></span>
                </button>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h2 className="settings-title">Change Admin Password</h2>
            <p className="current-deadline">
              Update your admin password securely.
            </p>

            <form className="password-form" onSubmit={handleChangePassword}>
              <div className="password-grid">
                <div className="password-field-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    id="currentPassword"
                    type="password"
                    className="deadline-input"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                </div>

                <div className="password-field-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    className="deadline-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 chars, upper/lower/number"
                    autoComplete="new-password"
                  />
                </div>

                <div className="password-field-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="deadline-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {passwordFeedback.message && (
                <p className={`password-feedback ${passwordFeedback.type}`}>
                  {passwordFeedback.message}
                </p>
              )}

              <button
                type="submit"
                className="set-deadline-btn"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? 'Updating Password...' : 'Change Password'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default SettingsPage;
