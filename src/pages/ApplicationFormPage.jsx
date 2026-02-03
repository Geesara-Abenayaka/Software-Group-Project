import { useState } from 'react';
import '../styles/ApplicationFormPage.css';

function ApplicationFormPage() {
  const [formData, setFormData] = useState({
    program: '',
    title: '',
    fullName: '',
    nameWithInitials: '',
    nicNo: '',
    telephone: '',
    mobile: '',
    email: '',
    contactAddress: '',
    qualifications: [{
      university: '',
      degree: '',
      specialization: '',
      duration: '',
      graduationDate: ''
    }],
    partTime: false,
    alreadyRegistered: false,
    memberships: [{
      organization: '',
      category: '',
      dateJoined: ''
    }],
    experiences: [{
      fromMonth: '',
      fromYear: '',
      toMonth: '',
      toYear: '',
      company: '',
      position: ''
    }],
    documents: {
      degreeCertificate: null,
      nic: null,
      employerLetter: null,
      transcript: null,
      paymentConfirmation: null
    },
    declaration: false,
    captcha: ''
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e, documentType) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [documentType]: e.target.files[0]
      }
    }));
  };

  const addQualification = () => {
    setFormData(prev => ({
      ...prev,
      qualifications: [...prev.qualifications, {
        university: '',
        degree: '',
        specialization: '',
        duration: '',
        graduationDate: ''
      }]
    }));
  };

  const addMembership = () => {
    setFormData(prev => ({
      ...prev,
      memberships: [...prev.memberships, {
        organization: '',
        category: '',
        dateJoined: ''
      }]
    }));
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experiences: [...prev.experiences, {
        fromMonth: '',
        fromYear: '',
        toMonth: '',
        toYear: '',
        company: '',
        position: ''
      }]
    }));
  };

  const handleQualificationChange = (index, field, value) => {
    const updated = [...formData.qualifications];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, qualifications: updated }));
  };

  const handleMembershipChange = (index, field, value) => {
    const updated = [...formData.memberships];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, memberships: updated }));
  };

  const handleExperienceChange = (index, field, value) => {
    const updated = [...formData.experiences];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, experiences: updated }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // TODO: Add API call to submit application
  };

  return (
    <div className="application-form-page">
      <div className="form-header">
        <h1>UNIVERSITY OF MORATUWA</h1>
        <h2>FACULTY OF ENGINEERING</h2>
        <p>DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING</p>
        <h3>APPLICATION FOR POSTGRADUATE STUDIES</h3>
      </div>

      <form onSubmit={handleSubmit} className="application-form">
        {/* Program Selection */}
        <div className="form-section">
          <label className="required">Program of Study Applying For</label>
          <select
            name="program"
            value={formData.program}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Program</option>
            <option value="msc-cs">MSc in Computer Science</option>
            <option value="msc-ai">MSc in Artificial Intelligence</option>
            <option value="msc-ds">MSc in Data Science</option>
            <option value="phd-cs">PhD in Computer Science</option>
          </select>
        </div>

        {/* Personal Particulars */}
        <div className="form-section">
          <h3 className="section-title required">Personal Particulars</h3>
          
          <div className="form-group">
            <label>Title</label>
            <select
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              style={{ width: '200px' }}
            >
              <option value="">Select</option>
              <option value="mr">Mr</option>
              <option value="mrs">Mrs</option>
              <option value="ms">Ms</option>
              <option value="dr">Dr</option>
              <option value="prof">Prof</option>
            </select>
          </div>

          <div className="form-group">
            <label>Full Name (exactly as in the transcript)</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Tharindu Eranda Weerasinghe"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Name with Initials</label>
              <input
                type="text"
                name="nameWithInitials"
                value={formData.nameWithInitials}
                onChange={handleInputChange}
                placeholder="T.E. Weerasinghe"
              />
            </div>
            <div className="form-group">
              <label>NIC No</label>
              <input
                type="text"
                name="nicNo"
                value={formData.nicNo}
                onChange={handleInputChange}
                placeholder="123456789V"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Telephone</label>
              <input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleInputChange}
                placeholder="0112345678"
              />
            </div>
            <div className="form-group">
              <label>Mobile</label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleInputChange}
                placeholder="0771234567"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="teweerasinghe@example.com"
            />
          </div>

          <div className="form-group">
            <label>Contact Address</label>
            <textarea
              name="contactAddress"
              value={formData.contactAddress}
              onChange={handleInputChange}
              rows="3"
            />
          </div>
        </div>

        {/* Academic Qualifications */}
        <div className="form-section">
          <h3 className="section-title">Academic Qualifications</h3>
          
          {formData.qualifications.map((qual, index) => (
            <div key={index} className="qualification-item">
              <div className="form-row">
                <div className="form-group">
                  <label>University / Institute</label>
                  <select
                    value={qual.university}
                    onChange={(e) => handleQualificationChange(index, 'university', e.target.value)}
                  >
                    <option value="">Select University</option>
                    <option value="uom">University of Moratuwa</option>
                    <option value="uoc">University of Colombo</option>
                    <option value="uop">University of Peradeniya</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Degree / Qualification</label>
                  <select
                    value={qual.degree}
                    onChange={(e) => handleQualificationChange(index, 'degree', e.target.value)}
                  >
                    <option value="">Select Qualifications</option>
                    <option value="bsc">BSc (Hons)</option>
                    <option value="msc">MSc</option>
                    <option value="phd">PhD</option>
                  </select>
                </div>
              </div>

              <div className="form-row-three">
                <div className="form-group">
                  <label>Specialization / Minor</label>
                  <input
                    type="text"
                    value={qual.specialization}
                    onChange={(e) => handleQualificationChange(index, 'specialization', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Duration (Years)</label>
                  <select
                    value={qual.duration}
                    onChange={(e) => handleQualificationChange(index, 'duration', e.target.value)}
                  >
                    <option value="">Select Duration</option>
                    <option value="1">1 Year</option>
                    <option value="2">2 Years</option>
                    <option value="3">3 Years</option>
                    <option value="4">4 Years</option>
                    <option value="5">5 Years</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Graduation Date</label>
                  <input
                    type="text"
                    value={qual.graduationDate}
                    onChange={(e) => handleQualificationChange(index, 'graduationDate', e.target.value)}
                    placeholder="mm/dd/yyyy"
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addQualification} className="add-button">
            + Add Another Qualification
          </button>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                name="partTime"
                checked={formData.partTime}
                onChange={handleInputChange}
              />
              Part Time
            </label>
          </div>

          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                name="alreadyRegistered"
                checked={formData.alreadyRegistered}
                onChange={handleInputChange}
              />
              Already registered for another degree program
            </label>
          </div>
        </div>

        {/* Membership of Professional Organizations */}
        <div className="form-section">
          <h3 className="section-title">Membership of Professional Organizations</h3>
          
          {formData.memberships.map((membership, index) => (
            <div key={index} className="membership-item">
              <div className="form-row-three">
                <div className="form-group">
                  <label>Professional Organization</label>
                  <input
                    type="text"
                    value={membership.organization}
                    onChange={(e) => handleMembershipChange(index, 'organization', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Membership Category</label>
                  <input
                    type="text"
                    value={membership.category}
                    onChange={(e) => handleMembershipChange(index, 'category', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Date Joined</label>
                  <input
                    type="text"
                    value={membership.dateJoined}
                    onChange={(e) => handleMembershipChange(index, 'dateJoined', e.target.value)}
                    placeholder="mm/dd/yyyy"
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addMembership} className="add-button">
            + Add Another Membership
          </button>
        </div>

        {/* Work Experience */}
        <div className="form-section">
          <h3 className="section-title">Work Experience (most recent first)</h3>
          
          {formData.experiences.map((exp, index) => (
            <div key={index} className="experience-item">
              <div className="form-row-six">
                <div className="form-group">
                  <label>From Month</label>
                  <select
                    value={exp.fromMonth}
                    onChange={(e) => handleExperienceChange(index, 'fromMonth', e.target.value)}
                  >
                    <option value="">Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="text"
                    value={exp.fromYear}
                    onChange={(e) => handleExperienceChange(index, 'fromYear', e.target.value)}
                    placeholder="Year"
                  />
                </div>
                <div className="form-group">
                  <label>To Month</label>
                  <select
                    value={exp.toMonth}
                    onChange={(e) => handleExperienceChange(index, 'toMonth', e.target.value)}
                  >
                    <option value="">Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Year</label>
                  <input
                    type="text"
                    value={exp.toYear}
                    onChange={(e) => handleExperienceChange(index, 'toYear', e.target.value)}
                    placeholder="Year"
                  />
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input
                    type="text"
                    value={exp.position}
                    onChange={(e) => handleExperienceChange(index, 'position', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addExperience} className="add-button">
            + Add Another Experience
          </button>
        </div>

        {/* Documents */}
        <div className="form-section">
          <h3 className="section-title required">Documents</h3>
          <p className="document-note">
            * Please make sure each file is 4 MB or less (Please upload the files in PDF format). All documents are required.
          </p>

          <div className="form-group">
            <label>Degree / Diploma Certificate(s)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'degreeCertificate')}
            />
          </div>

          <div className="form-group">
            <label>NIC</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'nic')}
            />
          </div>

          <div className="form-group">
            <label>Employer Consent Letter</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'employerLetter')}
            />
          </div>

          <div className="form-group">
            <label>Transcript(s)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'transcript')}
            />
          </div>

          <div className="form-group">
            <label>Payment Confirmation / Bank Receipt</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'paymentConfirmation')}
            />
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

          <div className="captcha-group">
            <label>Enter captcha</label>
            <div className="captcha-display">qzf7ro7</div>
            <input
              type="text"
              name="captcha"
              value={formData.captcha}
              onChange={handleInputChange}
              placeholder="Enter captcha"
              required
            />
          </div>

          <p className="captcha-note">
            Note: If your internet connection is slow, you may receive an error while submitting the form. If so, please try with a different internet 
            connection with a faster speed.
          </p>
        </div>

        <button type="submit" className="submit-button">
          Submit Application
        </button>
      </form>
    </div>
  );
}

export default ApplicationFormPage;
