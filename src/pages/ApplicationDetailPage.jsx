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

      // Mock applications data
      const mockApplications = [
        {
          id: 'APP001',
          nic: '199512345678',
          fullName: 'Kasun Perera Bandara',
          nameWithInitials: 'K.P. Bandara',
          category: 'Category 1',
          status: 'Pending'
        },
        {
          id: 'APP002',
          nic: '199623456789',
          fullName: 'Nimali Silva Wickramasinghe',
          nameWithInitials: 'N.S. Wickramasinghe',
          category: 'Category 2',
          status: 'Approved'
        },
        {
          id: 'APP003',
          nic: '199734567890',
          fullName: 'Ravindu Fernando',
          nameWithInitials: 'R. Fernando',
          category: 'Category 1',
          status: 'Approved'
        },
        {
          id: 'APP004',
          nic: '199845678901',
          fullName: 'Dilini Jayawardena',
          nameWithInitials: 'D. Jayawardena',
          category: 'Category 3',
          status: 'Rejected'
        },
        {
          id: 'APP005',
          nic: '199956789012',
          fullName: 'Chamara Rathnayake',
          nameWithInitials: 'C. Rathnayake',
          category: 'Category 2',
          status: 'Pending'
        },
        {
          id: 'APP006',
          nic: '200067890123',
          fullName: 'Thanushi Gunasekara',
          nameWithInitials: 'T. Gunasekara',
          category: 'Category 1',
          status: 'Approved'
        },
        {
          id: 'APP007',
          nic: '200178901234',
          fullName: 'Isuru Dissanayake',
          nameWithInitials: 'I. Dissanayake',
          category: 'Category 3',
          status: 'Pending'
        }
      ];

      setApplications(mockApplications);
      setFilteredApplications(mockApplications);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
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
      pending: applications.filter(app => app.status === 'Pending').length,
      rejected: applications.filter(app => app.status === 'Rejected').length
    };
  };

  const handleExport = () => {
    alert('Exporting applications data...');
  };

  const handleSendBulkEmail = () => {
    alert('Opening bulk email composer...');
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
              <span className="stat-label-detail">Pending</span>
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
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr key={app.id}>
                    <td className="app-id-cell">{app.id}</td>
                    <td>{app.nic}</td>
                    <td>{app.fullName}</td>
                    <td>{app.nameWithInitials}</td>
                    <td>
                      <span className="category-badge">{app.category}</span>
                    </td>
                    <td>
                      <span className={`status-badge-detail status-${app.status.toLowerCase()}`}>
                        {app.status === 'Approved' && '✓ '}
                        {app.status === 'Rejected' && '✕ '}
                        {app.status === 'Pending' && '○ '}
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
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
