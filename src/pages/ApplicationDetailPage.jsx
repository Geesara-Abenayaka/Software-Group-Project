import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Inbox, User, Mail, Send, X } from 'lucide-react';
import API_BASE_URL from '../utils/apiConfig';
import '../styles/AdminDashboard.css';
import '../styles/ApplicationDetailPage.css';
import AdminLayout from '../components/AdminLayout';
import Breadcrumbs from '../components/Breadcrumbs';
import StatusPill from '../components/StatusPill';
import useConfirm from '../utils/useConfirm';
import { toast } from '../utils/toast';
import { TableSkeleton } from '../components/Loaders';
import useDelayedFlag from '../utils/useDelayedFlag';

const NO_GPA_CATEGORY = 'No GPA';

const CATEGORY_PRIORITY = {
  'Category 1': 1,
  'Category 2': 2,
  'Category 3': 3,
  [NO_GPA_CATEGORY]: 4
};

// Category 1 first, highest GPA first within a category, applicants without a GPA last.
const sortByCategoryPriority = (list) => {
  return [...list].sort((a, b) => {
    const categoryDiff = (CATEGORY_PRIORITY[a.category] || 99) - (CATEGORY_PRIORITY[b.category] || 99);
    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    const gpaA = Number.isFinite(a.bestGpa) ? a.bestGpa : -1;
    const gpaB = Number.isFinite(b.bestGpa) ? b.bestGpa : -1;
    if (gpaA !== gpaB) {
      return gpaB - gpaA;
    }

    return a.displayId.localeCompare(b.displayId);
  });
};

function ApplicationDetailPage() {
  const { confirm, confirmDialog } = useConfirm();
  const navigate = useNavigate();
  const { programId } = useParams();
  const [program, setProgram] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const showSkeletons = useDelayedFlag(loading);
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
      // Fetch program details
      const programResponse = await fetch(`${API_BASE_URL}/programs/${programId}`);
      const programData = await programResponse.json();
      
      if (programData.success) {
        setProgram(programData.data);
      }

      // Fetch applications for this program
      const applicationsResponse = await fetch(`${API_BASE_URL}/applications/program/${programId}`);
      const applicationsData = await applicationsResponse.json();
      
      if (applicationsData.success) {
        // Transform the data to match the expected format
        const transformedApplications = applicationsData.data.map((app, index) => ({
          id: app._id,
          displayId: `APP${String(index + 1).padStart(3, '0')}`,
          nic: app.nicNo,
          fullName: app.fullName,
          nameWithInitials: app.nameWithInitials,
          // Derived on the server from the applicant's best GPA, the same way for every program.
          category: app.category || NO_GPA_CATEGORY,
          bestGpa: Number.isFinite(app.bestGpa) ? app.bestGpa : null,
          status: app.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          email: app.email,
          mobile: app.mobile,
          submittedAt: new Date(app.submittedAt).toLocaleDateString()
        }));
        
        setApplications(transformedApplications);
        applyFilters(searchText, filters, transformedApplications);
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
    toast.info("Export isn't available here yet. Use the Download tab to export applications.");
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
      (application) => typeof application.email === 'string' && application.email.trim()
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

      const response = await fetch(`${API_BASE_URL}/applications/program/${programId}/bulk-email`, {
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
      const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/status`, {
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
        toast.success(`Application ${statusMessage}`);
      } else {
        toast.error(`Couldn't update the status: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      toast.error("Couldn't update the status. Please try again.");
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
        fetchProgramAndApplications();
      } else {
        toast.error(`Couldn't delete the application: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error("Couldn't delete the application. Please try again.");
    }
  };

  const statusCounts = getStatusCounts();
  const selectedRecipients = getSelectableApplications(applications)
    .filter((application) => selectedRecipientIds.includes(application.id));

  const getCatClass = (cat) => {
    if (cat === 'Category 1') return 'cat-1';
    if (cat === 'Category 2') return 'cat-2';
    if (cat === 'Category 3') return 'cat-3';
    return 'cat-none';
  };

  return (
    <AdminLayout>

      {/* ── Page content ── */}
      <div id="main" tabIndex={-1} role="main" className="admin-content-full">
        <div className="detail-page-wrap">

          {/* Top bar: back + title + avatar */}
          <div className="detail-topbar">
            <div className="detail-topbar-text">
              <Breadcrumbs
                items={[
                  { label: 'Applications', to: '/admin/applications' },
                  { label: program?.title || 'Program' }
                ]}
              />
              <h2 className="detail-topbar-title">{program?.title || 'Program'}</h2>
              <p className="detail-topbar-sub">Application Management</p>
            </div>
            <div className="detail-topbar-avatar">
              <User size={20} />
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
              <option>{NO_GPA_CATEGORY}</option>
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
              aria-pressed={sortByCategory}
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
                </tr>
              </thead>
              <tbody className={loading && !showSkeletons ? 'skeleton-wait' : undefined} aria-busy={loading}>
                {loading ? (
                  <TableSkeleton rows={8} columns={6} rowHeight={57} />
                ) : filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      <div className="table-empty__inner">
                        <Inbox size={28} aria-hidden="true" />
                        <p>{applications.length === 0 ? 'No applications for this program yet' : 'No applications match these filters'}</p>
                      </div>
                    </td>
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
                      <td className="detail-nic">{app.nic}</td>
                      <td>{app.fullName}</td>
                      <td>{app.nameWithInitials}</td>
                      <td>
                        <span className={`detail-cat-badge ${getCatClass(app.category)}`}>
                          {app.category}
                          {app.bestGpa !== null && ` · ${app.bestGpa.toFixed(2)}`}
                        </span>
                      </td>
                      <td>
                        <StatusPill status={app.status} />
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
                    <User size={18} />
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
                      <span>Use tokens: {'{{name}}'}, {'{{status}}'}, {'{{applicationId}}'}, {'{{program}}'}</span>
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
      {confirmDialog}
    </AdminLayout>
  );
}

export default ApplicationDetailPage;
