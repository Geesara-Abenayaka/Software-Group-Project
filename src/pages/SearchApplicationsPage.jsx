import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import '../styles/SearchApplicationsPage.css';
import API_BASE_URL from '../utils/apiConfig';
import { formatReference } from '../utils/applicationReference';
import AdminLayout from '../components/AdminLayout';
import StatusPill from '../components/StatusPill';
import useConfirm from '../utils/useConfirm';
import { toast } from '../utils/toast';
import { Skeleton, TableSkeleton } from '../components/Loaders';
import useDelayedFlag from '../utils/useDelayedFlag';

// Placeholder for a stat card's number (.stat-value is about 30 px tall)
const STAT_SKELETON_STYLE = { display: 'inline-block', width: '48px', height: '30px', verticalAlign: 'top' };

const fetchWithTimeout = async (url, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

function SearchApplicationsPage() {
  const { confirm, confirmDialog } = useConfirm();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const showSkeletons = useDelayedFlag(loading);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(25);
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
        const matchReference = app._id && formatReference(app._id).toLowerCase().includes(searchLower);
        const matchTelephone = app.telephone && app.telephone.includes(activeSearchText.trim());
        const matchMobile = app.mobile && app.mobile.includes(activeSearchText.trim());
        const matchEmail = app.email && app.email.toLowerCase().includes(searchLower);
        
        // Add program/course search
        const program = programs.find(p => p.shortCode === app.program);
        const matchProgramName = program && program.title.toLowerCase().includes(searchLower);
        const matchProgramCode = app.program && app.program.toLowerCase().includes(searchLower);
        
        return matchFullName || matchInitials || matchNic || matchId || matchReference || matchTelephone || matchMobile || matchEmail || matchProgramName || matchProgramCode;
      });
    }

    if (filters.program !== 'All Programs') {
      filtered = filtered.filter(app => app.program === filters.program);
    }

    // Category is derived on the server from the applicant's best GPA.
    if (filters.category !== 'All Categories') {
      filtered = filtered.filter(app => (app.category || 'No GPA') === filters.category);
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

  const totalResults = filteredApplications.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / resultsPerPage));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIndex = totalResults === 0 ? 0 : (currentPageSafe - 1) * resultsPerPage;
  const endIndex = Math.min(startIndex + resultsPerPage, totalResults);
  const paginatedApplications = filteredApplications.slice(startIndex, endIndex);

  const getPaginationItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPageSafe <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPageSafe >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPageSafe - 1, currentPageSafe, currentPageSafe + 1, '...', totalPages];
  };

  const paginationItems = getPaginationItems();

  const handlePageChange = (page) => {
    if (typeof page !== 'number') {
      return;
    }
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
  };

  useEffect(() => {
    handleSearch();
  }, [filters, applications, activeSearchText, handleSearch]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSearchButtonClick = () => {
    setActiveSearchText(searchText);
    setCurrentPage(1);
  };

  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    setShowSuggestions(value.length > 0);
    
    // If search bar is cleared, reset to show all applications
    if (value.trim() === '') {
      setActiveSearchText('');
      setCurrentPage(1);
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
      const response = await fetchWithTimeout(`${API_BASE_URL}/programs`, 8000);
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
      const response = await fetchWithTimeout(`${API_BASE_URL}/applications/summary`, 8000);
      const data = await response.json();
      
      if (data.success) {
        setApplications(data.data);
        setFilteredApplications(data.data);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApplication = async (applicationId, fullName) => {
    const confirmed = await confirm({
      title: `Delete the application from ${fullName}?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete application',
      danger: true
    });
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Application deleted');
        // Refresh the applications list
        fetchApplications();
      } else {
        toast.error(`Couldn't delete the application: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error("Couldn't delete the application. Please try again.");
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



  return (
    <AdminLayout>

      <div className="admin-content-full">
        <main id="main" tabIndex={-1} className="admin-main-full">
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
                    setCurrentPage(1);
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
                  <option>Category 1</option>
                  <option>Category 2</option>
                  <option>Category 3</option>
                  <option>No GPA</option>
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
                <Download size={15} />
                Export All
              </button>
            </div>
          </div>

          <div className={loading && !showSkeletons ? 'skeleton-wait' : undefined} aria-busy={loading}>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-info">
                <span className="stat-label">Total Applications</span>
                <span className="stat-value">{loading ? <Skeleton as="span" style={STAT_SKELETON_STYLE} /> : statusCounts.total}</span>
              </div>
              <div className="stat-icon-circle stat-icon-total">
                <FileText size={22} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <span className="stat-label">Pending</span>
                <span className="stat-value">{loading ? <Skeleton as="span" style={STAT_SKELETON_STYLE} /> : statusCounts.pending}</span>
              </div>
              <div className="stat-icon-circle stat-icon-pending">
                <Clock size={22} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <span className="stat-label">Approved</span>
                <span className="stat-value">{loading ? <Skeleton as="span" style={STAT_SKELETON_STYLE} /> : statusCounts.approved}</span>
              </div>
              <div className="stat-icon-circle stat-icon-approved">
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-info">
                <span className="stat-label">Rejected</span>
                <span className="stat-value">{loading ? <Skeleton as="span" style={STAT_SKELETON_STYLE} /> : statusCounts.rejected}</span>
              </div>
              <div className="stat-icon-circle stat-icon-rejected">
                <XCircle size={22} />
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
                {loading ? (
                  <TableSkeleton rows={8} columns={8} rowHeight={70} />
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      No applications found matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedApplications.map((app) => {
                    const program = programs.find(p => p.shortCode === app.program);
                    const programDisplay = program?.title 
                      ? program.title 
                      : (app.program ? app.program.toUpperCase() : 'N/A');
                    return (
                      <tr key={app._id}>
                        <td className="app-id">
                          <a 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/admin/application/${app._id}`);
                            }}
                            className="app-id-link"
                            title="View full application details"
                          >
                            {app._id.substring(0, 8).toUpperCase()}
                          </a>
                        </td>
                        <td title={programDisplay}>{programDisplay}</td>
                        <td>
                          <StatusPill status={app.status} />
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
                {loading
                  ? 'Loading applications…'
                  : `Showing ${totalResults > 0 ? `${startIndex + 1}-${endIndex}` : '0'} of ${totalResults} applications`}
              </div>
              <div className="pagination">
                <span className="page-info">Results per page:</span>
                <select
                  className="page-select"
                  value={resultsPerPage}
                  onChange={(e) => {
                    setResultsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <button
                  className="page-btn"
                  onClick={() => handlePageChange(currentPageSafe - 1)}
                  disabled={currentPageSafe === 1}
                >
                  Previous
                </button>

                {paginationItems.map((item, index) => {
                  if (item === '...') {
                    return <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>;
                  }

                  return (
                    <button
                      key={`page-${item}`}
                      className={`page-btn ${currentPageSafe === item ? 'active' : ''}`}
                      onClick={() => handlePageChange(item)}
                    >
                      {item}
                    </button>
                  );
                })}

                <button
                  className="page-btn"
                  onClick={() => handlePageChange(currentPageSafe + 1)}
                  disabled={currentPageSafe === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          </div>
        </main>
      </div>
      {confirmDialog}
    </AdminLayout>
  );
}

export default SearchApplicationsPage;
