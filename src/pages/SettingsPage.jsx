import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
  }, [navigate]);

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
            <div className="graduation-cap-icon">🎓</div>
            <div className="header-text">
              <h1 className="university-name">University of Moratuwa</h1>
              <p className="portal-subtitle">Postgraduate Management Information System</p>
            </div>
          </div>
          <div className="header-right">
            <div className="user-info">
              <div className="user-avatar">
                <span>👤</span>
              </div>
              <div className="user-details">
                <span className="user-role">Admin User</span>
                <span className="user-email">{user?.email || 'admin@uom.lk'}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <span className="logout-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </header>
      <nav className="admin-navbar">
        <div className="navbar-content">
          <button className="navbar-btn" onClick={() => navigate('/admin/dashboard')}>
            <span className="nav-icon">📋</span>
            Programs
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/applications')}>
            <span className="nav-icon">📋</span>
            Applications
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/search')}>
            <span className="nav-icon">🔍</span>
            Search
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/download')}>
            <span className="nav-icon">📥</span>
            Download
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/marks')}>
            <span className="nav-icon">📠</span>
            Marks
          </button>
          <button className="navbar-btn active">
            <span className="nav-icon">⚙️</span>
            Settings
          </button>
        </div>
      </nav>
      <div className="admin-content-full">
        <main className="admin-main-full settings-main">
          <div className="settings-section">
            <h2 className="settings-title">Set Date Range</h2>
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
        </main>
      </div>
    </div>
  );
}

export default SettingsPage;
