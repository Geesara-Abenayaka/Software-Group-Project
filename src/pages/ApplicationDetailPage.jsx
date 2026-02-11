import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/ApplicationDetailPage.css';

function ApplicationDetailPage() {
  const navigate = useNavigate();
  const { programId } = useParams();
  const [user, setUser] = useState(null);
  const [program, setProgram] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    category: 'All',
    status: 'All'
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
    fetchProgramAndApplications();
  }, [navigate, programId]);

  const fetchProgramAndApplications = async () => {
    try {
      setLoading(true);
      // Fetch program details
      const programResponse = await fetch(`http://localhost:5000/api/programs/${programId}`);
      const programData = await programResponse.json();
      
      if (programData.success) {
        setProgram(programData.data);
      }

      // Fetch applications for this program
      const applicationsResponse = await fetch(`http://localhost:5000/api/applications/program/${programId}`);
      const applicationsData = await applicationsResponse.json();
      
      if (applicationsData.success) {
        // Transform the data to match the expected format
        const transformedApplications = applicationsData.data.map((app, index) => ({
          id: app._id,
          nic: app.nicNo,
          fullName: app.fullName,
          nameWithInitials: app.nameWithInitials,
          category: app.program === 'msc-cs' ? 'Category 1' : 
                   app.program === 'msc-ai' ? 'Category 2' : 'Category 3',
          status: app.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          email: app.email,
          mobile: app.mobile,
          submittedAt: new Date(app.submittedAt).toLocaleDateString()
        }));
        
        setApplications(transformedApplications);
        setFilteredApplications(transformedApplications);
      } else {
        // If no applications found, set empty array
        setApplications([]);
        setFilteredApplications([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setApplications([]);
      setFilteredApplications([]);
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    applyFilters(value, filters);
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    applyFilters(searchText, newFilters);
  };

  const applyFilters = (search, currentFilters) => {
    let filtered = [...applications];

    if (search) {
      filtered = filtered.filter(app =>
        app.fullName.toLowerCase().includes(search.toLowerCase()) ||
        app.nic.includes(search) ||
        app.id.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (currentFilters.category !== 'All') {
      filtered = filtered.filter(app => app.category === currentFilters.category);
    }

    if (currentFilters.status !== 'All') {
      filtered = filtered.filter(app => app.status === currentFilters.status);
    }

    setFilteredApplications(filtered);
  };

  const getStatusCounts = () => {
    return {
      total: applications.length,
      approved: applications.filter(app => app.status === 'Approved').length,
      pending: applications.filter(app => app.status === 'Pending' || app.status === 'Under Review').length,
      rejected: applications.filter(app => app.status === 'Rejected').length,
      underReview: applications.filter(app => app.status === 'Under Review').length
    };
  };

  const handleExport = () => {
    alert('Exporting applications data...');
  };

  const handleSendBulkEmail = () => {
    alert('Opening bulk email composer...');
  };

  const handleUpdateStatus = async (applicationId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (result.success) {
        // Refresh the applications list
        fetchProgramAndApplications();
        const statusMessage = newStatus === 'approved' ? 'approved' : 
                            newStatus === 'rejected' ? 'rejected' : 
                            newStatus === 'under-review' ? 'marked as under review' : 'updated';
        alert(`Application ${statusMessage} successfully!`);
      } else {
        alert('Failed to update application status: ' + result.message);
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      alert('Error updating application status. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="admin-app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading applications...</p>
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

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
          <button className="navbar-btn active" onClick={() => navigate('/admin/applications')}>
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
        <main className="admin-main-full detail-main">
          <div className="detail-header">
            <button className="back-btn" onClick={() => navigate('/admin/applications')}>
              ← 
            </button>
            <div className="detail-title-section">
              <h2 className="detail-title">{program?.title || 'Program'}</h2>
              <p className="detail-subtitle">Application Management</p>
            </div>
            <div className="user-icon-header">
              <span>👤</span>
            </div>
          </div>

          <div className="stats-cards-detail">
            <div className="stat-card-detail">
              <span className="stat-label-detail">Total Applications</span>
              <span className="stat-value-detail">{statusCounts.total}</span>
            </div>

            <div className="stat-card-detail approved-card">
              <span className="stat-label-detail">Approved</span>
              <span className="stat-value-detail">{statusCounts.approved}</span>
            </div>

            <div className="stat-card-detail pending-card">
              <span className="stat-label-detail">Pending/Under Review</span>
              <span className="stat-value-detail">{statusCounts.pending}</span>
            </div>

            <div className="stat-card-detail rejected-card">
              <span className="stat-label-detail">Rejected</span>
              <span className="stat-value-detail">{statusCounts.rejected}</span>
            </div>
          </div>

          <div className="search-filter-bar">
            <input
              type="text"
              className="search-input-detail"
              placeholder="Search by name, NIC, or application ID..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <select
              className="filter-select"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option>All</option>
              <option>Category 1</option>
              <option>Category 2</option>
              <option>Category 3</option>
            </select>
            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option>All</option>
              <option>Pending</option>
              <option>Under Review</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
            <button className="export-btn-detail" onClick={handleExport}>
              <span>📥</span>
              Export
            </button>
          </div>

          <div className="applications-table-detail">
            <table>
              <thead>
                <tr>
                  <th>Application<br/>ID</th>
                  <th>NIC Number</th>
                  <th>Full Name</th>
                  <th>Name with Initials</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      No applications found
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id}>
                      <td className="app-id-cell">{app.id.substring(0, 8)}</td>
                      <td>{app.nic}</td>
                      <td>{app.fullName}</td>
                      <td>{app.nameWithInitials}</td>
                      <td>
                        <span className="category-badge">{app.category}</span>
                      </td>
                      <td>
                        <span className={`status-badge-detail status-${app.status.toLowerCase().replace(' ', '-')}`}>
                          {app.status === 'Approved' && '✓ '}
                          {app.status === 'Rejected' && '✕ '}
                          {app.status === 'Pending' && '○ '}
                          {app.status === 'Under Review' && '◷ '}
                          {app.status}
                        </span>
                      </td>
                      <td>
                        <select
                          className="status-select"
                          value={
                            app.status === 'Pending' ? 'pending' :
                            app.status === 'Under Review' ? 'under-review' :
                            app.status === 'Approved' ? 'approved' :
                            app.status === 'Rejected' ? 'rejected' : 'pending'
                          }
                          onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="under-review">Under Review</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <button className="bulk-email-btn" onClick={handleSendBulkEmail}>
            Send Bulk Email
          </button>
        </main>
      </div>
    </div>
  );
}

export default ApplicationDetailPage;
