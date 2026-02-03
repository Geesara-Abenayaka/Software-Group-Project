import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/MarksPage.css';

function MarksPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('MBA-IT');
  const [searchText, setSearchText] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  
  const [formData, setFormData] = useState({
    nic: '',
    surname: '',
    otherNames: '',
    oaMarks: '',
    writingMarks: '',
    interviewMarks: '',
    applicationStatus: 'Pending',
    graduationDate: ''
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
    fetchApplications();
  }, [navigate]);

  const fetchApplications = async () => {
    try {
      // Mock data - replace with actual API call
      setApplications([]);
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleSearch = (e) => {
    setSearchText(e.target.value);
    // Implement search logic
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStatusChange = (status) => {
    setFormData(prev => ({
      ...prev,
      applicationStatus: status
    }));
  };

  const handleSave = () => {
    console.log('Saving marks:', formData);
    // Implement save logic
    alert('Marks saved successfully!');
  };

  const handleUpdate = () => {
    console.log('Updating marks:', formData);
    // Implement update logic
    alert('Marks updated successfully!');
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
          <button className="nav-btn" onClick={() => navigate('/admin/download')}>
            <span className="nav-icon">📥</span>
            Download
          </button>
          <button className="nav-btn nav-btn-active">
            <span className="nav-icon">🏷️</span>
            Marks
          </button>
          <button className="nav-btn" onClick={() => navigate('/admin/settings')}>
            <span className="nav-icon">⚙️</span>
            Settings
          </button>
        </div>

        <main className="admin-main marks-main">
          <div className="marks-controls">
            <div className="search-wrapper">
              <input
                type="text"
                className="marks-search"
                placeholder="Search by NIC, Name, or Application ID..."
                value={searchText}
                onChange={handleSearch}
              />
            </div>

            <div className="course-selector">
              <label>Course:</label>
              <select 
                value={selectedCourse} 
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="course-dropdown"
              >
                <option value="MBA-IT">MBA-IT</option>
                <option value="MBA-eGov">MBA-eGov</option>
                <option value="MBA-DS">MBA-DS</option>
                <option value="MasterCS">MasterCS</option>
                <option value="MasterDSAI">MasterDSAI</option>
              </select>
            </div>
          </div>

          <div className="marks-table-container">
            <table className="marks-table">
              <thead>
                <tr>
                  <th>Application Status</th>
                  <th>NIC</th>
                  <th>Surname</th>
                  <th>Other Names</th>
                  <th>O/A Marks</th>
                  <th>Writing Marks</th>
                  <th>Interview Marks</th>
                  <th>Graduation Date</th>
                </tr>
              </thead>
              <tbody>
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  applications.map((app, index) => (
                    <tr key={index}>
                      <td>{app.status}</td>
                      <td>{app.nic}</td>
                      <td>{app.surname}</td>
                      <td>{app.otherNames}</td>
                      <td>{app.oaMarks}</td>
                      <td>{app.writingMarks}</td>
                      <td>{app.interviewMarks}</td>
                      <td>{app.graduationDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="table-footer-simple">
              Showing 0 to 0 of 0 entries
              <div className="pagination-simple">
                <button className="nav-arrow">‹</button>
                <button className="nav-arrow">›</button>
              </div>
            </div>
          </div>

          <div className="marks-form-container">
            <div className="marks-form-row">
              <div className="form-field">
                <label>NIC</label>
                <input
                  type="text"
                  name="nic"
                  value={formData.nic}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-field">
                <label>O/A Marks</label>
                <input
                  type="text"
                  name="oaMarks"
                  value={formData.oaMarks}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="marks-form-row">
              <div className="form-field">
                <label>Surname</label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-field">
                <label>Writing Marks</label>
                <input
                  type="text"
                  name="writingMarks"
                  value={formData.writingMarks}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="marks-form-row">
              <div className="form-field">
                <label>Other Names</label>
                <input
                  type="text"
                  name="otherNames"
                  value={formData.otherNames}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-field">
                <label>Interview Marks</label>
                <input
                  type="text"
                  name="interviewMarks"
                  value={formData.interviewMarks}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="marks-form-row">
              <div className="form-field full-width">
                <label>Application status:</label>
                <div className="status-buttons">
                  <button
                    className={`status-btn ${formData.applicationStatus === 'Pending' ? 'active' : ''}`}
                    onClick={() => handleStatusChange('Pending')}
                  >
                    ✓ Pending
                  </button>
                  <button
                    className={`status-btn ${formData.applicationStatus === 'Approved' ? 'active' : ''}`}
                    onClick={() => handleStatusChange('Approved')}
                  >
                    ✓ Approved
                  </button>
                  <button
                    className={`status-btn ${formData.applicationStatus === 'Application Rejected' ? 'active' : ''}`}
                    onClick={() => handleStatusChange('Application Rejected')}
                  >
                    ✓ Application Rejected
                  </button>
                  <button
                    className={`status-btn ${formData.applicationStatus === 'Short Listed' ? 'active' : ''}`}
                    onClick={() => handleStatusChange('Short Listed')}
                  >
                    ✓ Short Listed
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label>Graduation Date</label>
                <input
                  type="date"
                  name="graduationDate"
                  value={formData.graduationDate}
                  onChange={handleInputChange}
                  placeholder="Please select a date..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="save-btn" onClick={handleSave}>
                Save
              </button>
              <button className="update-btn" onClick={handleUpdate}>
                Update
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default MarksPage;
