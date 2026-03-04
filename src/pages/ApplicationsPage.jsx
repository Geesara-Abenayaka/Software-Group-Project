import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ClipboardList, Search, Download, BarChart2, Settings, LogOut, User } from 'lucide-react';
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
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/programs');
      const data = await response.json();
      
      if (data.success) {
        // Fetch all applications to count pending ones per program
        const appsResponse = await fetch('http://localhost:5000/api/applications');
        const appsData = await appsResponse.json();
        
        const programsWithCounts = data.data.map(program => {
          // Count pending applications for this program
          const pendingCount = appsData.success ? 
            appsData.data.filter(app => 
              app.program === program.shortCode && app.status === 'pending'
            ).length : 0;
          
          return {
            ...program,
            pendingCount
          };
        });
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

  const handleViewApplications = (programShortCode) => {
    // Navigate to view applications for this program
    navigate(`/admin/applications/${programShortCode}`);
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
          <button className="navbar-btn" onClick={() => navigate('/admin/settings')}>
            <Settings size={18} className="nav-icon" />
            Settings
          </button>
        </div>
      </nav>

      <div className="admin-content-full">
        <main className="admin-main-full applications-main">
          <div className="page-title-row">
            <h2 className="page-heading">Applications</h2>
          </div>
          <div className="programs-grid-admin">
            {loading ? (
              <div style={{ padding: '2rem', color: '#9ca3af', gridColumn: '1/-1' }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
              </div>
            ) : (
            programs.map((program) => (
              <div key={program._id} className="program-card-admin">
                <div className="card-top-row">
                  <div className="card-avatar-icon">
                    <User size={22} color="#9ca3af" />
                  </div>
                  <span className={`pending-badge-pill ${program.pendingCount > 0 ? 'pending-red' : 'pending-gray'}`}>
                    {program.pendingCount} Pending
                  </span>
                </div>

                <h3 className="card-title-admin">{program.title}</h3>
                <p className="card-description-admin">{program.description}</p>

                <div className="card-bottom-row">
                  <button
                    className="view-applications-link"
                    onClick={() => handleViewApplications(program.shortCode)}
                  >
                    View Applications <span className="link-chevron">›</span>
                  </button>
                </div>
              </div>
            ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default ApplicationsPage;
