import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ClipboardList, Search, Download, BarChart2, Settings, LogOut, User, Sun, Moon } from 'lucide-react';
import axios from 'axios';
import { isAdminDarkModeEnabled, setAdminDarkModeEnabled } from '../utils/adminTheme';
import '../styles/SettingsPage.css';

function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentDateRange, setCurrentDateRange] = useState({
    start: '2025-09-07',
    end: '2025-11-06'
  });
  const [selectedDates, setSelectedDates] = useState([]);
  const [currentDeadline, setCurrentDeadline] = useState('2024-11-11');
  const [newDeadline, setNewDeadline] = useState('2024-11-11');
  const [currentMonth1, setCurrentMonth1] = useState(new Date(2025, 8, 1)); // September 2025
  const [currentMonth2, setCurrentMonth2] = useState(new Date(2025, 10, 1)); // November 2025
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

  const handleDateClick = (date) => {
    if (selectedDates.length === 0) {
      setSelectedDates([date]);
    } else if (selectedDates.length === 1) {
      const sortedDates = [selectedDates[0], date].sort();
      setSelectedDates(sortedDates);
    } else {
      setSelectedDates([date]);
    }
  };

  const handleSetDateRange = () => {
    if (selectedDates.length === 2) {
      setCurrentDateRange({
        start: selectedDates[0],
        end: selectedDates[1]
      });
      alert('Date range updated successfully!');
    } else {
      alert('Please select start and end dates');
    }
  };

  const handleSetDeadline = () => {
    setCurrentDeadline(newDeadline);
    alert('Application deadline updated successfully!');
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

  const renderCalendar = (date, monthIndex) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const monthNames = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                       'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDates.includes(dateStr);
      const isInRange = selectedDates.length === 2 && dateStr >= selectedDates[0] && dateStr <= selectedDates[1];
      
      days.push(
        <div
          key={day}
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isInRange ? 'in-range' : ''}`}
          onClick={() => handleDateClick(dateStr)}
        >
          {day}
        </div>
      );
    }

    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="nav-arrow-cal" onClick={() => {
            const newDate = new Date(date);
            newDate.setMonth(newDate.getMonth() - 1);
            if (monthIndex === 0) setCurrentMonth1(newDate);
            else setCurrentMonth2(newDate);
          }}>‹</button>
          <span className="month-year">{monthNames[month]} {year}</span>
          <button className="nav-arrow-cal" onClick={() => {
            const newDate = new Date(date);
            newDate.setMonth(newDate.getMonth() + 1);
            if (monthIndex === 0) setCurrentMonth1(newDate);
            else setCurrentMonth2(newDate);
          }}>›</button>
        </div>
        <div className="calendar-days-header">
          {dayNames.map(day => (
            <div key={day} className="day-name">{day}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {days}
        </div>
      </div>
    );
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
            <h2 className="settings-title set-date-range-title">Set Date Range</h2>
            <p className="current-range">
              Current Range: <strong>{currentDateRange.start}</strong> to <strong>{currentDateRange.end}</strong>
            </p>

            <div className="calendars-wrapper">
              {renderCalendar(currentMonth1, 0)}
              {renderCalendar(currentMonth2, 1)}
            </div>

            <button className="set-range-btn" onClick={handleSetDateRange}>
              Set Date Range
            </button>
          </div>

          <div className="settings-section">
            <h2 className="settings-title">Application Deadline</h2>
            <p className="current-deadline">
              Current Deadline: <strong>{currentDeadline}</strong>
            </p>

            <input
              type="date"
              className="deadline-input"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
            />

            <button className="set-deadline-btn" onClick={handleSetDeadline}>
              Set Application Deadline
            </button>
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
