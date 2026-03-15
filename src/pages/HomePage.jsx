import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Try to get cached programs from sessionStorage
  const getCachedPrograms = () => {
    try {
      const cached = sessionStorage.getItem('programs');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const cachedPrograms = getCachedPrograms();
  const [programs, setPrograms] = useState(cachedPrograms || []);
  const [loading, setLoading] = useState(!cachedPrograms);
  const [error, setError] = useState(null);
  const [openingProgram, setOpeningProgram] = useState(null);

  useEffect(() => {
    // Only fetch if we don't have cached data
    if (!cachedPrograms) {
      fetchPrograms();
    }
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/programs');
      const data = await response.json();
      
      if (data.success) {
        setPrograms(data.data);
        // Cache programs in sessionStorage
        sessionStorage.setItem('programs', JSON.stringify(data.data));
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

  const handleViewDetails = async (program) => {
    try {
      setOpeningProgram(program.shortCode);

      const response = await fetch(`http://localhost:5000/api/programs/${program.shortCode}`);
      const data = await response.json();

      navigate(`/programs/${program.shortCode}`, {
        state: { program: data.success ? data.data : program },
      });
    } catch (err) {
      console.error('Error loading program details before navigation:', err);
      navigate(`/programs/${program.shortCode}`, {
        state: { program },
      });
    } finally {
      setOpeningProgram(null);
    }
  };

  const handleAdminLogin = () => {
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading programs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
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
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="graduation-cap-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
              <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <div className="header-text">
            <h1 className="university-name">University of Moratuwa</h1>
            <p className="portal-subtitle">Postgraduate Management Information System</p>
          </div>
          <button type="button" className="admin-login-btn" onClick={handleAdminLogin}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b0000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Admin Login
          </button>
        </div>
      </header>

      <div className="content-area">
        <div className="programs-header">
          <h2 className="programs-title">Postgraduate Programs</h2>
          <p className="programs-subtitle">Explore our range of postgraduate programs and apply today</p>
        </div>

        <div className="programs-grid">
          {programs.map((program) => (
            <div key={program._id} className="program-card">
              <div className="card-header">
                  <div className="card-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                  </svg>
                </div>
                <h3 className="card-title">{program.title}</h3>
              </div>
              
              <p className="card-description">{program.description}</p>
              
              {program.specializations && program.specializations.length > 0 && (
                <div className="specializations">
                  <p className="specializations-label">Specializations:</p>
                  <div className="specialization-list">
                    {program.specializations.map((spec, index) => (
                      <span key={index} className="specialization-tag" style={{ color: '#6b7280' }}>{spec.name}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="card-info">
                <div className="info-item">
                  <span className="info-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </span>
                  <span className="info-text">Deadline:&nbsp; {program.deadline}</span>
                </div>
                <div className="info-item">
                  <span className="info-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </span>
                  <span className="info-text">{program.resourcesCount} Resources Available</span>
                </div>
              </div>
              
              <button 
                type="button"
                className="view-details-btn"
                disabled={openingProgram === program.shortCode}
                onClick={() => handleViewDetails(program)}
              >
                {openingProgram === program.shortCode ? 'Opening...' : 'View Details'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
