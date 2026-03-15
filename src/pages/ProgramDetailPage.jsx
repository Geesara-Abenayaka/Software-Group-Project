import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../styles/ProgramDetailPage.css';
import { generateCourseDetailsPDF, generateCallForApplicationPDF } from '../utils/pdfGenerator';

function ProgramDetailPage() {
  const { shortCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const hasCompleteProgramData = (programData) => {
    if (!programData) {
      return false;
    }

    return Boolean(
      programData.detailedDescription &&
      Array.isArray(programData.resources) &&
      programData.resources.length > 0 &&
      programData.deadlines &&
      programData.deadlines.application
    );
  };

  const initialProgram = location.state?.program?.shortCode === shortCode
    ? location.state.program
    : null;
  const [program, setProgram] = useState(initialProgram);
  const [loading, setLoading] = useState(!initialProgram);
  const [error, setError] = useState(null);

  useEffect(() => {
    const nextInitialProgram = location.state?.program?.shortCode === shortCode
      ? location.state.program
      : null;

    setProgram(nextInitialProgram);
    setLoading(!nextInitialProgram);
    setError(null);
    if (!hasCompleteProgramData(nextInitialProgram)) {
      fetchProgramDetails(nextInitialProgram);
    }
  }, [shortCode, location.state]);

  const fetchProgramDetails = async (prefetchedProgram = null) => {
    try {
      if (!prefetchedProgram) {
        setLoading(true);
      }

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
    navigate(-1);
  };

  const handleResourceClick = (resource) => {
    // Handle Online Application or form type resources
    if (resource.name === 'Online Application' || resource.type === 'form') {
      navigate('/apply', { state: { program: program.shortCode, programName: program.name } });
    } 
    // Handle Course Details PDF generation
    else if (resource.type === 'pdf' && resource.name.includes('Course Details')) {
      generateCourseDetailsPDF(program);
    }
    // Handle Call for Application PDF generation
    else if (resource.type === 'pdf' && resource.name.includes('Call for Application')) {
      generateCallForApplicationPDF(program);
    }
    // You can add more handlers for other resource types here
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
          <button type="button" onClick={handleBackToHome} className="back-btn">
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
          <button type="button" className="admin-login-btn" onClick={() => navigate('/login')}>
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
        <div className="detail-container">
          <button type="button" onClick={handleBackToHome} className="back-to-home-btn">
            <span className="back-arrow">←</span> Back to Home
          </button>

          <div className="detail-content">
            <h2 className="detail-title">{program.title}</h2>
            <div className="detail-title-divider"></div>
            
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
                    onClick={() => handleResourceClick(resource)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="resource-icon">
                      {resource.type === 'form' ? (
                        /* Grey clipboard icon for forms */
                        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                          <line x1="9" y1="12" x2="15" y2="12"/>
                          <line x1="9" y1="16" x2="13" y2="16"/>
                        </svg>
                      ) : (
                        /* Red document icon for PDFs */
                        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#c0392b" strokeWidth="1.5" fill="#fff"/>
                          <polyline points="14 2 14 8 20 8" stroke="#c0392b" strokeWidth="1.5" fill="none"/>
                          <rect x="4" y="2" width="10" height="6" rx="0" fill="#c0392b" stroke="none"/>
                          <path d="M14 2 L14 8 L20 8" stroke="#c0392b" strokeWidth="1.5" fill="none"/>
                          <line x1="8" y1="13" x2="16" y2="13" stroke="#c0392b" strokeWidth="1.5"/>
                          <line x1="8" y1="17" x2="14" y2="17" stroke="#c0392b" strokeWidth="1.5"/>
                        </svg>
                      )}
                    </div>
                    <div className="resource-content">
                      <h4 className="resource-name">{resource.name}</h4>
                      {resource.fileSize && (
                        <p className="resource-size">
                          {resource.type === 'pdf' ? `Download ${resource.fileSize}` : `${resource.type.toUpperCase()} (${resource.fileSize})`}
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
