import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DownloadFormsPage.css';

function DownloadFormsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [documentType, setDocumentType] = useState('All');
  const [selectedFields, setSelectedFields] = useState([
    'Surname', 'Year', 'NIC', 'Telephone', 'Address'
  ]);

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

  const programs = ['MBA-IT', 'MBA-eGov', 'MBA-DS', 'MasterCS', 'MasterDSAI'];

  const dataFields = [
    { label: 'Surname', checked: true },
    { label: 'Other Names', checked: false },
    { label: 'Telephone', checked: true },
    { label: 'Address', checked: true },
    { label: 'Year Awarded[1]', checked: false },
    { label: 'University[2]', checked: false },
    { label: 'Professional Org[1]', checked: false },
    { label: 'Member Category[2]', checked: false },
    { label: 'From Year[1]', checked: false },
    { label: 'To Year[2]', checked: false },
    { label: 'Year', checked: true },
    { label: 'University[1]', checked: false },
    { label: 'Degree[2]', checked: false },
    { label: 'Member Year[2]', checked: false },
    { label: 'To Year[1]', checked: false },
    { label: 'Company[3]', checked: false },
    { label: 'NIC', checked: true },
    { label: 'Degree[1]', checked: false },
    { label: 'Duration[2]', checked: false },
    { label: 'Year Awarded[2]', checked: false },
    { label: 'Company[1]', checked: false },
    { label: 'Position[3]', checked: false },
    { label: 'MOBILE', checked: false },
    { label: 'Duration[1]', checked: false },
    { label: 'Year Awarded[2]', checked: false },
    { label: 'Professional Org[2]', checked: false },
    { label: 'Position[1]', checked: false },
    { label: 'From Year[3]', checked: false },
    { label: 'Member Year[1]', checked: false },
    { label: 'Member Category[1]', checked: false },
    { label: 'Company[2]', checked: false },
    { label: 'Position[2]', checked: false },
    { label: 'From Year[2]', checked: false },
    { label: 'To Year[3]', checked: false }
  ];

  const handleProgramToggle = (program) => {
    if (selectedPrograms.includes(program)) {
      setSelectedPrograms(selectedPrograms.filter(p => p !== program));
    } else {
      setSelectedPrograms([...selectedPrograms, program]);
    }
  };

  const handleFieldToggle = (field) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const handleSelectAll = () => {
    setSelectedFields(dataFields.map(field => field.label));
  };

  const handleDeselectAll = () => {
    setSelectedFields([]);
  };

  const handleDownloadList = () => {
    alert('Downloading application data...');
  };

  const handleDownloadApproved = () => {
    alert('Downloading approved candidates file...');
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

      <div className="admin-content">
        <div className="admin-nav">
          <button className="nav-btn" onClick={() => navigate('/admin/dashboard')}>
            <span className="nav-icon">📋</span>
            Applications
          </button>
          <button className="nav-btn" onClick={() => navigate('/admin/search')}>
            <span className="nav-icon">🔍</span>
            Search
          </button>
          <button className="nav-btn nav-btn-active">
            <span className="nav-icon">📥</span>
            Download
          </button>
          <button className="nav-btn" onClick={() => navigate('/admin/marks')}>
            <span className="nav-icon">🏷️</span>
            Marks
          </button>
          <button className="nav-btn" onClick={() => navigate('/admin/settings')}>
            <span className="nav-icon">⚙️</span>
            Settings
          </button>
        </div>

        <main className="admin-main">
          <div className="download-header">
            <h2 className="download-title">Download Forms</h2>
            <p className="download-subtitle">Download application forms, templates, and applicant data</p>
          </div>

          <div className="download-section">
            <h3 className="section-title">Download Forms</h3>

            <div className="form-group">
              <label className="group-label">Application Forms</label>
              <div className="checkbox-group">
                {programs.map((program) => (
                  <label key={program} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedPrograms.includes(program)}
                      onChange={() => handleProgramToggle(program)}
                    />
                    <span>{program}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="group-label">Document Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="All"
                    checked={documentType === 'All'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>All</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="Application Accepted"
                    checked={documentType === 'Application Accepted'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>Application Accepted</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="Application Rejected"
                    checked={documentType === 'Application Rejected'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>Application Rejected</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="Application Pending"
                    checked={documentType === 'Application Pending'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>Application Pending</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="Accepted"
                    checked={documentType === 'Accepted'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>Accepted</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="Rejected"
                    checked={documentType === 'Rejected'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>Rejected</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="Final Listed"
                    checked={documentType === 'Final Listed'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>Final Listed</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <div className="group-header">
                <label className="group-label">Download Data Fields</label>
                <div className="select-actions">
                  <button className="select-link" onClick={handleSelectAll}>Select All</button>
                  <button className="select-link" onClick={handleDeselectAll}>Deselect All</button>
                </div>
              </div>
              <div className="fields-grid">
                {dataFields.map((field, index) => (
                  <label key={index} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.label)}
                      onChange={() => handleFieldToggle(field.label)}
                    />
                    <span>{field.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="download-list-btn" onClick={handleDownloadList}>
              <span className="btn-icon">📥</span>
              Download List
            </button>
          </div>

          <div className="download-section approved-section">
            <h3 className="section-title">Download Approved Candidates File</h3>
            <p className="section-description">Export a list of all approved applicants across all programs</p>
            <button className="download-list-btn" onClick={handleDownloadApproved}>
              <span className="btn-icon">📥</span>
              Download List
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DownloadFormsPage;
