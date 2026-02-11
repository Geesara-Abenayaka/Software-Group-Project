import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/ApplicationFormPage.css';

function ApplicationFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileError, setMobileError] = useState('');
  const [telephoneError, setTelephoneError] = useState('');
  const [nicError, setNicError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [graduationDateErrors, setGraduationDateErrors] = useState({});
  const [membershipDateErrors, setMembershipDateErrors] = useState({});
  const [fileErrors, setFileErrors] = useState({});
  
  const [formData, setFormData] = useState({
    program: location.state?.program || '',
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

  // Check if program is provided, if not redirect to homepage
  useEffect(() => {
    if (!location.state?.program) {
      alert('Please select a program from the programs page first.');
      navigate('/');
    }
  }, [location.state, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMobileChange = (e) => {
    const value = e.target.value;
    
    // Check if value contains only digits
    if (value && !/^\d*$/.test(value)) {
      setMobileError('Enter valid phone number');
      return; // Don't update the value if it contains non-digits
    }
    
    // Check if length exceeds 10
    if (value.length > 10) {
      return; // Don't allow more than 10 digits
    }
    
    // Update the form data
    setFormData(prev => ({
      ...prev,
      mobile: value
    }));
    
    // Set error state based on length
    if (value.length > 0 && value.length < 10) {
      setMobileError('Mobile number must be exactly 10 digits');
    } else {
      setMobileError(''); // Clear error when exactly 10 digits or empty
    }
  };

  const handleTelephoneChange = (e) => {
    const value = e.target.value;
    
    // Check if value contains only digits
    if (value && !/^\d*$/.test(value)) {
      setTelephoneError('Enter valid phone number');
      return; // Don't update the value if it contains non-digits
    }
    
    // Check if length exceeds 10
    if (value.length > 10) {
      return; // Don't allow more than 10 digits
    }
    
    // Update the form data
    setFormData(prev => ({
      ...prev,
      telephone: value
    }));
    
    // Set error state based on length
    if (value.length > 0 && value.length < 10) {
      setTelephoneError('Telephone number must be exactly 10 digits');
    } else {
      setTelephoneError(''); // Clear error when exactly 10 digits or empty
    }
  };

  const handleNicChange = (e) => {
    const value = e.target.value.toUpperCase();
    
    // Allow only digits and V
    if (value && !/^[0-9V]*$/.test(value)) {
      setNicError('Enter valid NIC number');
      return; // Don't update if invalid characters
    }
    
    // Check length limits
    if (value.length > 12) {
      return; // Don't allow more than 12 characters
    }
    
    // Update the form data
    setFormData(prev => ({
      ...prev,
      nicNo: value
    }));
    
    // Validate NIC format
    if (value.length === 0) {
      setNicError(''); // Clear error when empty
    } else if (value.length === 10 && /^\d{9}V$/.test(value)) {
      setNicError(''); // Valid old format: 9 digits + V
    } else if (value.length === 12 && /^\d{12}$/.test(value)) {
      setNicError(''); // Valid new format: 12 digits
    } else {
      setNicError('Enter valid NIC number (12 digits or 9 digits + V)');
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    
    // Update the form data
    setFormData(prev => ({
      ...prev,
      email: value
    }));
    
    // Email validation regex
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (value.length === 0) {
      setEmailError(''); // Clear error when empty
    } else if (!emailPattern.test(value)) {
      setEmailError('Enter valid email address (e.g., name@gmail.com)');
    } else {
      setEmailError(''); // Clear error when valid
    }
  };

  const handleFileChange = (e, documentType) => {
    const file = e.target.files[0];
    
    if (file) {
      // Check if file is PDF
      if (file.type !== 'application/pdf') {
        setFileErrors(prev => ({
          ...prev,
          [documentType]: 'Please upload a PDF file only'
        }));
        // Clear the file input
        e.target.value = '';
        return;
      }
      
      // Clear error if file is valid
      setFileErrors(prev => {
        const updated = { ...prev };
        delete updated[documentType];
        return updated;
      });
      
      setFormData(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: file
        }
      }));
    }
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

  const removeQualification = (index) => {
    // Keep at least one qualification
    if (formData.qualifications.length <= 1) {
      alert('At least one qualification is required');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
    
    // Also remove the error for this index if it exists
    setGraduationDateErrors(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Adjust remaining error indices
      const adjusted = {};
      Object.keys(updated).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          adjusted[keyIndex - 1] = updated[key];
        } else {
          adjusted[keyIndex] = updated[key];
        }
      });
      return adjusted;
    });
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

  const removeMembership = (index) => {
    // Keep at least one membership
    if (formData.memberships.length <= 1) {
      alert('At least one membership is required');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      memberships: prev.memberships.filter((_, i) => i !== index)
    }));
    
    // Also remove the error for this index if it exists
    setMembershipDateErrors(prev => {
      const updated = { ...prev };
      delete updated[index];
      // Adjust remaining error indices
      const adjusted = {};
      Object.keys(updated).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          adjusted[keyIndex - 1] = updated[key];
        } else {
          adjusted[keyIndex] = updated[key];
        }
      });
      return adjusted;
    });
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

  const removeExperience = (index) => {
    // Keep at least one experience
    if (formData.experiences.length <= 1) {
      alert('At least one work experience is required');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  const handleQualificationChange = (index, field, value) => {
    const updated = [...formData.qualifications];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, qualifications: updated }));
    
    // Validate graduation date if that field is being changed
    if (field === 'graduationDate') {
      validateGraduationDate(value, index);
    }
  };

  const validateGraduationDate = (value, index) => {
    // Clear error first (will be set again if invalid)
    setGraduationDateErrors(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });

    // If empty, error is already cleared
    if (!value) {
      return;
    }
    
    // Validate mm/dd/yyyy format
    const datePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    
    if (!datePattern.test(value)) {
      setGraduationDateErrors(prev => ({
        ...prev,
        [index]: 'Enter valid graduation date (mm/dd/yyyy)'
      }));
      return;
    }
    
    // Additional validation: check if date is valid
    const [month, day, year] = value.split('/');
    const date = new Date(year, month - 1, day);
    
    if (date.getMonth() + 1 !== parseInt(month) || 
        date.getDate() !== parseInt(day) || 
        date.getFullYear() !== parseInt(year)) {
      setGraduationDateErrors(prev => ({
        ...prev,
        [index]: 'Enter valid graduation date (mm/dd/yyyy)'
      }));
    }
    // If we reach here without setting an error, the error was already cleared at the start
  };

  const handleMembershipChange = (index, field, value) => {
    const updated = [...formData.memberships];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, memberships: updated }));
    
    // Validate date joined if that field is being changed
    if (field === 'dateJoined') {
      validateMembershipDate(value, index);
    }
  };

  const validateMembershipDate = (value, index) => {
    // Clear error first (will be set again if invalid)
    setMembershipDateErrors(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });

    // If empty, error is already cleared
    if (!value) {
      return;
    }
    
    // Validate mm/dd/yyyy format
    const datePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    
    if (!datePattern.test(value)) {
      setMembershipDateErrors(prev => ({
        ...prev,
        [index]: 'Enter valid date (mm/dd/yyyy)'
      }));
      return;
    }
    
    // Additional validation: check if date is valid
    const [month, day, year] = value.split('/');
    const date = new Date(year, month - 1, day);
    
    if (date.getMonth() + 1 !== parseInt(month) || 
        date.getDate() !== parseInt(day) || 
        date.getFullYear() !== parseInt(year)) {
      setMembershipDateErrors(prev => ({
        ...prev,
        [index]: 'Enter valid date (mm/dd/yyyy)'
      }));
    }
    // If we reach here without setting an error, the error was already cleared at the start
  };

  const handleExperienceChange = (index, field, value) => {
    const updated = [...formData.experiences];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, experiences: updated }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate program is selected
    if (!formData.program) {
      alert('Program information is missing. Please go back and select a program.');
      return;
    }
    
    // Validate Personal Particulars - all fields must be filled
    if (!formData.title || !formData.fullName || !formData.nameWithInitials || 
        !formData.nicNo || !formData.telephone || !formData.mobile || 
        !formData.email || !formData.contactAddress) {
      alert('Please fill in all fields in Personal Particulars section. No fields can be left blank.');
      return;
    }
    
    // Validate graduation dates
    const datePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    for (let i = 0; i < formData.qualifications.length; i++) {
      const gradDate = formData.qualifications[i].graduationDate;
      if (gradDate && !datePattern.test(gradDate)) {
        alert('Please enter valid graduation date in mm/dd/yyyy format');
        return;
      }
    }
    
    // Validate membership dates
    for (let i = 0; i < formData.memberships.length; i++) {
      const joinedDate = formData.memberships[i].dateJoined;
      if (joinedDate && !datePattern.test(joinedDate)) {
        alert('Please enter valid date joined in mm/dd/yyyy format for membership');
        return;
      }
    }
    
    // Validate NIC number
    const nicPattern = /^(\d{12}|\d{9}V)$/;
    if (!nicPattern.test(formData.nicNo)) {
      setNicError('Enter valid NIC number (12 digits or 9 digits + V)');
      alert('Please enter a valid NIC number');
      return;
    }
    
    // Validate email
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(formData.email)) {
      setEmailError('Enter valid email address (e.g., name@gmail.com)');
      alert('Please enter a valid email address');
      return;
    }
    
    // Validate mobile number before submission
    if (formData.mobile.length !== 10) {
      setMobileError('Mobile number must be exactly 10 digits');
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    
    // Validate telephone number before submission
    if (formData.telephone.length !== 10) {
      setTelephoneError('Telephone number must be exactly 10 digits');
      alert('Please enter a valid 10-digit telephone number');
      return;
    }
    
    try {
      // Prepare the data to send (convert files to base64 if needed, or handle separately)
      const dataToSend = {
        ...formData,
        documents: {
          degreeCertificate: formData.documents.degreeCertificate?.name || '',
          nic: formData.documents.nic?.name || '',
          employerLetter: formData.documents.employerLetter?.name || '',
          transcript: formData.documents.transcript?.name || '',
          paymentConfirmation: formData.documents.paymentConfirmation?.name || ''
        }
      };

      const response = await fetch('http://localhost:5000/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      const result = await response.json();

      if (result.success) {
        alert('Application submitted successfully!');
        // Reset form or navigate to success page
        navigate('/');
      } else {
        alert('Failed to submit application: ' + result.message);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Error submitting application. Please try again.');
    }
  };

  return (
    <div className="application-form-page">
      <div className="form-header">
        <h1>UNIVERSITY OF MORATUWA</h1>
        <h2>FACULTY OF ENGINEERING</h2>
        <p>DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING</p>
        <h3>APPLICATION FOR POSTGRADUATE STUDIES</h3>
        {location.state?.programName && (
          <p style={{ marginTop: '10px', fontSize: '16px', fontWeight: '600' }}>
            Program: {location.state.programName}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="application-form">
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
              required
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
              required
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
                required
              />
            </div>
            <div className="form-group">
              <label>NIC No</label>
              <input
                type="text"
                name="nicNo"
                value={formData.nicNo}
                onChange={handleNicChange}
                placeholder="123456789V or 200012345678"
                required
                className={nicError ? 'input-error' : ''}
              />
              {nicError && (
                <div className="error-box">
                  <span className="error-icon">⚠</span>
                  <span className="error-text">{nicError}</span>
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Telephone</label>
              <input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleTelephoneChange}
                placeholder="0112345678"
                required
                className={telephoneError ? 'input-error' : ''}
              />
              {telephoneError && (
                <div className="error-box">
                  <span className="error-icon">⚠</span>
                  <span className="error-text">{telephoneError}</span>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Mobile</label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleMobileChange}
                placeholder="0771234567"
                required
                className={mobileError ? 'input-error' : ''}
              />
              {mobileError && (
                <div className="error-box">
                  <span className="error-icon">⚠</span>
                  <span className="error-text">{mobileError}</span>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleEmailChange}
              placeholder="name@gmail.com"
              required
              className={emailError ? 'input-error' : ''}
            />
            {emailError && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{emailError}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Contact Address</label>
            <textarea
              name="contactAddress"
              value={formData.contactAddress}
              onChange={handleInputChange}
              rows="3"
              required
            />
          </div>
        </div>

        {/* Academic Qualifications */}
        <div className="form-section">
          <h3 className="section-title">Academic Qualifications</h3>
          
          {formData.qualifications.map((qual, index) => (
            <div key={index} className="qualification-item">
              {formData.qualifications.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removeQualification(index)}
                  className="delete-button"
                  title="Remove this qualification"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.5 2.5V3h5v-.5a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.5zm-1 0V3H2v1h1v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4h1V3h-2.5v-.5A1.5 1.5 0 0 0 10 1H6a1.5 1.5 0 0 0-1.5 1.5zM4 4h8v9H4V4zm1.5 1.5v6h1v-6h-1zm3 0v6h1v-6h-1z"/>
                  </svg>
                </button>
              )}
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
                  <div className="date-input-wrapper">
                    <input
                      type="text"
                      value={qual.graduationDate}
                      onChange={(e) => handleQualificationChange(index, 'graduationDate', e.target.value)}
                      placeholder="mm/dd/yyyy"
                      className={graduationDateErrors[index] ? 'input-error' : ''}
                    />
                    <label className="calendar-icon-label">
                      <input
                        type="date"
                        className="date-picker-hidden"
                        onChange={(e) => {
                          if (e.target.value) {
                            const [year, month, day] = e.target.value.split('-');
                            const formattedDate = `${month}/${day}/${year}`;
                            handleQualificationChange(index, 'graduationDate', formattedDate);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {graduationDateErrors[index] && (
                    <div className="error-box">
                      <span className="error-icon">⚠</span>
                      <span className="error-text">{graduationDateErrors[index]}</span>
                    </div>
                  )}
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
              {formData.memberships.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removeMembership(index)}
                  className="delete-button"
                  title="Remove this membership"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.5 2.5V3h5v-.5a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.5zm-1 0V3H2v1h1v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4h1V3h-2.5v-.5A1.5 1.5 0 0 0 10 1H6a1.5 1.5 0 0 0-1.5 1.5zM4 4h8v9H4V4zm1.5 1.5v6h1v-6h-1zm3 0v6h1v-6h-1z"/>
                  </svg>
                </button>
              )}
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
                  <div className="date-input-wrapper">
                    <input
                      type="text"
                      value={membership.dateJoined}
                      onChange={(e) => handleMembershipChange(index, 'dateJoined', e.target.value)}
                      placeholder="mm/dd/yyyy"
                      className={membershipDateErrors[index] ? 'input-error' : ''}
                    />
                    <label className="calendar-icon-label">
                      <input
                        type="date"
                        className="date-picker-hidden"
                        onChange={(e) => {
                          if (e.target.value) {
                            const [year, month, day] = e.target.value.split('-');
                            const formattedDate = `${month}/${day}/${year}`;
                            handleMembershipChange(index, 'dateJoined', formattedDate);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {membershipDateErrors[index] && (
                    <div className="error-box">
                      <span className="error-icon">⚠</span>
                      <span className="error-text">{membershipDateErrors[index]}</span>
                    </div>
                  )}
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
              {formData.experiences.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removeExperience(index)}
                  className="delete-button"
                  title="Remove this experience"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.5 2.5V3h5v-.5a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.5zm-1 0V3H2v1h1v9a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4h1V3h-2.5v-.5A1.5 1.5 0 0 0 10 1H6a1.5 1.5 0 0 0-1.5 1.5zM4 4h8v9H4V4zm1.5 1.5v6h1v-6h-1zm3 0v6h1v-6h-1z"/>
                  </svg>
                </button>
              )}
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
            {fileErrors.degreeCertificate && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{fileErrors.degreeCertificate}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>NIC</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'nic')}
            />
            {fileErrors.nic && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{fileErrors.nic}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Employer Consent Letter</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'employerLetter')}
            />
            {fileErrors.employerLetter && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{fileErrors.employerLetter}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Transcript(s)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'transcript')}
            />
            {fileErrors.transcript && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{fileErrors.transcript}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Payment Confirmation / Bank Receipt</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'paymentConfirmation')}
            />
            {fileErrors.paymentConfirmation && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{fileErrors.paymentConfirmation}</span>
              </div>
            )}
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
