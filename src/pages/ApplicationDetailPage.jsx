import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GraduationCap, Search, Download, BarChart2, Settings, LogOut, User } from 'lucide-react';
import '../styles/AdminDashboard.css';
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
  }, [programId]);  // eslint-disable-line react-hooks/exhaustive-deps

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
          displayId: `APP${String(index + 1).padStart(3, '0')}`,
          nic: app.nicNo,
          fullName: app.fullName,
          nameWithInitials: app.nameWithInitials,
          category: app.category ||
                   (app.program === 'msc-cs' ? 'Category 1' :
                    app.program === 'msc-ai' ? 'Category 2' : 'Category 3'),
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
      alert('Error updating application status');
    }
  };

  const handleDeleteApplication = async (applicationId, fullName) => {
    const confirmed = window.confirm(`Are you sure you want to delete the application for ${fullName}? This action cannot be undone.`);
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/applications/${applicationId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        alert('Application deleted successfully!');
        // Refresh the applications list
        fetchProgramAndApplications();
      } else {
        alert('Failed to delete application: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Error deleting application');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const statusCounts = getStatusCounts();

  const getCatClass = (cat) => {
    if (cat === 'Category 1') return 'cat-1';
    if (cat === 'Category 2') return 'cat-2';
    return 'cat-3';
  };

  const getStatusClass = (status) => {
    if (status === 'Approved') return 'status-approved';
    if (status === 'Rejected') return 'status-rejected';
    if (status === 'Under Review') return 'status-under-review';
    return 'status-pending';
  };

  const getStatusIcon = (status) => {
    if (status === 'Approved') return '✓';
    if (status === 'Rejected') return '✕';
    return '⏱';
  };

  return (
    <div className="admin-app">
      {/* ── Header ── */}
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

      {/* ── Navbar ── */}
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

      {/* ── Page content ── */}
      <div className="admin-content-full">
        <div className="detail-page-wrap">

          {/* Top bar: back + title + avatar */}
          <div className="detail-topbar">
            <button className="detail-back-btn" onClick={() => navigate('/admin/applications')}>
              ←
            </button>
            <div className="detail-topbar-text">
              <h2 className="detail-topbar-title">{program?.title || 'Program'}</h2>
              <p className="detail-topbar-sub">Application Management</p>
            </div>
            <div className="detail-topbar-avatar">
              <User size={20} color="#8b0000" />
            </div>
          </div>

          {/* Stats cards */}
          <div className="detail-stats-row">
            <div className="detail-stat-card">
              <span className="detail-stat-label">Total Applications</span>
              <span className="detail-stat-value stat-total">{statusCounts.total}</span>
            </div>
            <div className="detail-stat-card">
              <span className="detail-stat-label">Approved</span>
              <span className="detail-stat-value stat-approved">{statusCounts.approved}</span>
            </div>
            <div className="detail-stat-card">
              <span className="detail-stat-label">Pending</span>
              <span className="detail-stat-value stat-pending">{statusCounts.pending}</span>
            </div>
            <div className="detail-stat-card">
              <span className="detail-stat-label">Rejected</span>
              <span className="detail-stat-value stat-rejected">{statusCounts.rejected}</span>
            </div>
          </div>

          {/* Filter bar */}
          <div className="detail-filter-bar">
            <input
              type="text"
              className="detail-search-input"
              placeholder="Search by name, NIC, or application ID..."
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <select
              className="detail-filter-select"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option>All</option>
              <option>Category 1</option>
              <option>Category 2</option>
              <option>Category 3</option>
            </select>
            <select
              className="detail-filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option>All</option>
              <option>Pending</option>
              <option>Under Review</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
            <button className="detail-export-btn" onClick={handleExport}>
              <Download size={15} style={{ marginRight: '0.4rem' }} />
              Export
            </button>
          </div>

          {/* Table */}
          <div className="detail-table-wrap">
            <table className="detail-table">
              <thead>
                <tr>
                  <th>Application<br />ID</th>
                  <th>NIC Number</th>
                  <th>Full Name</th>
                  <th>Name with Initials</th>
                  <th>Category</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="no-apps-msg">
                      <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-apps-msg">No applications found</td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <a
                          href="#"
                          className="detail-app-id-link"
                          onClick={(e) => { e.preventDefault(); navigate(`/admin/application/${app.id}`); }}
                        >
                          {app.displayId}
                        </a>
                      </td>
                      <td style={{ color: '#9ca3af' }}>{app.nic}</td>
                      <td>{app.fullName}</td>
                      <td>{app.nameWithInitials}</td>
                      <td>
                        <span className={`detail-cat-badge ${getCatClass(app.category)}`}>
                          {app.category}
                        </span>
                      </td>
                      <td>
                        <span className={`detail-status-pill ${getStatusClass(app.status)}`}>
                          {getStatusIcon(app.status)} {app.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Bulk email */}
          <div className="detail-bulk-row">
            <button className="detail-bulk-btn" onClick={handleSendBulkEmail}>
              Send Bulk Email
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default ApplicationDetailPage;
