import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import '../styles/DownloadFormsPage.css';

function DownloadFormsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [documentType, setDocumentType] = useState('All');
  const [selectedFields, setSelectedFields] = useState([
    'Full Name', 'Name with Initials', 'NIC Number', 'Telephone', 'Mobile', 
    'Email', 'Contact Address', 'Application ID', 'Program'
  ]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
    fetchPrograms();
  }, [navigate]);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/programs');
      const data = await response.json();
      
      if (data.success) {
        setPrograms(data.data);
      }
    } catch (err) {
      console.error('Error fetching programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const dataFields = [
    { label: 'All', checked: false },
    { label: 'Full Name', checked: true },
    { label: 'Name with Initials', checked: true },
    { label: 'NIC Number', checked: true },
    { label: 'Telephone', checked: true },
    { label: 'Mobile', checked: true },
    { label: 'Email', checked: true },
    { label: 'Contact Address', checked: true },
    { label: 'Application ID', checked: true },
    { label: 'Program', checked: true }
  ];

  const handleProgramToggle = (program) => {
    if (selectedPrograms.includes(program)) {
      setSelectedPrograms(selectedPrograms.filter(p => p !== program));
    } else {
      setSelectedPrograms([...selectedPrograms, program]);
    }
  };

  const handleFieldToggle = (field) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const handleSelectAll = () => {
    setSelectedFields(dataFields.map(field => field.label));
  };

  const handleDeselectAll = () => {
    setSelectedFields([]);
  };

  const getFieldValue = (app, field) => {
    const fieldMap = {
      'Title': app.title,
      'Full Name': app.fullName,
      'Name with Initials': app.nameWithInitials,
      'NIC Number': app.nicNo,
      'Telephone': app.telephone || 'N/A',
      'Mobile': app.mobile,
      'Email': app.email,
      'Contact Address': app.contactAddress,
      'University': app.qualifications?.[0]?.university || 'N/A',
      'Degree': app.qualifications?.[0]?.degree || 'N/A',
      'Specialization': app.qualifications?.[0]?.specialization || 'N/A',
      'Duration': app.qualifications?.[0]?.duration || 'N/A',
      'Graduation Date': app.qualifications?.[0]?.graduationDate || 'N/A',
      'Part Time': app.partTime ? 'Yes' : 'No',
      'Already Registered': app.alreadyRegistered ? 'Yes' : 'No',
      'Professional Organization': app.memberships?.[0]?.organization || 'N/A',
      'Membership Category': app.memberships?.[0]?.category || 'N/A',
      'Date Joined Organization': app.memberships?.[0]?.dateJoined || 'N/A',
      'Company': app.experiences?.[0]?.company || 'N/A',
      'Position': app.experiences?.[0]?.position || 'N/A',
      'From Month': app.experiences?.[0]?.fromMonth || 'N/A',
      'From Year': app.experiences?.[0]?.fromYear || 'N/A',
      'To Month': app.experiences?.[0]?.toMonth || 'N/A',
      'To Year': app.experiences?.[0]?.toYear || 'N/A',
      'Degree Certificate Status': app.documents?.degreeCertificate ? 'Uploaded' : 'Not Uploaded',
      'NIC Document Status': app.documents?.nic ? 'Uploaded' : 'Not Uploaded',
      'Employer Letter Status': app.documents?.employerLetter ? 'Uploaded' : 'Not Uploaded',
      'Transcript Status': app.documents?.transcript ? 'Uploaded' : 'Not Uploaded',
      'Payment Confirmation Status': app.documents?.paymentConfirmation ? 'Uploaded' : 'Not Uploaded',
      'Program': programs.find(p => p.shortCode === app.program)?.title || app.program,
      'Status': app.status.charAt(0).toUpperCase() + app.status.slice(1).replace('-', ' '),
      'Submission Date': new Date(app.submittedAt).toLocaleDateString(),
      'Application ID': app._id.substring(0, 8).toUpperCase()
    };
    return fieldMap[field] || 'N/A';
  };

  const generateDetailedPDF = (applications) => {
    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait orientation
    
    applications.forEach((app, index) => {
      if (index > 0) doc.addPage();
      
      let y = 10;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2);
      
      // Maroon Header Background
      doc.setFillColor(139, 0, 0);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Header Text - White
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('APPLICATION FOR POSTGRADUATE STUDIES', pageWidth / 2, 15, { align: 'center' });
      
      // Program Name
      doc.setFontSize(12);
      const programTitle = programs.find(p => p.shortCode === app.program)?.title || app.program;
      doc.text(`Program: ${programTitle}`, pageWidth / 2, 23, { align: 'center' });
      
      // Application ID and Date
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Application ID: ${app._id.substring(0, 8).toUpperCase()}`, pageWidth / 2, 29, { align: 'center' });
      doc.text(`Submitted: ${new Date(app.submittedAt).toLocaleString()}`, pageWidth / 2, 35, { align: 'center' });
      
      // Reset text color to black for content
      doc.setTextColor(0, 0, 0);
      y = 48;
      
      // Personal Particulars Section
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Personal Particulars', margin, y);
      y += 8;
      
      // Draw section border
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(margin, y - 5, contentWidth, 68, 'S');
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Title
      doc.setFont(undefined, 'bold');
      doc.text('Title', margin + 2, y);
      doc.setFont(undefined, 'normal');
      doc.text(app.title ? app.title.charAt(0).toUpperCase() + app.title.slice(1) : 'N/A', margin + 2, y + 5);
      y += 12;
      
      // Full Name
      doc.setFont(undefined, 'bold');
      doc.text('Full Name (exactly as in the transcript)', margin + 2, y);
      doc.setFont(undefined, 'normal');
      doc.text(app.fullName || 'N/A', margin + 2, y + 5);
      y += 12;
      
      // Name with Initials and NIC (Two columns)
      const colWidth = contentWidth / 2;
      doc.setFont(undefined, 'bold');
      doc.text('Name with Initials', margin + 2, y);
      doc.text('NIC No', margin + colWidth + 2, y);
      doc.setFont(undefined, 'normal');
      doc.text(app.nameWithInitials || 'N/A', margin + 2, y + 5);
      doc.text(app.nicNo || 'N/A', margin + colWidth + 2, y + 5);
      y += 12;
      
      // Telephone and Mobile (Two columns)
      doc.setFont(undefined, 'bold');
      doc.text('Telephone', margin + 2, y);
      doc.text('Mobile', margin + colWidth + 2, y);
      doc.setFont(undefined, 'normal');
      doc.text(app.telephone || 'N/A', margin + 2, y + 5);
      doc.text(app.mobile || 'N/A', margin + colWidth + 2, y + 5);
      y += 12;
      
      // Email
      doc.setFont(undefined, 'bold');
      doc.text('Email', margin + 2, y);
      doc.setFont(undefined, 'normal');
      doc.text(app.email || 'N/A', margin + 2, y + 5);
      y += 12;
      
      // Contact Address
      doc.setFont(undefined, 'bold');
      doc.text('Contact Address', margin + 2, y);
      doc.setFont(undefined, 'normal');
      const addressLines = doc.splitTextToSize(app.contactAddress || 'N/A', contentWidth - 4);
      doc.text(addressLines, margin + 2, y + 5);
      y += 5 + (addressLines.length * 5) + 5;
      
      // Academic Qualifications Section
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Academic Qualifications', margin, y);
      y += 8;
      
      if (app.qualifications && app.qualifications.length > 0) {
        app.qualifications.forEach((qual, qIndex) => {
          const sectionHeight = 40;
          doc.setDrawColor(200, 200, 200);
          doc.rect(margin, y - 5, contentWidth, sectionHeight, 'S');
          
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          
          if (app.qualifications.length > 1) {
            doc.setFont(undefined, 'bold');
            doc.text(`Qualification ${qIndex + 1}`, margin + 2, y);
            y += 7;
          }
          
          // University and Degree (Two columns)
          doc.setFont(undefined, 'bold');
          doc.text('University / Institute', margin + 2, y);
          doc.text('Degree / Qualification', margin + colWidth + 2, y);
          doc.setFont(undefined, 'normal');
          doc.text(qual.university || 'N/A', margin + 2, y + 5);
          doc.text(qual.degree || 'N/A', margin + colWidth + 2, y + 5);
          y += 12;
          
          // Specialization, Duration, Graduation (Three columns)
          const col3Width = contentWidth / 3;
          doc.setFont(undefined, 'bold');
          doc.text('Specialization / Minor', margin + 2, y);
          doc.text('Duration', margin + col3Width + 2, y);
          doc.text('Graduation Date', margin + col3Width * 2 + 2, y);
          doc.setFont(undefined, 'normal');
          doc.text(qual.specialization || 'N/A', margin + 2, y + 5);
          doc.text(`${qual.duration || 'N/A'} Year${qual.duration !== '1' ? 's' : ''}`, margin + col3Width + 2, y + 5);
          doc.text(qual.graduationDate || 'N/A', margin + col3Width * 2 + 2, y + 5);
          y += 12;
        });
        y += 5;
      } else {
        doc.setFont(undefined, 'normal');
        doc.text('No qualifications provided', margin + 2, y);
        y += 7;
      }
      
      // Checkboxes
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.rect(margin, y, 3, 3, app.partTime ? 'F' : 'S');
      doc.text('Part Time', margin + 5, y + 2.5);
      y += 6;
      
      doc.rect(margin, y, 3, 3, app.alreadyRegistered ? 'F' : 'S');
      doc.text('Already registered for another degree program', margin + 5, y + 2.5);
      y += 10;
      
      // Check if we need a new page
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      
      // Membership Section
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Membership of Professional Organizations', margin, y);
      y += 8;
      
      if (app.memberships && app.memberships.length > 0) {
        app.memberships.forEach((mem, mIndex) => {
          doc.setDrawColor(200, 200, 200);
          doc.rect(margin, y - 5, contentWidth, 20, 'S');
          
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          
          if (app.memberships.length > 1) {
            doc.setFont(undefined, 'bold');
            doc.text(`Membership ${mIndex + 1}`, margin + 2, y);
            y += 7;
          }
          
          const col3Width = contentWidth / 3;
          doc.setFont(undefined, 'bold');
          doc.text('Organization', margin + 2, y);
          doc.text('Category', margin + col3Width + 2, y);
          doc.text('Date Joined', margin + col3Width * 2 + 2, y);
          doc.setFont(undefined, 'normal');
          doc.text(mem.organization || 'N/A', margin + 2, y + 5);
          doc.text(mem.category || 'N/A', margin + col3Width + 2, y + 5);
          doc.text(mem.dateJoined || 'N/A', margin + col3Width * 2 + 2, y + 5);
          y += 12;
        });
        y += 5;
      } else {
        doc.setFont(undefined, 'normal');
        doc.text('No memberships provided', margin + 2, y);
        y += 7;
      }
      
      // Work Experience Section
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Work Experience', margin, y);
      y += 8;
      
      if (app.experiences && app.experiences.length > 0) {
        app.experiences.forEach((exp, eIndex) => {
          doc.setDrawColor(200, 200, 200);
          doc.rect(margin, y - 5, contentWidth, 28, 'S');
          
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          
          if (app.experiences.length > 1) {
            doc.setFont(undefined, 'bold');
            doc.text(`Experience ${eIndex + 1}`, margin + 2, y);
            y += 7;
          }
          
          doc.setFont(undefined, 'bold');
          doc.text('Company', margin + 2, y);
          doc.text('Position', margin + colWidth + 2, y);
          doc.setFont(undefined, 'normal');
          doc.text(exp.company || 'N/A', margin + 2, y + 5);
          doc.text(exp.position || 'N/A', margin + colWidth + 2, y + 5);
          y += 12;
          
          doc.setFont(undefined, 'bold');
          doc.text('Period', margin + 2, y);
          doc.setFont(undefined, 'normal');
          doc.text(`${exp.fromMonth || 'N/A'}/${exp.fromYear || 'N/A'} - ${exp.toMonth || 'N/A'}/${exp.toYear || 'N/A'}`, margin + 2, y + 5);
          y += 12;
        });
        y += 5;
      } else {
        doc.setFont(undefined, 'normal');
        doc.text('No work experience provided', margin + 2, y);
        y += 7;
      }
      
      // Documents Section
      if (y > 220) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Documents', margin, y);
      y += 8;
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, y - 5, contentWidth, 32, 'S');
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      
      const docs = [
        { label: 'Degree Certificate', status: app.documents?.degreeCertificate },
        { label: 'NIC', status: app.documents?.nic },
        { label: 'Employer Letter', status: app.documents?.employerLetter },
        { label: 'Transcript', status: app.documents?.transcript },
        { label: 'Payment Confirmation', status: app.documents?.paymentConfirmation }
      ];
      
      docs.forEach((docItem) => {
        doc.setFont(undefined, 'bold');
        doc.text(`${docItem.label}:`, margin + 2, y);
        doc.setFont(undefined, 'normal');
        if (docItem.status) {
          doc.setTextColor(34, 139, 34); // Green
          doc.text('✓ Uploaded', margin + 50, y);
        } else {
          doc.setTextColor(220, 53, 69); // Red
          doc.text('✗ Not Uploaded', margin + 50, y);
        }
        doc.setTextColor(0, 0, 0);
        y += 6;
      });
    });
    
    return doc;
  };

  const handleDownloadList = async () => {
    try {
      // Validation
      if (selectedPrograms.length === 0) {
        alert('Please select at least one program');
        return;
      }
      if (selectedFields.length === 0) {
        alert('Please select at least one data field');
        return;
      }

      // Fetch applications
      const response = await fetch('http://localhost:5000/api/applications');
      const data = await response.json();

      if (!data.success) {
        alert('Failed to fetch applications');
        return;
      }

      let applications = data.data;

      // Filter by selected programs
      applications = applications.filter(app => selectedPrograms.includes(app.program));

      // Filter by document type (status)
      if (documentType !== 'All') {
        const statusMap = {
          'Approved': 'approved',
          'Rejected': 'rejected',
          'Pending': 'pending',
          'Under Review': 'under-review'
        };
        applications = applications.filter(app => app.status === statusMap[documentType]);
      }

      if (applications.length === 0) {
        alert('No applications found matching the selected criteria');
        return;
      }

      // Check if "All" is selected
      if (selectedFields.includes('All')) {
        // Generate detailed PDF
        const doc = generateDetailedPDF(applications);
        const fileName = `Detailed_Applications_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        alert(`Successfully downloaded ${applications.length} detailed application(s)`);
        return;
      }

      // Create PDF with table format
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      
      // Add title
      doc.setFontSize(16);
      doc.text('Application Data Report', 14, 15);
      
      // Add filters info
      doc.setFontSize(10);
      doc.text(`Programs: ${selectedPrograms.map(pCode => programs.find(p => p.shortCode === pCode)?.title || pCode).join(', ')}`, 14, 22);
      doc.text(`Status Filter: ${documentType}`, 14, 27);
      doc.text(`Total Applications: ${applications.length}`, 14, 32);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);

      // Prepare table data
      const tableHeaders = [selectedFields];
      const tableData = applications.map(app => 
        selectedFields.map(field => getFieldValue(app, field))
      );

      // Add table
      doc.autoTable({
        head: tableHeaders,
        body: tableData,
        startY: 42,
        styles: { 
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [139, 0, 0],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { left: 14, right: 14 }
      });

      // Save PDF
      const fileName = `Application_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      alert(`Successfully downloaded ${applications.length} applications`);
    } catch (error) {
      console.error('Error downloading list:', error);
      console.error('Error details:', error.message);
      alert(`Error generating PDF: ${error.message}\nPlease check the console for details.`);
    }
  };

  const handleDownloadApproved = async () => {
    try {
      // Fetch applications
      const response = await fetch('http://localhost:5000/api/applications');
      const data = await response.json();

      if (!data.success) {
        alert('Failed to fetch applications');
        return;
      }

      // Filter approved applications
      const approvedApps = data.data.filter(app => app.status === 'approved');

      if (approvedApps.length === 0) {
        alert('No approved applications found');
        return;
      }

      // Generate detailed PDF for all approved applications
      const doc = generateDetailedPDF(approvedApps);
      const fileName = `Approved_Candidates_Detailed_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      alert(`Successfully downloaded ${approvedApps.length} approved application(s) with full details`);
    } catch (error) {
      console.error('Error downloading approved list:', error);
      console.error('Error details:', error.message);
      alert(`Error generating PDF: ${error.message}\nPlease check the console for details.`);
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
          <button className="navbar-btn active">
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
          <div className="download-header">
            <h2 className="download-title">Download Forms</h2>
            <p className="download-subtitle">Download application forms, templates, and applicant data</p>
          </div>

          <div className="download-section">
            <h3 className="section-title">Download Forms</h3>

            <div className="form-group">
              <label className="group-label">Application Forms</label>
              {loading ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>Loading programs...</p>
              ) : programs.length === 0 ? (
                <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No programs available</p>
              ) : (
                <div className="checkbox-group">
                  {programs.map((program) => (
                    <label key={program.shortCode} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedPrograms.includes(program.shortCode)}
                        onChange={() => handleProgramToggle(program.shortCode)}
                      />
                      <span>{program.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="group-label">Document Type</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="All"
                    checked={documentType === 'All'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>All</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="Approved"
                    checked={documentType === 'Approved'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>Approved</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="Rejected"
                    checked={documentType === 'Rejected'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>Rejected</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="Pending"
                    checked={documentType === 'Pending'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>Pending</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="documentType"
                    value="Under Review"
                    checked={documentType === 'Under Review'}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                  <span>Under Review</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <div className="group-header">
                <label className="group-label">Download Data Fields</label>
                <div className="select-actions">
                  <button className="select-link" onClick={handleSelectAll}>Select All</button>
                  <button className="select-link" onClick={handleDeselectAll}>Deselect All</button>
                </div>
              </div>
              <div className="fields-grid">
                {dataFields.map((field, index) => (
                  <label key={index} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.label)}
                      onChange={() => handleFieldToggle(field.label)}
                    />
                    <span>{field.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="download-list-btn" onClick={handleDownloadList}>
              <span className="btn-icon">📥</span>
              Download List
            </button>
          </div>

          <div className="download-section approved-section">
            <h3 className="section-title">Download Approved Candidates File</h3>
            <p className="section-description">Export a list of all approved applicants across all programs</p>
            <button className="download-list-btn" onClick={handleDownloadApproved}>
              <span className="btn-icon">📥</span>
              Download List
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DownloadFormsPage;
