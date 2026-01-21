import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgramCard from '../components/ProgramCard';
import '../styles/AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchPrograms();
  }, [navigate]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/programs');
      const data = await response.json();
      
      if (data.success) {
        setPrograms(data.data);
      } else {
        setError('Failed to load programs');
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleViewApplications = (shortCode) => {
    // Navigate to applications page for this program
    navigate(`/admin/programs/${shortCode}/applications`);
  };

  if (loading) {
    return (
      <div className="admin-app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading programs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-app">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchPrograms} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

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
                <span className="user-email">{user?.email || 'admin@admin.lk'}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <span className="logout-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-nav">
          <button className="nav-btn nav-btn-active">
            <span className="nav-icon">📋</span>
            Applications
          </button>
          <button className="nav-btn">
            <span className="nav-icon">🔍</span>
            Search
          </button>
          <button className="nav-btn">
            <span className="nav-icon">📥</span>
            Download
          </button>
          <button className="nav-btn">
            <span className="nav-icon">🏷️</span>
            Marks
          </button>
          <button className="nav-btn">
            <span className="nav-icon">⚙️</span>
            Settings
          </button>
        </div>

        <main className="admin-main">
          <div className="programs-header-admin">
            <h2 className="programs-title-admin">Postgraduate Programs</h2>
          </div>

          {programs.length === 0 ? (
            <div className="no-programs">
              <p>No programs available</p>
            </div>
          ) : (
            <div className="programs-grid-admin">
              {programs.map((program) => (
                <ProgramCard
                  key={program._id}
                  program={program}
                  onViewApplications={handleViewApplications}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;
