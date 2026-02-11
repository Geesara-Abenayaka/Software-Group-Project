import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/ApplicationViewPage.css';

function ApplicationViewPage() {
  const navigate = useNavigate();
  const { applicationId } = useParams();
  const [user, setUser] = useState(null);
  const [application, setApplication] = useState(null);
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
    fetchApplicationDetails();
  }, [navigate, applicationId]);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/applications/${applicationId}`);
      const data = await response.json();
      
      if (data.success) {
        setApplication(data.data);
        
        // Fetch program details
        if (data.data.program) {
          const programResponse = await fetch(`http://localhost:5000/api/programs/${data.data.program}`);
          const programData = await programResponse.json();
          if (programData.success) {
            setProgram(programData.data);
          }
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching application:', err);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleUpdateStatus = async (newStatus) => {
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
        fetchApplicationDetails();
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

  if (loading) {
    return (
      <div className="application-form-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading application details...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="application-form-page">
        <div className="loading-container">
          <p>Application not found</p>
          <button onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  const getStatusDisplay = (status) => {
    if (status === 'under-review') return 'Under Review';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getTitleDisplay = (title) => {
    const titleMap = {
      'mr': 'Mr',
      'mrs': 'Mrs',
      'ms': 'Ms',
      'dr': 'Dr',
      'prof': 'Prof'
    };
    return titleMap[title] || title;
  };

  return (
    <div className="application-form-page">
      {/* Admin Header */}
      <div className="admin-header-fixed">
        <div className="admin-header-content">
          <div className="header-left">
            <button className="back-btn-header" onClick={() => navigate(-1)}>
              ← Back
            </button>
          </div>
          <div className="header-right">
            <div className="status-update-bar">
              <label>Update Status:</label>
              <select
                className="status-select-header"
                value={application.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="under-review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <span className={`status-badge-header status-${application.status}`}>
                {getStatusDisplay(application.status)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Header */}
      <div className="form-header">
        <h3>APPLICATION FOR POSTGRADUATE STUDIES</h3>
        {program && (
          <p style={{ marginTop: '10px', fontSize: '16px', fontWeight: '600' }}>
            Program: {program.title}
          </p>
        )}
        <p style={{ marginTop: '10px', fontSize: '14px', fontFamily: 'monospace' }}>
          Application ID: {application._id}
        </p>
        <p style={{ marginTop: '5px', fontSize: '13px' }}>
          Submitted: {new Date(application.submittedAt).toLocaleString()}
        </p>
      </div>

      {/* Application Content */}
      <div className="application-form">
        {/* Personal Particulars */}
        <div className="form-section">
          <h3 className="section-title">Personal Particulars</h3>
          
          <div className="form-group view-only">
            <label>Title</label>
            <div className="view-value">{getTitleDisplay(application.title)}</div>
          </div>

          <div className="form-group view-only">
            <label>Full Name (exactly as in the transcript)</label>
            <div className="view-value">{application.fullName}</div>
          </div>

          <div className="form-row">
            <div className="form-group view-only">
              <label>Name with Initials</label>
              <div className="view-value">{application.nameWithInitials}</div>
            </div>
            <div className="form-group view-only">
              <label>NIC No</label>
              <div className="view-value">{application.nicNo}</div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group view-only">
              <label>Telephone</label>
              <div className="view-value">{application.telephone || 'N/A'}</div>
            </div>
            <div className="form-group view-only">
              <label>Mobile</label>
              <div className="view-value">{application.mobile}</div>
            </div>
          </div>

          <div className="form-group view-only">
            <label>Email</label>
            <div className="view-value">{application.email}</div>
          </div>

          <div className="form-group view-only">
            <label>Contact Address</label>
            <div className="view-value">{application.contactAddress}</div>
          </div>
        </div>

        {/* Academic Qualifications */}
        <div className="form-section">
          <h3 className="section-title">Academic Qualifications</h3>
          
          {application.qualifications && application.qualifications.length > 0 ? (
            application.qualifications.map((qual, index) => (
              <div key={index} className="qualification-item view-only">
                {application.qualifications.length > 1 && (
                  <h4 className="item-number">Qualification {index + 1}</h4>
                )}
                <div className="form-row">
                  <div className="form-group view-only">
                    <label>University / Institute</label>
                    <div className="view-value">{qual.university}</div>
                  </div>
                  <div className="form-group view-only">
                    <label>Degree / Qualification</label>
                    <div className="view-value">{qual.degree}</div>
                  </div>
                </div>

                <div className="form-row-three">
                  <div className="form-group view-only">
                    <label>Specialization / Minor</label>
                    <div className="view-value">{qual.specialization}</div>
                  </div>
                  <div className="form-group view-only">
                    <label>Duration (Years)</label>
                    <div className="view-value">{qual.duration} Year{qual.duration !== '1' ? 's' : ''}</div>
                  </div>
                  <div className="form-group view-only">
                    <label>Graduation Date</label>
                    <div className="view-value">{qual.graduationDate}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="no-data">No qualifications provided</p>
          )}

          <div className="checkbox-group view-only">
            <label>
              <input
                type="checkbox"
                checked={application.partTime}
                disabled
              />
              Part Time
            </label>
          </div>

          <div className="checkbox-group view-only">
            <label>
              <input
                type="checkbox"
                checked={application.alreadyRegistered}
                disabled
              />
              Already registered for another degree program
            </label>
          </div>
        </div>

        {/* Membership of Professional Organizations */}
        <div className="form-section">
          <h3 className="section-title">Membership of Professional Organizations</h3>
          
          {application.memberships && application.memberships.length > 0 ? (
            application.memberships.map((membership, index) => (
              <div key={index} className="membership-item view-only">
                {application.memberships.length > 1 && (
                  <h4 className="item-number">Membership {index + 1}</h4>
                )}
                <div className="form-row-three">
                  <div className="form-group view-only">
                    <label>Professional Organization</label>
                    <div className="view-value">{membership.organization}</div>
                  </div>
                  <div className="form-group view-only">
                    <label>Membership Category</label>
                    <div className="view-value">{membership.category}</div>
                  </div>
                  <div className="form-group view-only">
                    <label>Date Joined</label>
                    <div className="view-value">{membership.dateJoined}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="no-data">No professional memberships provided</p>
          )}
        </div>

        {/* Work Experience */}
        <div className="form-section">
          <h3 className="section-title">Work Experience (most recent first)</h3>
          
          {application.experiences && application.experiences.length > 0 ? (
            application.experiences.map((exp, index) => (
              <div key={index} className="experience-item view-only">
                {application.experiences.length > 1 && (
                  <h4 className="item-number">Experience {index + 1}</h4>
                )}
                <div className="form-row-four">
                  <div className="form-group view-only">
                    <label>From Month</label>
                    <div className="view-value">{exp.fromMonth}</div>
                  </div>
                  <div className="form-group view-only">
                    <label>Year</label>
                    <div className="view-value">{exp.fromYear}</div>
                  </div>
                  <div className="form-group view-only">
                    <label>To Month</label>
                    <div className="view-value">{exp.toMonth}</div>
                  </div>
                  <div className="form-group view-only">
                    <label>Year</label>
                    <div className="view-value">{exp.toYear}</div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group view-only">
                    <label>Company</label>
                    <div className="view-value">{exp.company}</div>
                  </div>
                  <div className="form-group view-only">
                    <label>Position</label>
                    <div className="view-value">{exp.position}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="no-data">No work experience provided</p>
          )}
        </div>

        {/* Documents */}
        <div className="form-section">
          <h3 className="section-title">Documents</h3>
          <p className="document-note">
            * Please make sure each file is 4 MB or less (Please upload the files in PDF format). All documents are required.
          </p>

          <div className="form-group view-only">
            <label>Degree / Diploma Certificate(s)</label>
            <div className={`document-status ${application.documents?.degreeCertificate ? 'uploaded' : 'not-uploaded'}`}>
              {application.documents?.degreeCertificate ? '✓ Uploaded' : '✗ Not Uploaded'}
            </div>
          </div>

          <div className="form-group view-only">
            <label>NIC</label>
            <div className={`document-status ${application.documents?.nic ? 'uploaded' : 'not-uploaded'}`}>
              {application.documents?.nic ? '✓ Uploaded' : '✗ Not Uploaded'}
            </div>
          </div>

          <div className="form-group view-only">
            <label>Employer Consent Letter</label>
            <div className={`document-status ${application.documents?.employerLetter ? 'uploaded' : 'not-uploaded'}`}>
              {application.documents?.employerLetter ? '✓ Uploaded' : '✗ Not Uploaded'}
            </div>
          </div>

          <div className="form-group view-only">
            <label>Transcript(s)</label>
            <div className={`document-status ${application.documents?.transcript ? 'uploaded' : 'not-uploaded'}`}>
              {application.documents?.transcript ? '✓ Uploaded' : '✗ Not Uploaded'}
            </div>
          </div>

          <div className="form-group view-only">
            <label>Payment Confirmation / Bank Receipt</label>
            <div className={`document-status ${application.documents?.paymentConfirmation ? 'uploaded' : 'not-uploaded'}`}>
              {application.documents?.paymentConfirmation ? '✓ Uploaded' : '✗ Not Uploaded'}
            </div>
          </div>

          <p className="document-info">
            ** The application processing fee of Rs. 2,000/- (Per subject for LLB/University Repeat) will be paid either to University Receipt or as a bank or 
            Genie transfer in the credit of University of Moratuwa—Acc No. 0043618. You may also make an online transfer to the same account.
          </p>
        </div>

        {/* Declaration */}
        <div className="form-section">
          <h3 className="section-title">Declaration</h3>
          <div className="declaration-text">
            <p>
              I affirm that all statements made/entered by me on this form are correct. I understand that any inaccurate or false information for 
              omission of material information will render this application invalid and that, if admitted and awarded a place on the basis of such 
              information, my candidature can be terminated and I can also be subject to any penalty imposed by the Senate of the University of Moratuwa.
            </p>
            <p>
              In addition to submitting this application, please also provide the necessary recommendations by requesting the relevant referees to 
              fill in the Online Referee Form according to the instructions given in the handbook to complete the application process. Please note that 
              without these recommendations, the application would be considered as incomplete.
            </p>
          </div>

          <div className="checkbox-group view-only">
            <label>
              <input
                type="checkbox"
                checked={application.declaration}
                disabled
              />
              I accept the declaration
            </label>
          </div>

          {application.captcha && (
            <div className="form-group view-only">
              <label>Captcha Verified</label>
              <div className="view-value">✓ Verified</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApplicationViewPage;
