import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../styles/ProgramDetailPage.css';

function ProgramDetailPage() {
  const { shortCode } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProgramDetails();
  }, [shortCode]);

  const fetchProgramDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/programs/${shortCode}`);
      const data = await response.json();
      
      if (data.success) {
        setProgram(data.data);
      } else {
        setError('Program not found');
      }
    } catch (err) {
      console.error('Error fetching program details:', err);
      setError('Failed to load program details');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading program details...</p>
        </div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="app">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error || 'Program not found'}</p>
          <button onClick={handleBackToHome} className="back-btn">
            Back to Home
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
          <button className="admin-login-btn" onClick={() => navigate('/login')}>
            <span className="login-icon">👤</span>
            Admin Login
          </button>
        </div>
      </header>

      <div className="content-area">
        <div className="detail-container">
          <button onClick={handleBackToHome} className="back-to-home-btn">
            <span className="back-arrow">←</span> Back to Home
          </button>

          <div className="detail-content">
            <h2 className="detail-title">{program.title}</h2>
            
            <p className="detail-description">{program.detailedDescription || program.description}</p>

            {program.specializations && program.specializations.length > 0 && (
              <div className="detail-section">
                <h3 className="section-title">Available specializations include :</h3>
                <ul className="specializations-list">
                  {program.specializations.map((spec, index) => (
                    <li key={index}>{spec.name}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="detail-section">
              <h3 className="section-title">Deadlines</h3>
              <ul className="deadlines-list">
                {program.deadlines && program.deadlines.application && (
                  <li>Application {program.deadlines.application}</li>
                )}
                {program.deadlines && program.deadlines.selectionExams && (
                  <li>{program.deadlines.selectionExams}</li>
                )}
              </ul>
            </div>

            <div className="detail-section">
              <h3 className="section-title">Resources</h3>
              <div className="resources-grid">
                {program.resources && program.resources.map((resource, index) => (
                  <div 
                    key={index} 
                    className="resource-card"
                    onClick={() => {
                      if (resource.name === 'Online Application' || resource.type === 'form') {
                        navigate('/apply', { state: { program: program.shortCode, programName: program.name } });
                      }
                    }}
                    style={{ cursor: resource.name === 'Online Application' || resource.type === 'form' ? 'pointer' : 'default' }}
                  >
                    <div className="resource-icon">
                      {resource.type === 'pdf' ? '📄' : 
                       resource.type === 'doc' ? '📝' : 
                       resource.type === 'form' ? '📋' : '🔗'}
                    </div>
                    <div className="resource-content">
                      <h4 className="resource-name">{resource.name}</h4>
                      {resource.fileSize && (
                        <p className="resource-size">
                          {resource.type.toUpperCase()} ({resource.fileSize})
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgramDetailPage;
