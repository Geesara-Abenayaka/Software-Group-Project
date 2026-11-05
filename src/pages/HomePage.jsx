import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import API_BASE_URL from '../utils/apiConfig';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

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
    // Show cached programs straight away, but always refresh them so programs
    // added or changed in the admin panel appear without opening a new tab.
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      // Only show the spinner when there is nothing cached to show yet
      if (!cachedPrograms) {
        setLoading(true);
      }
      const response = await fetch(`${API_BASE_URL}/programs`);
      const data = await response.json();

      if (data.success) {
        setPrograms(data.data);
        // Cache programs in sessionStorage
        sessionStorage.setItem('programs', JSON.stringify(data.data));
      } else if (!cachedPrograms) {
        setError('Failed to load programs');
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
      if (!cachedPrograms) {
        setError('Failed to connect to server');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (program) => {
    try {
      setOpeningProgram(program.shortCode);

      const response = await fetch(`${API_BASE_URL}/programs/${program.shortCode}`);
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
      <SiteHeader showAdminLogin />

      <main className="content-area" id="main" tabIndex={-1}>
        <div className="programs-header">
          <h1 className="programs-title">Postgraduate Programs</h1>
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
      </main>
      <SiteFooter />
    </div>
  );
}

export default HomePage;
