import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GraduationCap, ClipboardList, Search, Download, BarChart2, Settings, LogOut, User, Mail, Send, X, Trash2 } from 'lucide-react';
import '../styles/AdminDashboard.css';
import '../styles/ApplicationDetailPage.css';

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

const getStableDisplayId = (mongoId) => {
  const safeId = String(mongoId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!safeId) {
    return 'UNKNOWN';
  }
  return safeId.substring(0, 8);
};

function ApplicationDetailPage() {
  const CATEGORY_PRIORITY = {
    'Category 1': 1,
    'Category 2': 2,
    'Category 3': 3
  };

  const getBestGpa = (qualifications) => {
    if (!Array.isArray(qualifications)) {
      return null;
    }

    const numericGpas = qualifications
      .map((qualification) => Number(qualification?.gpa))
      .filter((gpa) => Number.isFinite(gpa));

    if (numericGpas.length === 0) {
      return null;
    }

    return Math.max(...numericGpas);
  };

  const getCategoryFromGpa = (gpa) => {
    if (!Number.isFinite(gpa)) {
      return 'Category 3';
    }

    if (gpa >= 3.7) {
      return 'Category 1'; // First Class
    }

    if (gpa >= 3.3) {
      return 'Category 2'; // Second Upper
    }

    if (gpa >= 3.0) {
      return 'Category 3'; // Second Lower
    }

    return 'Category 3';
  };

  const sortByCategoryPriority = (list) => {
    return [...list].sort((a, b) => {
      const categoryDiff = (CATEGORY_PRIORITY[a.category] || 99) - (CATEGORY_PRIORITY[b.category] || 99);
      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      const gpaA = Number.isFinite(a.gpaValue) ? a.gpaValue : -1;
      const gpaB = Number.isFinite(b.gpaValue) ? b.gpaValue : -1;
      if (gpaA !== gpaB) {
        return gpaB - gpaA;
      }

      return a.displayId.localeCompare(b.displayId);
    });
  };

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
  const [sortByCategory, setSortByCategory] = useState(false);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [bulkSubject, setBulkSubject] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [sendingBulkEmail, setSendingBulkEmail] = useState(false);
  const [bulkEmailError, setBulkEmailError] = useState('');
  const [bulkEmailSuccess, setBulkEmailSuccess] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
    fetchProgramAndApplications();
  }, [programId]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isBulkEmailOpen) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsBulkEmailOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isBulkEmailOpen]);

  const fetchProgramAndApplications = async () => {
    try {
      setLoading(true);
      const [programResult, applicationsResult] = await Promise.allSettled([
        fetchWithTimeout(`http://localhost:5000/api/programs/${programId}`, 8000).then((response) => response.json()),
        fetchWithTimeout(`http://localhost:5000/api/applications/program/${programId}/summary`, 8000).then((response) => response.json())
      ]);

      if (programResult.status === 'fulfilled' && programResult.value?.success) {
        setProgram(programResult.value.data);
      } else {
        setProgram(null);
      }

      if (applicationsResult.status === 'fulfilled' && applicationsResult.value?.success) {
        const transformedApplications = applicationsResult.value.data.map((app) => ({
          id: app._id,
          displayId: getStableDisplayId(app._id),
          nic: app.nicNo || '-',
          fullName: app.fullName || '-',
          nameWithInitials: app.nameWithInitials || '-',
          category: app.category ||
                   (app.program === 'msc-cs' ? 'Category 1' :
                    app.program === 'msc-ai' ? 'Category 2' : 'Category 3'),
          status: String(app.status || 'pending').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          email: app.email,
          mobile: app.mobile,
          submittedAt: new Date(app.submittedAt).toLocaleDateString()
        }));
        
        setApplications(transformedApplications);
        applyFilters(searchText, filters, transformedApplications, sortByCategory);
      } else {
        // If no applications found, set empty array
        setApplications([]);
        setFilteredApplications([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setApplications([]);
      setFilteredApplications([]);
    } finally {
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

  const handleSortByCategory = () => {
    const nextSortByCategory = !sortByCategory;
    setSortByCategory(nextSortByCategory);
    applyFilters(searchText, filters, applications, nextSortByCategory);
  };

  const applyFilters = (
    search,
    currentFilters,
    sourceApplications = applications,
    shouldSortByCategory = sortByCategory
  ) => {
    let filtered = [...sourceApplications];

    if (search) {
      filtered = filtered.filter(app =>
        String(app.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
        String(app.nic || '').includes(search) ||
        app.id.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (currentFilters.category !== 'All') {
      filtered = filtered.filter(app => app.category === currentFilters.category);
    }

    if (currentFilters.status !== 'All') {
      filtered = filtered.filter(app => app.status === currentFilters.status);
    }

    if (shouldSortByCategory) {
      filtered = sortByCategoryPriority(filtered);
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

  const getDefaultBulkTemplate = () => {
    const programTitle = program?.title || 'your selected program';

    return {
      subject: `${programTitle} - Application Update`,
      message: [
        'Dear {{name}},',
        '',
        `This is an update regarding your application for ${programTitle}.`,
        'Current application status: {{status}}.',
        'Reference ID: {{applicationId}}.',
        '',
        'Interview Details:',
        'Date: {{interviewDate}}',
        'Time: {{interviewTime}}',
        '',
        'Please ensure you are available for the interview at the scheduled date and time. If you have any conflicts, please contact the admissions office immediately.',
        '',
        'If you need clarification, please contact the admissions office.',
        '',
        'Best regards,',
        'MBA Admissions Committee',
        'Application Management Team'
      ].join('\n')
    };
  };

  const getSelectableApplications = (sourceApplications) => {
    return sourceApplications.filter(
      (application) => typeof application.email === 'string' && application.email.trim() && application.status === 'Approved'
    );
  };

  const getFilteredRecipientIds = () => {
    return getSelectableApplications(filteredApplications).map((application) => application.id);
  };

  const getAllRecipientIds = () => {
    return getSelectableApplications(applications).map((application) => application.id);
  };

  const getRecipientSeed = () => {
    return getFilteredRecipientIds();
  };

  const openBulkEmailComposer = () => {
    const template = getDefaultBulkTemplate();
    setBulkSubject(template.subject);
    setBulkMessage(template.message);
    setSelectedRecipientIds(getRecipientSeed());
    setBulkEmailError('');
    setBulkEmailSuccess('');
    setIsBulkEmailOpen(true);
  };

  const closeBulkEmailComposer = () => {
    if (sendingBulkEmail) {
      return;
    }
    setIsBulkEmailOpen(false);
  };

  const handleResetRecipients = () => {
    const filteredRecipientIds = getFilteredRecipientIds();
    setSelectedRecipientIds(filteredRecipientIds);

    if (filteredRecipientIds.length === 0) {
      setBulkEmailError('No applications match the current filters. Try Select All.');
      setBulkEmailSuccess('');
      return;
    }

    setBulkEmailError('');
  };

  const handleSelectAllRecipients = () => {
    setSelectedRecipientIds(getAllRecipientIds());
    setBulkEmailError('');
  };

  const handleRemoveRecipient = (applicationId) => {
    setSelectedRecipientIds((prevIds) => prevIds.filter((id) => id !== applicationId));
  };

  const handleBulkEmailSubmit = async () => {
    if (!bulkSubject.trim() || !bulkMessage.trim()) {
      setBulkEmailError('Subject and email content are required.');
      setBulkEmailSuccess('');
      return;
    }

    if (selectedRecipientIds.length === 0) {
      setBulkEmailError('Please keep at least one recipient selected.');
      setBulkEmailSuccess('');
      return;
    }

    try {
      setSendingBulkEmail(true);
      setBulkEmailError('');
      setBulkEmailSuccess('');

      const response = await fetch(`http://localhost:5000/api/applications/program/${programId}/bulk-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          applicationIds: selectedRecipientIds,
          subject: bulkSubject.trim(),
          message: bulkMessage.trim()
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setBulkEmailError(result.error || result.message || 'Failed to send bulk email.');
        return;
      }

      const report = result.data || {};
      const deliveryMessage = report.isSimulated
        ? `Email workflow completed in simulation mode for ${report.sentCount} recipient(s). Configure SendGrid to deliver real emails.`
        : `Email sent to ${report.sentCount} recipient(s).`;

      setBulkEmailSuccess(deliveryMessage);

      if (report.failedCount > 0) {
        setBulkEmailError(`${report.failedCount} email(s) could not be delivered.`);
      }
    } catch (error) {
      console.error('Error sending bulk email:', error);
      setBulkEmailError('An unexpected error occurred while sending bulk email.');
    } finally {
      setSendingBulkEmail(false);
    }
  };

  const handleSendBulkEmail = () => {
    openBulkEmailComposer();
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
        // Remove only the deleted row from local state to avoid full table reload.
        setApplications((prevApplications) => (
          prevApplications.filter((application) => application.id !== applicationId)
        ));
        setFilteredApplications((prevFilteredApplications) => (
          prevFilteredApplications.filter((application) => application.id !== applicationId)
        ));
        setSelectedRecipientIds((prevIds) => prevIds.filter((id) => id !== applicationId));
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
  const selectedRecipients = getSelectableApplications(applications)
    .filter((application) => selectedRecipientIds.includes(application.id));

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
          <button className="navbar-btn active" onClick={() => navigate('/admin/applications')}>
            <ClipboardList size={18} className="nav-icon" />
            Applications
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
            <button
              className={`detail-sort-btn ${sortByCategory ? 'active' : ''}`}
              onClick={handleSortByCategory}
              type="button"
            >
              {sortByCategory ? 'Sorted: Category 1 > 2 > 3' : 'Sort by Category'}
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="no-apps-msg">
                      <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    </td>
                  </tr>
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-apps-msg">No applications found</td>
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
                      <td>
                        <button
                          type="button"
                          className="detail-delete-btn detail-delete-icon-btn"
                          onClick={() => handleDeleteApplication(app.id, app.fullName)}
                          aria-label={`Delete application ${app.displayId}`}
                          title="Delete application"
                        >
                          <Trash2 size={16} />
                        </button>
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

          {isBulkEmailOpen && (
            <div className="bulk-email-overlay" onClick={closeBulkEmailComposer}>
              <div className="bulk-email-modal" onClick={(event) => event.stopPropagation()}>
                <div className="bulk-email-header">
                  <div className="bulk-email-header-left">
                    <button className="bulk-email-back" onClick={closeBulkEmailComposer} type="button" aria-label="Close bulk email composer">
                      ←
                    </button>
                    <div>
                      <h3 className="bulk-email-title">Send Bulk Email</h3>
                      <p className="bulk-email-subtitle">Application Management</p>
                    </div>
                  </div>
                  <div className="bulk-email-header-icon">
                    <User size={18} color="#8b0000" />
                  </div>
                </div>

                <div className="bulk-email-body">
                  <section className="bulk-email-recipients">
                    <div className="bulk-email-section-heading">
                      <div className="bulk-email-heading-left">
                        <Mail size={14} />
                        <span>Selected Recipients</span>
                      </div>
                      <span className="bulk-email-count">{selectedRecipients.length} selected</span>
                    </div>

                    <div className="bulk-email-recipient-actions">
                      <button type="button" className="bulk-email-link-btn" onClick={handleResetRecipients}>Use Filtered</button>
                      <button type="button" className="bulk-email-link-btn" onClick={handleSelectAllRecipients}>Select All</button>
                    </div>

                    <div className="bulk-email-recipient-list">
                      {selectedRecipients.length === 0 ? (
                        <p className="bulk-email-empty">No recipients selected.</p>
                      ) : (
                        selectedRecipients.map((recipient) => (
                          <div className="bulk-email-recipient-item" key={recipient.id}>
                            <div className="bulk-email-recipient-avatar">
                              <User size={14} color="#ef4444" />
                            </div>
                            <div className="bulk-email-recipient-meta">
                              <strong>{recipient.fullName}</strong>
                              <span>{recipient.email}</span>
                            </div>
                            <span className="bulk-email-recipient-id">{recipient.displayId}</span>
                            <button
                              type="button"
                              className="bulk-email-remove"
                              onClick={() => handleRemoveRecipient(recipient.id)}
                              aria-label={`Remove ${recipient.fullName}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="bulk-email-editor">
                    <div className="bulk-email-editor-heading">
                      <h4>Email Content</h4>
                      <span>Use tokens: {'{{name}}'}, {'{{status}}'}, {'{{applicationId}}'}, {'{{program}}'}, {'{{interviewDate}}'}, {'{{interviewTime}}'}</span>
                    </div>

                    <label className="bulk-email-field-label" htmlFor="bulk-email-subject">Subject</label>
                    <input
                      id="bulk-email-subject"
                      type="text"
                      className="bulk-email-subject-input"
                      value={bulkSubject}
                      onChange={(event) => setBulkSubject(event.target.value)}
                    />

                    <label className="bulk-email-field-label" htmlFor="bulk-email-message">Message</label>
                    <textarea
                      id="bulk-email-message"
                      className="bulk-email-message-input"
                      value={bulkMessage}
                      onChange={(event) => setBulkMessage(event.target.value)}
                    />

                    {bulkEmailError && <p className="bulk-email-feedback error">{bulkEmailError}</p>}
                    {bulkEmailSuccess && <p className="bulk-email-feedback success">{bulkEmailSuccess}</p>}
                  </section>
                </div>

                <div className="bulk-email-footer">
                  <button type="button" className="bulk-email-cancel" onClick={closeBulkEmailComposer} disabled={sendingBulkEmail}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="bulk-email-send"
                    onClick={handleBulkEmailSubmit}
                    disabled={sendingBulkEmail || selectedRecipientIds.length === 0}
                  >
                    <Send size={15} />
                    {sendingBulkEmail ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default ApplicationDetailPage;
