import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ApplicationsPage.css';

function ApplicationsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
    fetchPrograms();
  }, [navigate]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/programs');
      const data = await response.json();
      
      if (data.success) {
        // Add mock pending counts for each program
        const programsWithCounts = data.data.map(program => ({
          ...program,
          pendingCount: Math.floor(Math.random() * 3) // Random pending count 0-2
        }));
        setPrograms(programsWithCounts);
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleViewApplications = (programId) => {
    // Navigate to view applications for this program
    navigate(`/admin/applications/${programId}`);
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
          <button className="navbar-btn active">
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
          <button className="navbar-btn" onClick={() => navigate('/admin/settings')}>
            <span className="nav-icon">⚙️</span>
            Settings
          </button>
        </div>
      </nav>

      <div className="admin-content-full">
        <main className="admin-main-full applications-main">
          <div className="applications-grid">
            {programs.map((program) => (
              <div key={program._id} className="application-program-card">
                <div className="card-header-apps">
                  <div className="user-icon-apps">
                    <span>👤</span>
                  </div>
                  <div className="pending-badge">
                    <span className="pending-count">{program.pendingCount}</span>
                    <span className="pending-text">Pending</span>
                  </div>
                </div>

                <h3 className="program-title-apps">{program.title}</h3>
                
                <p className="program-description-apps">{program.description}</p>

                <button 
                  className="view-applications-btn"
                  onClick={() => handleViewApplications(program._id)}
                >
                  View Applications
                  <span className="arrow-icon">→</span>
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ApplicationsPage;
