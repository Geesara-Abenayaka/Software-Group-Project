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
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  
  const [formData, setFormData] = useState({
    nic: '',
    surname: '',
    otherNames: '',
    oaMarks: '',
    writingMarks: '',
    interviewMarks: '',
    applicationStatus: '',
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
  }, [navigate, selectedCourse]);

  const fetchApplications = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/applications');
      const result = await response.json();
      
      if (result.success) {
        // Transform data to match the expected format
        const transformedData = result.data
          .filter(app => !selectedCourse || app.program === selectedCourse)
          .map(app => {
            // Map database status to display status
            let displayStatus = app.status || 'Pending';
            if (displayStatus === 'pending') displayStatus = 'Pending';
            else if (displayStatus === 'approved') displayStatus = 'Approved';
            else if (displayStatus === 'rejected') displayStatus = 'Application Rejected';
            else if (displayStatus === 'under-review') displayStatus = 'Short Listed';
            
            // Format graduation date - check root field first, then qualifications array
            let gradDate = '-';
            if (app.graduationDate) {
              try {
                const date = new Date(app.graduationDate);
                if (!isNaN(date.getTime())) {
                  gradDate = date.toISOString().split('T')[0];
                } else {
                  gradDate = app.graduationDate;
                }
              } catch (e) {
                gradDate = app.graduationDate;
              }
            } else if (app.qualifications && app.qualifications.length > 0 && app.qualifications[0].graduationDate) {
              // Get graduation date from first qualification
              try {
                const date = new Date(app.qualifications[0].graduationDate);
                if (!isNaN(date.getTime())) {
                  gradDate = date.toISOString().split('T')[0];
                } else {
                  gradDate = app.qualifications[0].graduationDate;
                }
              } catch (e) {
                gradDate = app.qualifications[0].graduationDate;
              }
            }
            
            return {
              _id: app._id,
              program: app.program,
              status: displayStatus,
              nic: app.nicNo || '',
              surname: app.fullName ? app.fullName.split(' ')[app.fullName.split(' ').length - 1] : '',
              otherNames: app.nameWithInitials || app.fullName || '',
              oaMarks: app.oaMarks || '-',
              writingMarks: app.writingMarks || '-',
              interviewMarks: app.interviewMarks || '-',
              graduationDate: gradDate
            };
          });
        setApplications(transformedData);
      }
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
  };

  // Filter applications based on search text
  const filteredApplications = applications.filter(app => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      app.nic.toLowerCase().includes(search) ||
      app.surname.toLowerCase().includes(search) ||
      app.otherNames.toLowerCase().includes(search)
    );
  });

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-fill when NIC is entered
    if (name === 'nic' && value.length >= 9) {
      await fetchApplicationByNIC(value);
    }
  };

  const fetchApplicationByNIC = async (nic) => {
    try {
      const response = await fetch('http://localhost:5000/api/applications');
      const result = await response.json();
      
      if (result.success) {
        // Find application with matching NIC
        const application = result.data.find(app => app.nicNo === nic);
        
        if (application) {
          // Map database status to display status
          let displayStatus = application.status || 'Pending';
          // Convert lowercase statuses to display format
          if (displayStatus === 'pending') displayStatus = 'Pending';
          else if (displayStatus === 'approved') displayStatus = 'Approved';
          else if (displayStatus === 'rejected') displayStatus = 'Application Rejected';
          else if (displayStatus === 'under-review') displayStatus = 'Short Listed';
          
          // Format graduation date for date input (YYYY-MM-DD)
          // First check if there's a root-level graduationDate, otherwise check qualifications array
          let gradDate = '';
          if (application.graduationDate) {
            try {
              const date = new Date(application.graduationDate);
              if (!isNaN(date.getTime())) {
                gradDate = date.toISOString().split('T')[0];
              } else {
                gradDate = application.graduationDate;
              }
            } catch (e) {
              gradDate = application.graduationDate;
            }
          } else if (application.qualifications && application.qualifications.length > 0 && application.qualifications[0].graduationDate) {
            // Get graduation date from first qualification
            try {
              const date = new Date(application.qualifications[0].graduationDate);
              if (!isNaN(date.getTime())) {
                gradDate = date.toISOString().split('T')[0];
              } else {
                gradDate = application.qualifications[0].graduationDate;
              }
            } catch (e) {
              gradDate = application.qualifications[0].graduationDate;
            }
          }
          
          // Auto-fill the form with application data
          setFormData({
            nic: application.nicNo,
            surname: application.fullName ? application.fullName.split(' ')[application.fullName.split(' ').length - 1] : '',
            otherNames: application.nameWithInitials || application.fullName || '',
            oaMarks: application.oaMarks || '',
            writingMarks: application.writingMarks || '',
            interviewMarks: application.interviewMarks || '',
            applicationStatus: displayStatus,
            graduationDate: gradDate
          });
          
          // Set the selected application ID for updating
          setSelectedApplicationId(application._id);
          const index = applications.findIndex(app => app._id === application._id);
          setSelectedApplication(index);
        } else {
          // If no application found, clear other fields except NIC
          setFormData(prev => ({
            nic: prev.nic,
            surname: '',
            otherNames: '',
            oaMarks: '',
            writingMarks: '',
            interviewMarks: '',
            applicationStatus: '',
            graduationDate: ''
          }));
          setSelectedApplication(null);
          setSelectedApplicationId(null);
        }
      }
    } catch (error) {
      console.error('Error fetching application by NIC:', error);
    }
  };

  const handleStatusChange = (status) => {
    setFormData(prev => ({
      ...prev,
      applicationStatus: status
    }));
  };

  const handleDelete = async (appId, event) => {
    event.stopPropagation(); // Prevent row selection when clicking delete
    
    if (!window.confirm('Are you sure you want to delete this application?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/applications/${appId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh applications list
        await fetchApplications();
        
        // Clear selection if the deleted item was selected
        setSelectedApplication(null);
        setSelectedApplicationId(null);
        
        alert('Application deleted successfully!');
      } else {
        alert('Error deleting application: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Error deleting application. Please try again.');
    }
  };

  const handleSave = async () => {
    // Check if an application is selected by ID
    if (!selectedApplicationId) {
      alert('Please enter a valid NIC number of a submitted application');
      return;
    }

    // This now works the same as Update
    await handleUpdate();
  };

  const handleUpdate = async () => {
    if (!selectedApplicationId) {
      alert('Please select an application from the table to update');
      return;
    }

    try {
      // Update marks via API
      const response = await fetch(`http://localhost:5000/api/applications/${selectedApplicationId}/marks`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oaMarks: formData.oaMarks || '',
          writingMarks: formData.writingMarks || '',
          interviewMarks: formData.interviewMarks || '',
          status: formData.applicationStatus,
          graduationDate: formData.graduationDate || ''
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Refresh applications list
        await fetchApplications();
        setSelectedApplication(null);
        setSelectedApplicationId(null);

        // Clear the form
        setFormData({
          nic: '',
          surname: '',
          otherNames: '',
          oaMarks: '',
          writingMarks: '',
          interviewMarks: '',
          applicationStatus: '',
          graduationDate: ''
        });

        alert('Marks updated successfully!');
      } else {
        alert('Error updating marks: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating marks:', error);
      alert('Error updating marks. Please try again.');
    }
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
      <nav className="admin-navbar">
        <div className="navbar-content">
          <button className="navbar-btn" onClick={() => navigate('/admin/dashboard')}>
            <span className="nav-icon">📋</span>
            Programs
          </button>
          <button className="navbar-btn" onClick={() => navigate('/admin/applications')}>
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
          <button className="navbar-btn active">
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
        <main className="admin-main-full marks-main">
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="no-data">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app, index) => {
                    // Find the original index in applications array
                    const originalIndex = applications.findIndex(a => 
                      a.nic === app.nic && 
                      a.surname === app.surname && 
                      a.otherNames === app.otherNames
                    );
                    return (
                      <tr 
                        key={index}
                        onClick={() => {
                          setSelectedApplication(originalIndex);
                          setSelectedApplicationId(app._id);
                          
                          // Format graduation date for date input
                          let gradDate = '';
                          if (app.graduationDate && app.graduationDate !== '-') {
                            try {
                              const date = new Date(app.graduationDate);
                              if (!isNaN(date.getTime())) {
                                gradDate = date.toISOString().split('T')[0];
                              } else {
                                gradDate = app.graduationDate;
                              }
                            } catch (e) {
                              gradDate = app.graduationDate;
                            }
                          }
                          
                          setFormData({
                            nic: app.nic,
                            surname: app.surname,
                            otherNames: app.otherNames,
                            oaMarks: app.oaMarks === '-' ? '' : app.oaMarks,
                            writingMarks: app.writingMarks === '-' ? '' : app.writingMarks,
                            interviewMarks: app.interviewMarks === '-' ? '' : app.interviewMarks,
                            applicationStatus: app.status,
                            graduationDate: gradDate
                          });
                        }}
                        className={selectedApplication === originalIndex ? 'selected-row' : ''}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{app.status}</td>
                        <td>{app.nic}</td>
                        <td>{app.surname}</td>
                        <td>{app.otherNames}</td>
                        <td>{app.oaMarks}</td>
                        <td>{app.writingMarks}</td>
                        <td>{app.interviewMarks}</td>
                        <td>{app.graduationDate}</td>
                        <td>
                          <button 
                            className="delete-icon-btn"
                            onClick={(e) => handleDelete(app._id, e)}
                            title="Delete application"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="table-footer-simple">
              Showing {filteredApplications.length > 0 ? 1 : 0} to {filteredApplications.length} of {applications.length} entries
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
                  placeholder="Enter NIC to auto-fill application details"
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
                  readOnly
                  className="readonly-field"
                  placeholder="Auto-filled from application"
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
                  readOnly
                  className="readonly-field"
                  placeholder="Auto-filled from application"
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
                Save Marks
              </button>
              <button className="update-btn" onClick={handleUpdate}>
                Update
              </button>
              <button 
                className="clear-btn" 
                onClick={() => {
                  setFormData({
                    nic: '',
                    surname: '',
                    otherNames: '',
                    oaMarks: '',
                    writingMarks: '',
                    interviewMarks: '',
                    applicationStatus: '',
                    graduationDate: ''
                  });
                  setSelectedApplication(null);
                  setSelectedApplicationId(null);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default MarksPage;
