import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SearchApplicationsPage.css';

function SearchApplicationsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState({
    program: 'All Programs',
    category: 'All Categories',
    status: 'All Status',
    fromDate: '',
    toDate: ''
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
      setLoading(true);
      // Mock data for demonstration
      const mockApplications = [
        {
          id: 'APP001',
          program: 'MBA in Information Technology',
          fullName: 'Kasun Perera Bandara',
          nameWithInitials: 'K.P. Bandara',
          nic: '199512345678',
          telephone: '0112345678',
          status: 'Pending',
          submittedDate: '2026-01-15'
        }
      ];
      setApplications(mockApplications);
      setFilteredApplications(mockApplications);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setLoading(false);
    }
  };

  const handleSearch = () => {
    let filtered = [...applications];

    if (searchText) {
      filtered = filtered.filter(app =>
        app.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
        app.nic.includes(searchText) ||
        app.id.toLowerCase().includes(searchText.toLowerCase()) ||
        app.telephone.includes(searchText)
      );
    }

    if (filters.program !== 'All Programs') {
      filtered = filtered.filter(app => app.program === filters.program);
    }

    if (filters.status !== 'All Status') {
      filtered = filtered.filter(app => app.status === filters.status);
    }

    if (filters.fromDate) {
      filtered = filtered.filter(app => new Date(app.submittedDate) >= new Date(filters.fromDate));
    }

    if (filters.toDate) {
      filtered = filtered.filter(app => new Date(app.submittedDate) <= new Date(filters.toDate));
    }

    setFilteredApplications(filtered);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getStatusCounts = () => {
    return {
      total: applications.length,
      pending: applications.filter(app => app.status === 'Pending').length,
      approved: applications.filter(app => app.status === 'Approved').length,
      rejected: applications.filter(app => app.status === 'Rejected').length
    };
  };

  const statusCounts = getStatusCounts();

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
          <button className="navbar-btn active">
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
        <main className="admin-main-full">
          <div className="search-header">
            <h2 className="search-title">Search Applications</h2>
            <p className="search-subtitle">View and manage all postgraduate applications across programs</p>
          </div>

          <div className="search-container">
            <div className="search-input-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, NIC, application ID, email, or phone..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="search-btn" onClick={handleSearch}>
                Search
              </button>
            </div>

            <div className="filters-row">
              <div className="filter-group">
                <label>PROGRAM/COURSE</label>
                <select
                  value={filters.program}
                  onChange={(e) => setFilters({ ...filters, program: e.target.value })}
                >
                  <option>All Programs</option>
                  <option>MBA in Information Technology</option>
                  <option>MBA in eGovernance</option>
                  <option>Mathematics Phd</option>
                </select>
              </div>

              <div className="filter-group">
                <label>CATEGORY</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option>All Categories</option>
                </select>
              </div>

              <div className="filter-group">
                <label>STATUS</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option>All Status</option>
                  <option>Pending</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
              </div>

              <div className="filter-group">
                <label>FROM DATE</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                />
              </div>

              <div className="filter-group">
                <label>TO DATE</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                />
              </div>

              <button className="export-btn">
                <span>📥</span>
                Export All
              </button>
            </div>
          </div>

          <div className="stats-cards">
            <div className="stat-card">
              <span className="stat-icon">📄</span>
              <div className="stat-info">
                <span className="stat-label">Total Applications</span>
                <span className="stat-value">{statusCounts.total}</span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-icon pending-icon">⏳</span>
              <div className="stat-info">
                <span className="stat-label">Pending</span>
                <span className="stat-value">{statusCounts.pending}</span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-icon approved-icon">✓</span>
              <div className="stat-info">
                <span className="stat-label">Approved</span>
                <span className="stat-value">{statusCounts.approved}</span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-icon rejected-icon">✕</span>
              <div className="stat-info">
                <span className="stat-label">Rejected</span>
                <span className="stat-value">{statusCounts.rejected}</span>
              </div>
            </div>
          </div>

          <div className="applications-table-container">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>
                    Application<br/>ID
                    <span className="sort-icon">⇅</span>
                  </th>
                  <th>
                    Program/Course
                    <span className="sort-icon">⇅</span>
                  </th>
                  <th>
                    Status
                    <span className="sort-icon">⇅</span>
                  </th>
                  <th>
                    Full Name
                    <span className="sort-icon">⇅</span>
                  </th>
                  <th>Name with Initials</th>
                  <th>NIC</th>
                  <th>Telephone</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr key={app.id}>
                    <td className="app-id">{app.id}</td>
                    <td>{app.program}</td>
                    <td>
                      <span className={`status-badge status-${app.status.toLowerCase()}`}>
                        {app.status}
                      </span>
                    </td>
                    <td>{app.fullName}</td>
                    <td>{app.nameWithInitials}</td>
                    <td>{app.nic}</td>
                    <td>{app.telephone}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="table-footer">
              <div className="table-info">
                Showing 1-5 of {filteredApplications.length} applications
              </div>
              <div className="pagination">
                <span className="page-info">Results per page:</span>
                <select className="page-select">
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
                <button className="page-btn">Previous</button>
                <button className="page-btn active">1</button>
                <button className="page-btn">2</button>
                <button className="page-btn">3</button>
                <span>...</span>
                <button className="page-btn">15</button>
                <button className="page-btn">Next</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default SearchApplicationsPage;
