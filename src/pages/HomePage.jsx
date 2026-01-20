import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

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

  const handleViewDetails = (shortCode) => {
    navigate(`/programs/${shortCode}`);
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
          <div className="graduation-cap-icon">🎓</div>
          <div className="header-text">
            <h1 className="university-name">University of Moratuwa</h1>
            <p className="portal-subtitle">Postgraduate Management Information System</p>
          </div>
          <button className="admin-login-btn" onClick={handleAdminLogin}>
            <span className="login-icon">👤</span>
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
                <div className="card-icon">🎓</div>
                <h3 className="card-title">{program.title}</h3>
              </div>
              
              <p className="card-description">{program.description}</p>
              
              {program.specializations && program.specializations.length > 0 && (
                <div className="specializations">
                  <p className="specializations-label">Specializations:</p>
                  {program.specializations.map((spec, index) => (
                    <span key={index} className="specialization-tag">{spec.name}</span>
                  ))}
                </div>
              )}
              
              <div className="card-info">
                <div className="info-item">
                  <span className="info-icon">📅</span>
                  <span className="info-text">Deadline: {program.deadline}</span>
                </div>
                <div className="info-item">
                  <span className="info-icon">📚</span>
                  <span className="info-text">{program.resourcesCount} Resources Available</span>
                </div>
              </div>
              
              <button 
                className="view-details-btn"
                onClick={() => handleViewDetails(program.shortCode)}
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
