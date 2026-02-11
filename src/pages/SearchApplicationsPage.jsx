import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SearchApplicationsPage.css';

function SearchApplicationsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeSearchText, setActiveSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
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
    fetchPrograms();
    fetchApplications();
  }, [navigate]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.search-input-wrapper')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSearch = useCallback(() => {
    let filtered = [...applications];

    if (activeSearchText && activeSearchText.trim()) {
      const searchLower = activeSearchText.toLowerCase().trim();
      
      filtered = filtered.filter(app => {
        const matchFullName = app.fullName && app.fullName.toLowerCase().includes(searchLower);
        const matchInitials = app.nameWithInitials && app.nameWithInitials.toLowerCase().includes(searchLower);
        const matchNic = app.nicNo && app.nicNo.toLowerCase().includes(searchLower);
        const matchId = app._id && app._id.toLowerCase().includes(searchLower);
        const matchTelephone = app.telephone && app.telephone.includes(activeSearchText.trim());
        const matchMobile = app.mobile && app.mobile.includes(activeSearchText.trim());
        const matchEmail = app.email && app.email.toLowerCase().includes(searchLower);
        
        // Add program/course search
        const program = programs.find(p => p.shortCode === app.program);
        const matchProgramName = program && program.title.toLowerCase().includes(searchLower);
        const matchProgramCode = app.program && app.program.toLowerCase().includes(searchLower);
        
        return matchFullName || matchInitials || matchNic || matchId || matchTelephone || matchMobile || matchEmail || matchProgramName || matchProgramCode;
      });
    }

    if (filters.program !== 'All Programs') {
      filtered = filtered.filter(app => app.program === filters.program);
    }

    if (filters.status !== 'All Status') {
      const statusLower = filters.status.toLowerCase();
      filtered = filtered.filter(app => app.status.toLowerCase() === statusLower);
    }

    if (filters.fromDate) {
      filtered = filtered.filter(app => new Date(app.createdAt) >= new Date(filters.fromDate));
    }

    if (filters.toDate) {
      filtered = filtered.filter(app => new Date(app.createdAt) <= new Date(filters.toDate));
    }

    setFilteredApplications(filtered);
  }, [applications, activeSearchText, filters]);

  useEffect(() => {
    handleSearch();
  }, [filters, applications, activeSearchText, handleSearch]);

  const handleSearchButtonClick = () => {
    setActiveSearchText(searchText);
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    setShowSuggestions(value.length > 0);
    
    // If search bar is cleared, reset to show all applications
    if (value.trim() === '') {
      setActiveSearchText('');
    }
  };

  const handleSuggestionClick = (programTitle) => {
    setSearchText(programTitle);
    setShowSuggestions(false);
  };

  const getFilteredProgramSuggestions = () => {
    if (!searchText) return programs;
    const searchLower = searchText.toLowerCase();
    return programs.filter(program => 
      program.title.toLowerCase().includes(searchLower) ||
      program.shortCode.toLowerCase().includes(searchLower)
    );
  };

  const fetchPrograms = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/programs');
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setPrograms(data.data);
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/applications');
      const data = await response.json();
      
      if (data.success) {
        setApplications(data.data);
        setFilteredApplications(data.data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
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
        fetchApplications();
      } else {
        alert('Failed to delete application: ' + result.message);
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Error deleting application');
    }
  };

  const getStatusCounts = () => {
    return {
      total: filteredApplications.length,
      pending: filteredApplications.filter(app => 
        app.status.toLowerCase() === 'pending' || app.status.toLowerCase() === 'under-review'
      ).length,
      approved: filteredApplications.filter(app => app.status.toLowerCase() === 'approved').length,
      rejected: filteredApplications.filter(app => app.status.toLowerCase() === 'rejected').length
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
                placeholder="Search by name, NIC, application ID, email, phone, or program..."
                value={searchText}
                onChange={handleSearchInputChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setActiveSearchText(searchText);
                  }
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              <button className="search-btn" onClick={handleSearchButtonClick}>
                Search
              </button>
              
              {showSuggestions && searchText.length > 0 && getFilteredProgramSuggestions().length > 0 && (
                <div className="autocomplete-dropdown">
                  <div className="autocomplete-header">Available Programs/Courses:</div>
                  {getFilteredProgramSuggestions().map((program) => (
                    <div
                      key={program.shortCode}
                      className="autocomplete-item"
                      onClick={() => handleSuggestionClick(program.title)}
                    >
                      <div className="autocomplete-program-name">{program.title}</div>
                      <div className="autocomplete-program-code">{program.shortCode}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="filters-row">
              <div className="filter-group">
                <label>PROGRAM/COURSE</label>
                <select
                  value={filters.program}
                  onChange={(e) => setFilters({ ...filters, program: e.target.value })}
                >
                  <option value="All Programs">All Programs</option>
                  {programs && programs.length > 0 ? (
                    programs.map(program => (
                      <option key={program.shortCode} value={program.shortCode}>
                        {program.title}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Loading programs...</option>
                  )}
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
                  <option>Under Review</option>
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      No applications found matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => {
                    const program = programs.find(p => p.shortCode === app.program);
                    const programDisplay = program?.title 
                      ? program.title 
                      : (app.program ? app.program.toUpperCase() : 'N/A');
                    const statusDisplay = app.status === 'under-review' ? 'Under Review' : 
                                         app.status.charAt(0).toUpperCase() + app.status.slice(1);
                    return (
                      <tr key={app._id}>
                        <td className="app-id">{app._id.substring(0, 8).toUpperCase()}</td>
                        <td title={programDisplay}>{programDisplay}</td>
                        <td>
                          <span className={`status-badge status-${app.status.toLowerCase()}`}>
                            {statusDisplay}
                          </span>
                        </td>
                        <td>{app.fullName}</td>
                        <td>{app.nameWithInitials}</td>
                        <td>{app.nicNo}</td>
                        <td>{app.telephone}</td>
                        <td>
                          <button 
                            className="delete-btn-search"
                            onClick={() => handleDeleteApplication(app._id, app.fullName)}
                            title="Delete application"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M5.5 2.5V3h5v-.5a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.5zm-1 0V3H2v1h1v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4h1V3h-2.5v-.5A1.5 1.5 0 0 0 10 1H6a1.5 1.5 0 0 0-1.5 1.5zM4 4h8v9H4V4zm1.5 1.5v6h1v-6h-1zm3 0v6h1v-6h-1z"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="table-footer">
              <div className="table-info">
                Showing {filteredApplications.length > 0 ? `1-${filteredApplications.length}` : '0'} of {filteredApplications.length} applications
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
