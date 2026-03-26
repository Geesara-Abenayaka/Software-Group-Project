import { useState, useEffect, useRef } from 'react';
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
  const [documentVerification, setDocumentVerification] = useState({
    name: { status: 'idle', message: '' },
    nic: { status: 'idle', message: '' },
    degreeCertificate: { status: 'idle', message: '' },
    isVerifying: false,
    error: ''
  });
  const [membershipExtraction, setMembershipExtraction] = useState({
    status: 'idle',
    message: '',
    extractedMemberships: []
  });
  const [workExperienceVerification, setWorkExperienceVerification] = useState({
    status: 'idle',
    message: '',
    extracted: { companies: [], positions: [], dateRanges: [] }
  });
  const [paymentReceiptVerification, setPaymentReceiptVerification] = useState({
    status: 'idle',
    message: '',
    extracted: { accountNumbers: [], amounts: [], requiredAccountNumber: '0043618', requiredFee: 2000 }
  });
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState('submitting');
  const [submissionMessage, setSubmissionMessage] = useState('Your application is submitting...');
  const autoVerificationKeyRef = useRef('');
  const membershipExtractionKeyRef = useRef('');
  const workExperienceVerificationKeyRef = useRef('');
  const paymentReceiptVerificationKeyRef = useRef('');
  const degreeInputRef = useRef(null);
  const nicInputRef = useRef(null);
  const membershipProofInputRef = useRef(null);
  const employerLetterInputRef = useRef(null);
  const transcriptInputRef = useRef(null);
  const paymentConfirmationInputRef = useRef(null);
  const qualificationsSectionRef = useRef(null);
  const membershipsSectionRef = useRef(null);
  const experiencesSectionRef = useRef(null);
  const documentsSectionRef = useRef(null);
  const declarationSectionRef = useRef(null);
  const captchaInputRef = useRef(null);
  
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
      degreeCertificate: [],
      membershipProofs: [],
      nic: null,
      employerLetter: [],
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

  const resetDocumentVerification = (documentType) => {
    setDocumentVerification((prev) => ({
      ...prev,
      [documentType]: { status: 'idle', message: '' },
      error: ''
    }));
  };

  const resetNameAndDegreeVerification = () => {
    setDocumentVerification((prev) => ({
      ...prev,
      name: { status: 'idle', message: '' },
      degreeCertificate: { status: 'idle', message: '' },
      error: ''
    }));
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read uploaded file'));
      reader.readAsDataURL(file);
    });
  };

  const triggerFilePicker = (inputRef) => {
    inputRef?.current?.click();
  };

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let next = '';
    for (let i = 0; i < 7; i += 1) {
      next += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaValue(next);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'captcha') {
      setCaptchaError('');
    }

    if (name === 'fullName' || name === 'nameWithInitials') {
      resetNameAndDegreeVerification();
    }
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

    resetDocumentVerification('nic');
    
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
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length > 0) {
      const supportsImages = documentType === 'nic' || documentType === 'degreeCertificate' || documentType === 'membershipProofs' || documentType === 'employerLetter' || documentType === 'paymentConfirmation';
      const supportsMultiple = documentType === 'degreeCertificate' || documentType === 'membershipProofs' || documentType === 'employerLetter';
      const allowedMimeTypes = supportsImages
        ? ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']
        : ['application/pdf'];

      for (const file of selectedFiles) {
        if (!allowedMimeTypes.includes(file.type)) {
          setFileErrors(prev => ({
            ...prev,
            [documentType]: supportsImages
              ? 'Please upload a PDF or image file (PNG/JPG/WEBP)'
              : 'Please upload a PDF file only'
          }));
          e.target.value = '';
          return;
        }

        if (file.size > 4 * 1024 * 1024) {
          setFileErrors(prev => ({
            ...prev,
            [documentType]: 'Each file must be 4 MB or less'
          }));
          e.target.value = '';
          return;
        }
      }
      
      // Clear error if file is valid
      setFileErrors(prev => {
        const updated = { ...prev };
        delete updated[documentType];
        return updated;
      });
      
      setFormData(prev => {
        const existingValue = prev.documents[documentType];
        const existingFiles = Array.isArray(existingValue)
          ? existingValue
          : existingValue
            ? [existingValue]
            : [];

        const nextValue = supportsMultiple
          ? [...existingFiles, ...selectedFiles].filter((file, index, all) => {
            const duplicateIndex = all.findIndex((candidate) => (
              candidate.name === file.name
              && candidate.size === file.size
              && candidate.lastModified === file.lastModified
            ));
            return duplicateIndex === index;
          })
          : selectedFiles[0];

        return {
          ...prev,
          documents: {
            ...prev.documents,
            [documentType]: nextValue
          }
        };
      });

      // For multi-file inputs, clear picker so users can append more files.
      // Keep single-file input value so the native control shows the selected file name.
      if (supportsMultiple) {
        e.target.value = '';
      }

      if (documentType === 'degreeCertificate') {
        resetNameAndDegreeVerification();
      }

      if (documentType === 'nic') {
        resetDocumentVerification('nic');
      }

      if (documentType === 'membershipProofs') {
        setMembershipExtraction({ status: 'idle', message: '', extractedMemberships: [] });
      }

      if (documentType === 'employerLetter') {
        setWorkExperienceVerification({ status: 'idle', message: '', extracted: { companies: [], positions: [], dateRanges: [] } });
      }

      if (documentType === 'paymentConfirmation') {
        setPaymentReceiptVerification({
          status: 'idle',
          message: '',
          extracted: { accountNumbers: [], amounts: [], requiredAccountNumber: '0043618', requiredFee: 2000 }
        });
      }
    }
  };

  const removeDegreeFile = (indexToRemove) => {
    setFormData((prev) => {
      const existingFiles = Array.isArray(prev.documents.degreeCertificate)
        ? prev.documents.degreeCertificate
        : [];

      return {
        ...prev,
        documents: {
          ...prev.documents,
          degreeCertificate: existingFiles.filter((_, index) => index !== indexToRemove)
        }
      };
    });

    resetNameAndDegreeVerification();
  };

  const removeNicFile = () => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        nic: null
      }
    }));

    resetDocumentVerification('nic');
  };

  const removeEmployerLetterFile = (indexToRemove) => {
    setFormData((prev) => {
      const existingFiles = Array.isArray(prev.documents.employerLetter)
        ? prev.documents.employerLetter
        : prev.documents.employerLetter
          ? [prev.documents.employerLetter]
          : [];

      return {
        ...prev,
        documents: {
          ...prev.documents,
          employerLetter: existingFiles.filter((_, index) => index !== indexToRemove)
        }
      };
    });

    setWorkExperienceVerification({ status: 'idle', message: '', extracted: { companies: [], positions: [], dateRanges: [] } });
  };


  const removeMembershipProofFile = (indexToRemove) => {
    setFormData((prev) => {
      const existingFiles = Array.isArray(prev.documents.membershipProofs)
        ? prev.documents.membershipProofs
        : [];

      return {
        ...prev,
        documents: {
          ...prev.documents,
          membershipProofs: existingFiles.filter((_, index) => index !== indexToRemove)
        }
      };
    });

    setMembershipExtraction({ status: 'idle', message: '', extractedMemberships: [] });
  };

  const removeTranscriptFile = () => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        transcript: null
      }
    }));
  };

  const removePaymentConfirmationFile = () => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        paymentConfirmation: null
      }
    }));

    setPaymentReceiptVerification({
      status: 'idle',
      message: '',
      extracted: { accountNumbers: [], amounts: [], requiredAccountNumber: '0043618', requiredFee: 2000 }
    });
  };

  const verifyPaymentReceiptDocument = async () => {
    const paymentFile = formData.documents.paymentConfirmation;

    if (!paymentFile) {
      setPaymentReceiptVerification({
        status: 'idle',
        message: '',
        extracted: { accountNumbers: [], amounts: [], requiredAccountNumber: '0043618', requiredFee: 2000 }
      });
      return true;
    }

    try {
      setPaymentReceiptVerification({
        status: 'loading',
        message: 'Verifying payment receipt details... ',
        extracted: { accountNumbers: [], amounts: [], requiredAccountNumber: '0043618', requiredFee: 2000 }
      });

      const paymentDocument = {
        name: paymentFile.name,
        mimeType: paymentFile.type,
        contentBase64: await readFileAsBase64(paymentFile)
      };

      const response = await fetch('http://localhost:5000/api/applications/verify-payment-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentDocument })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.error || result.message || 'Failed to verify payment receipt.';
        setPaymentReceiptVerification({
          status: 'failed',
          message,
          extracted: { accountNumbers: [], amounts: [], requiredAccountNumber: '0043618', requiredFee: 2000 }
        });
        return false;
      }

      const verified = Boolean(result.data?.verified);
      const extracted = {
        accountNumbers: Array.isArray(result.data?.extracted?.accountNumbers) ? result.data.extracted.accountNumbers : [],
        amounts: Array.isArray(result.data?.extracted?.amounts) ? result.data.extracted.amounts : [],
        requiredAccountNumber: result.data?.extracted?.requiredAccountNumber || '0043618',
        requiredFee: result.data?.extracted?.requiredFee || 2000
      };

      setPaymentReceiptVerification({
        status: verified ? 'verified' : 'failed',
        message: result.data?.reason || (verified
          ? 'Payment receipt matched required account number and fee.'
          : 'Payment receipt did not match required account number and fee.'),
        extracted
      });

      return verified;
    } catch (error) {
      setPaymentReceiptVerification({
        status: 'failed',
        message: 'Unexpected error while verifying payment receipt.',
        extracted: { accountNumbers: [], amounts: [], requiredAccountNumber: '0043618', requiredFee: 2000 }
      });
      return false;
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

    resetNameAndDegreeVerification();
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

    resetNameAndDegreeVerification();
    
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

    if (['university', 'degree', 'specialization', 'graduationDate'].includes(field)) {
      resetNameAndDegreeVerification();
    }
    
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

    setWorkExperienceVerification({ status: 'idle', message: '', extracted: { companies: [], positions: [], dateRanges: [] } });
  };

  const verifyNicAndDegreeDocuments = async () => {
    const { nic, degreeCertificate } = formData.documents;
    const primaryQualification = formData.qualifications?.[0] || {};
    const degreeFiles = Array.isArray(degreeCertificate)
      ? degreeCertificate.filter(Boolean)
      : degreeCertificate
        ? [degreeCertificate]
        : [];

    if (!nic || degreeFiles.length === 0) {
      setDocumentVerification((prev) => ({
        ...prev,
        error: 'Please upload both NIC and Degree/Diploma files before verification.'
      }));
      return false;
    }

    if (!formData.nicNo || !formData.fullName) {
      setDocumentVerification((prev) => ({
        ...prev,
        error: 'Please fill NIC No and Full Name before verification.'
      }));
      return false;
    }

    if (!primaryQualification.university || !primaryQualification.degree) {
      setDocumentVerification((prev) => ({
        ...prev,
        error: 'Please complete Academic Qualifications (University and Degree) before degree verification.'
      }));
      return false;
    }

    try {
      setDocumentVerification((prev) => ({
        ...prev,
        isVerifying: true,
        error: ''
      }));

      const nicContentBase64 = await readFileAsBase64(nic);
      const degreeDocuments = await Promise.all(
        degreeFiles.map(async (file) => ({
          name: file.name,
          mimeType: file.type,
          contentBase64: await readFileAsBase64(file)
        }))
      );

      const response = await fetch('http://localhost:5000/api/applications/verify-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          nameWithInitials: formData.nameWithInitials,
          nicNo: formData.nicNo,
          qualifications: formData.qualifications,
          nicDocument: {
            name: nic.name,
            mimeType: nic.type,
            contentBase64: nicContentBase64
          },
          degreeDocuments
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.error || result.message || 'Document verification failed.';
        setDocumentVerification((prev) => ({
          ...prev,
          isVerifying: false,
          error: message,
          name: { status: 'failed', message: message },
          nic: { status: 'failed', message: message },
          degreeCertificate: { status: 'failed', message: message }
        }));
        return false;
      }

      const nicResult = result.data?.nic || { verified: false, reason: 'NIC verification failed.' };
      const degreeResult = result.data?.degreeCertificate || { verified: false, reason: 'Degree verification failed.' };
      const nameResult = result.data?.name || { verified: false, reason: 'Name verification failed.' };

      setDocumentVerification((prev) => ({
        ...prev,
        isVerifying: false,
        error: '',
        name: {
          status: nameResult.verified ? 'verified' : 'failed',
          message: nameResult.reason
        },
        nic: {
          status: nicResult.verified ? 'verified' : 'failed',
          message: nicResult.reason
        },
        degreeCertificate: {
          status: degreeResult.verified ? 'verified' : 'failed',
          message: degreeResult.reason
        }
      }));

      return nicResult.verified && degreeResult.verified;
    } catch (error) {
      setDocumentVerification((prev) => ({
        ...prev,
        isVerifying: false,
        error: 'Unexpected error while verifying documents. Please try again.',
        name: { status: 'failed', message: 'Verification request failed.' },
        nic: { status: 'failed', message: 'Verification request failed.' },
        degreeCertificate: { status: 'failed', message: 'Verification request failed.' }
      }));
      return false;
    }
  };

  const normalizeMembershipText = (value = '') => String(value).trim().toLowerCase().replace(/\s+/g, ' ');

  const normalizeMembershipDate = (value = '') => {
    const raw = String(value).trim();
    if (!raw) {
      return '';
    }

    const mmDdYyyy = raw.match(/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d{2}$/);
    if (mmDdYyyy) {
      return raw;
    }

    const yyyyMmDd = raw.match(/^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/);
    if (yyyyMmDd) {
      const [year, month, day] = raw.split('-');
      return `${month}/${day}/${year}`;
    }

    const monthNameDate = raw.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-9]{1,2}),\s*((?:19|20)\d{2})$/i);
    if (monthNameDate) {
      const monthMap = {
        january: '01',
        february: '02',
        march: '03',
        april: '04',
        may: '05',
        june: '06',
        july: '07',
        august: '08',
        september: '09',
        october: '10',
        november: '11',
        december: '12'
      };

      const month = monthMap[String(monthNameDate[1]).toLowerCase()] || '';
      const day = String(monthNameDate[2]).padStart(2, '0');
      const year = monthNameDate[3];

      if (month) {
        return `${month}/${day}/${year}`;
      }
    }

    return normalizeMembershipText(raw);
  };

  const evaluateMembershipMatches = (filledMemberships = [], extractedMemberships = []) => {
    const filledRows = filledMemberships
      .map((membership) => ({
        organization: String(membership?.organization || '').trim(),
        category: String(membership?.category || '').trim(),
        dateJoined: String(membership?.dateJoined || '').trim()
      }))
      .filter((membership) => membership.organization || membership.category || membership.dateJoined);

    if (extractedMemberships.length === 0) {
      return {
        status: 'failed',
        message: 'No membership details could be extracted from uploaded file(s).'
      };
    }

    if (filledRows.length === 0) {
      return {
        status: 'failed',
        message: 'Membership details extracted, but no filled membership details found to validate.'
      };
    }

    const unmatchedRows = filledRows.filter((filledMembership) => {
      return !extractedMemberships.some((extractedMembership) => {
        const filledOrganization = normalizeMembershipText(filledMembership.organization);
        const extractedOrganization = normalizeMembershipText(extractedMembership.organization);
        const filledCategory = normalizeMembershipText(filledMembership.category);
        const extractedCategory = normalizeMembershipText(extractedMembership.category);

        const organizationMatch = filledMembership.organization
          ? (
            filledOrganization === extractedOrganization
            || filledOrganization.includes(extractedOrganization)
            || extractedOrganization.includes(filledOrganization)
          )
          : true;
        const categoryMatch = filledMembership.category
          ? (
            filledCategory === extractedCategory
            || filledCategory.includes(extractedCategory)
            || extractedCategory.includes(filledCategory)
          )
          : true;
        const dateMatch = filledMembership.dateJoined
          ? normalizeMembershipDate(filledMembership.dateJoined) === normalizeMembershipDate(extractedMembership.dateJoined)
          : true;

        return organizationMatch && categoryMatch && dateMatch;
      });
    });

    if (unmatchedRows.length > 0) {
      return {
        status: 'failed',
        message: `${unmatchedRows.length} membership record(s) do not match extracted details.`
      };
    }

    return {
      status: 'verified',
      message: `Membership details matched with ${extractedMemberships.length} extracted record(s).`
    };
  };

  const extractMembershipFromDocuments = async (membershipFiles) => {
    if (!Array.isArray(membershipFiles) || membershipFiles.length === 0) {
      setMembershipExtraction({ status: 'idle', message: '', extractedMemberships: [] });
      return;
    }

    try {
      setMembershipExtraction({ status: 'loading', message: 'Extracting membership details...' });

      const membershipDocuments = await Promise.all(
        membershipFiles.map(async (file) => ({
          name: file.name,
          mimeType: file.type,
          contentBase64: await readFileAsBase64(file)
        }))
      );

      const response = await fetch('http://localhost:5000/api/applications/extract-memberships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ membershipDocuments })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.error || result.message || 'Failed to extract membership details.';
        setMembershipExtraction({ status: 'failed', message, extractedMemberships: [] });
        return;
      }

      const extractedMemberships = Array.isArray(result.data?.memberships)
        ? result.data.memberships
        : [];

      const matchResult = evaluateMembershipMatches(formData.memberships, extractedMemberships);

      setMembershipExtraction({
        status: matchResult.status,
        message: matchResult.message,
        extractedMemberships
      });
    } catch (error) {
      setMembershipExtraction({
        status: 'failed',
        message: 'Unexpected error while extracting membership details.',
        extractedMemberships: []
      });
    }
  };

  const getFilledExperienceRows = (experiences = []) => {
    return experiences.filter((experience) => (
      experience.fromMonth
      || experience.fromYear
      || experience.toMonth
      || experience.toYear
      || String(experience.company || '').trim()
      || String(experience.position || '').trim()
    ));
  };

  const verifyWorkExperienceWithEmployerLetter = async () => {
    const employerFiles = Array.isArray(formData.documents.employerLetter)
      ? formData.documents.employerLetter.filter(Boolean)
      : formData.documents.employerLetter
        ? [formData.documents.employerLetter]
        : [];
    const filledExperienceRows = getFilledExperienceRows(formData.experiences);

    if (employerFiles.length === 0 || filledExperienceRows.length === 0) {
      setWorkExperienceVerification({ status: 'idle', message: '', extracted: { companies: [], positions: [], dateRanges: [] } });
      return true;
    }

    try {
      setWorkExperienceVerification({
        status: 'loading',
        message: 'Verifying work experience with employer letter...',
        extracted: { companies: [], positions: [], dateRanges: [] }
      });

      const employerDocuments = await Promise.all(
        employerFiles.map(async (file) => ({
          name: file.name,
          mimeType: file.type,
          contentBase64: await readFileAsBase64(file)
        }))
      );

      const response = await fetch('http://localhost:5000/api/applications/extract-work-experience', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employerDocuments,
          experiences: filledExperienceRows
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.error || result.message || 'Failed to validate work experience.';
        setWorkExperienceVerification({ status: 'failed', message, extracted: { companies: [], positions: [], dateRanges: [] } });
        return false;
      }

      const verified = Boolean(result.data?.verified);
      const rowMismatches = Array.isArray(result.data?.rows)
        ? result.data.rows.filter((row) => !row.verified)
        : [];

      const mismatchMessage = rowMismatches.length > 0
        ? rowMismatches.map((row) => `Row ${Number(row.index) + 1}: ${row.reason}`).join(' | ')
        : '';

      const extractedCompanies = Array.isArray(result.data?.extracted?.companies)
        ? result.data.extracted.companies.length
        : 0;
      const extractedPositions = Array.isArray(result.data?.extracted?.positions)
        ? result.data.extracted.positions.length
        : 0;
      const extractedRanges = Array.isArray(result.data?.extracted?.dateRanges)
        ? result.data.extracted.dateRanges.length
        : 0;

      const extractionSummary = `Extracted: ${extractedCompanies} company(s), ${extractedPositions} position(s), ${extractedRanges} date range(s).`;

      const matchedSummary = `Work experience details (company, position, and date range) matched with extracted employer letter details (${filledExperienceRows.length} record(s)).`;

      const message = verified
        ? `${matchedSummary} ${extractionSummary}`
        : `${result.data?.reason || 'Work experience does not match employer letter.'}${mismatchMessage ? ` ${mismatchMessage}` : ''} ${extractionSummary}`;

      setWorkExperienceVerification({
        status: verified ? 'verified' : 'failed',
        message,
        extracted: {
          companies: Array.isArray(result.data?.extracted?.companies) ? result.data.extracted.companies : [],
          positions: Array.isArray(result.data?.extracted?.positions) ? result.data.extracted.positions : [],
          dateRanges: Array.isArray(result.data?.extracted?.dateRanges) ? result.data.extracted.dateRanges : []
        }
      });

      return verified;
    } catch (error) {
      setWorkExperienceVerification({
        status: 'failed',
        message: 'Unexpected error while verifying work experience.',
        extracted: { companies: [], positions: [], dateRanges: [] }
      });
      return false;
    }
  };

  useEffect(() => {
    const membershipFiles = Array.isArray(formData.documents.membershipProofs)
      ? formData.documents.membershipProofs.filter(Boolean)
      : [];

    if (membershipFiles.length === 0) {
      membershipExtractionKeyRef.current = '';
      return;
    }

    const membershipFilesKey = membershipFiles
      .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
      .join('|');

    if (membershipExtraction.status === 'loading' || membershipExtractionKeyRef.current === membershipFilesKey) {
      return;
    }

    const timer = setTimeout(() => {
      membershipExtractionKeyRef.current = membershipFilesKey;
      extractMembershipFromDocuments(membershipFiles);
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.documents.membershipProofs, membershipExtraction.status]);

  useEffect(() => {
    const employerFiles = Array.isArray(formData.documents.employerLetter)
      ? formData.documents.employerLetter.filter(Boolean)
      : formData.documents.employerLetter
        ? [formData.documents.employerLetter]
        : [];
    const filledExperienceRows = getFilledExperienceRows(formData.experiences);

    if (employerFiles.length === 0 || filledExperienceRows.length === 0) {
      workExperienceVerificationKeyRef.current = '';
      return;
    }

    const key = [
      employerFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join('|'),
      filledExperienceRows
        .map((experience) => [
          experience.fromMonth,
          experience.fromYear,
          experience.toMonth,
          experience.toYear,
          String(experience.company || '').trim(),
          String(experience.position || '').trim()
        ].join('|'))
        .join('||')
    ].join('::');

    if (workExperienceVerification.status === 'loading' || workExperienceVerificationKeyRef.current === key) {
      return;
    }

    const timer = setTimeout(() => {
      workExperienceVerificationKeyRef.current = key;
      verifyWorkExperienceWithEmployerLetter();
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.documents.employerLetter, formData.experiences, workExperienceVerification.status]);

  useEffect(() => {
    const paymentFile = formData.documents.paymentConfirmation;

    if (!paymentFile) {
      paymentReceiptVerificationKeyRef.current = '';
      return;
    }

    const key = `${paymentFile.name}:${paymentFile.size}:${paymentFile.lastModified}`;

    if (paymentReceiptVerification.status === 'loading' || paymentReceiptVerificationKeyRef.current === key) {
      return;
    }

    const timer = setTimeout(() => {
      paymentReceiptVerificationKeyRef.current = key;
      verifyPaymentReceiptDocument();
    }, 300);

    return () => clearTimeout(timer);
  }, [formData.documents.paymentConfirmation, paymentReceiptVerification.status]);

  useEffect(() => {
    if (!Array.isArray(membershipExtraction.extractedMemberships) || membershipExtraction.extractedMemberships.length === 0) {
      return;
    }

    const matchResult = evaluateMembershipMatches(formData.memberships, membershipExtraction.extractedMemberships);

    setMembershipExtraction((prev) => {
      if (prev.status === matchResult.status && prev.message === matchResult.message) {
        return prev;
      }

      return {
        ...prev,
        status: matchResult.status,
        message: matchResult.message
      };
    });
  }, [formData.memberships, membershipExtraction.extractedMemberships]);

  useEffect(() => {
    const degreeFiles = Array.isArray(formData.documents.degreeCertificate)
      ? formData.documents.degreeCertificate.filter(Boolean)
      : formData.documents.degreeCertificate
        ? [formData.documents.degreeCertificate]
        : [];

    const isReadyForVerification =
      Boolean(formData.documents.nic)
      && degreeFiles.length > 0
      && Boolean(formData.nicNo?.trim())
      && Boolean(formData.fullName?.trim())
      && formData.qualifications.some((qualification) => qualification.university && qualification.degree);

    if (!isReadyForVerification) {
      autoVerificationKeyRef.current = '';
      return;
    }

    const qualificationKey = formData.qualifications
      .map((qualification) => [
        qualification.university,
        qualification.degree,
        qualification.specialization,
        qualification.graduationDate
      ].join('|'))
      .join('||');

    const degreeFileKey = degreeFiles
      .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
      .join('|');

    const nicFile = formData.documents.nic;
    const verificationKey = [
      formData.nicNo,
      formData.fullName,
      formData.nameWithInitials,
      qualificationKey,
      nicFile ? `${nicFile.name}:${nicFile.size}:${nicFile.lastModified}` : '',
      degreeFileKey
    ].join('::');

    if (autoVerificationKeyRef.current === verificationKey || documentVerification.isVerifying) {
      return;
    }

    const timer = setTimeout(() => {
      autoVerificationKeyRef.current = verificationKey;
      verifyNicAndDegreeDocuments();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    formData.documents.nic,
    formData.documents.degreeCertificate,
    formData.nicNo,
    formData.fullName,
    formData.nameWithInitials,
    formData.qualifications,
    documentVerification.isVerifying
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const focusField = (selector) => {
      const element = document.querySelector(selector);
      if (element && typeof element.focus === 'function') {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const scrollToSection = (sectionRef) => {
      sectionRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Show loader immediately so long verification/preparation steps are visible to users.
    setIsSubmitting(true);
    setSubmissionStatus('submitting');
    setSubmissionMessage('Your application is submitting...');
    await new Promise((resolve) => setTimeout(resolve, 0));
    let keepModalVisibleForRedirect = false;

    const showSubmissionModalError = async (message) => {
      setSubmissionStatus('error');
      setSubmissionMessage(message);
      await new Promise((resolve) => setTimeout(resolve, 2200));
    };

    try {

    // Validate program is selected
    if (!formData.program) {
      await showSubmissionModalError('Program information is missing. Please go back and select a program.');
      return;
    }

    const requiredPersonalFields = [
      { key: 'title', selector: 'select[name="title"]', label: 'Title' },
      { key: 'fullName', selector: 'input[name="fullName"]', label: 'Full Name' },
      { key: 'nameWithInitials', selector: 'input[name="nameWithInitials"]', label: 'Name with initials' },
      { key: 'nicNo', selector: 'input[name="nicNo"]', label: 'NIC number' },
      { key: 'telephone', selector: 'input[name="telephone"]', label: 'Telephone number' },
      { key: 'mobile', selector: 'input[name="mobile"]', label: 'Mobile number' },
      { key: 'email', selector: 'input[name="email"]', label: 'Email address' },
      { key: 'contactAddress', selector: 'input[name="contactAddress"]', label: 'Contact address' }
    ];

    for (const field of requiredPersonalFields) {
      if (!String(formData[field.key] || '').trim()) {
        await showSubmissionModalError(`Please fill ${field.label}.`);
        focusField(field.selector);
        return;
      }
    }
    
    // Validate Personal Particulars - all fields must be filled
    if (!formData.title || !formData.fullName || !formData.nameWithInitials || 
        !formData.nicNo || !formData.telephone || !formData.mobile || 
        !formData.email || !formData.contactAddress) {
      await showSubmissionModalError('Please fill in all fields in Personal Particulars section. No fields can be left blank.');
      return;
    }

    for (let i = 0; i < formData.qualifications.length; i += 1) {
      const qualification = formData.qualifications[i];
      if (!qualification.university || !qualification.degree || !qualification.specialization || !qualification.duration || !qualification.graduationDate) {
        await showSubmissionModalError(`Please complete all fields in Academic Qualification ${i + 1}.`);
        scrollToSection(qualificationsSectionRef);
        return;
      }
    }

    for (let i = 0; i < formData.memberships.length; i += 1) {
      const membership = formData.memberships[i];
      if (!membership.organization || !membership.category || !membership.dateJoined) {
        await showSubmissionModalError(`Please complete all fields in Membership ${i + 1}.`);
        scrollToSection(membershipsSectionRef);
        return;
      }
    }

    for (let i = 0; i < formData.experiences.length; i += 1) {
      const experience = formData.experiences[i];
      if (!experience.fromMonth || !experience.fromYear || !experience.toMonth || !experience.toYear || !experience.company || !experience.position) {
        await showSubmissionModalError(`Please complete all fields in Work Experience ${i + 1}.`);
        scrollToSection(experiencesSectionRef);
        return;
      }
    }

    const hasAllRequiredDocuments =
      (Array.isArray(formData.documents.degreeCertificate) && formData.documents.degreeCertificate.length > 0)
      && Boolean(formData.documents.nic)
      && (Array.isArray(formData.documents.membershipProofs) && formData.documents.membershipProofs.length > 0)
      && (Array.isArray(formData.documents.employerLetter) && formData.documents.employerLetter.length > 0)
      && Boolean(formData.documents.transcript)
      && Boolean(formData.documents.paymentConfirmation);

    if (!hasAllRequiredDocuments) {
      await showSubmissionModalError('Please upload all required documents before submitting.');
      scrollToSection(documentsSectionRef);
      return;
    }
    
    // Validate graduation dates
    const datePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    for (let i = 0; i < formData.qualifications.length; i++) {
      const gradDate = formData.qualifications[i].graduationDate;
      if (gradDate && !datePattern.test(gradDate)) {
        await showSubmissionModalError('Please enter valid graduation date in mm/dd/yyyy format');
        return;
      }
    }
    
    // Validate membership dates
    for (let i = 0; i < formData.memberships.length; i++) {
      const joinedDate = formData.memberships[i].dateJoined;
      if (joinedDate && !datePattern.test(joinedDate)) {
        await showSubmissionModalError('Please enter valid date joined in mm/dd/yyyy format for membership');
        return;
      }
    }
    
    // Validate NIC number
    const nicPattern = /^(\d{12}|\d{9}V)$/;
    if (!nicPattern.test(formData.nicNo)) {
      setNicError('Enter valid NIC number (12 digits or 9 digits + V)');
      await showSubmissionModalError('Please enter a valid NIC number');
      return;
    }
    
    // Validate email
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(formData.email)) {
      setEmailError('Enter valid email address (e.g., name@gmail.com)');
      await showSubmissionModalError('Please enter a valid email address');
      return;
    }
    
    // Validate mobile number before submission
    if (formData.mobile.length !== 10) {
      setMobileError('Mobile number must be exactly 10 digits');
      await showSubmissionModalError('Please enter a valid 10-digit mobile number');
      return;
    }
    
    // Validate telephone number before submission
    if (formData.telephone.length !== 10) {
      setTelephoneError('Telephone number must be exactly 10 digits');
      await showSubmissionModalError('Please enter a valid 10-digit telephone number');
      return;
    }

    if (String(formData.captcha || '').trim().toLowerCase() !== String(captchaValue || '').toLowerCase()) {
      await showSubmissionModalError('Captcha is incorrect. Please try again.');
      setFormData((prev) => ({ ...prev, captcha: '' }));
      generateCaptcha();
      return;
    }

    const alreadyVerified =
      documentVerification.name.status === 'verified' &&
      documentVerification.nic.status === 'verified' &&
      documentVerification.degreeCertificate.status === 'verified';

    if (!alreadyVerified) {
      const verified = await verifyNicAndDegreeDocuments();
      if (!verified) {
        await showSubmissionModalError('NIC and Degree/Diploma verification failed. Please check uploaded files and form data.');
        scrollToSection(qualificationsSectionRef);
        return;
      }
    }

    if (membershipExtraction.status !== 'verified') {
      await showSubmissionModalError('Membership verification failed. Please ensure entered membership details match the uploaded proof(s).');
      scrollToSection(membershipsSectionRef);
      return;
    }

    const hasExperienceData = getFilledExperienceRows(formData.experiences).length > 0;
    const hasEmployerLetterFiles = Array.isArray(formData.documents.employerLetter)
      ? formData.documents.employerLetter.length > 0
      : Boolean(formData.documents.employerLetter);

    if (hasEmployerLetterFiles && hasExperienceData && workExperienceVerification.status !== 'verified') {
      const experienceVerified = await verifyWorkExperienceWithEmployerLetter();
      if (!experienceVerified) {
        await showSubmissionModalError('Work experience details do not match the uploaded employer consent letter.');
        scrollToSection(experiencesSectionRef);
        return;
      }
    }

    if (formData.documents.paymentConfirmation && paymentReceiptVerification.status !== 'verified') {
      const paymentVerified = await verifyPaymentReceiptDocument();
      if (!paymentVerified) {
        await showSubmissionModalError('Payment receipt does not match required account number or processing fee.');
        scrollToSection(documentsSectionRef);
        return;
      }
    }

    if (String(formData.captcha || '').trim().toLowerCase() !== String(captchaValue || '').toLowerCase()) {
      setCaptchaError('Captcha is incorrect. Please enter the exact text shown above.');
      await showSubmissionModalError('Captcha is incorrect. Please enter the exact text shown above.');
      setFormData((prev) => ({ ...prev, captcha: '' }));
      generateCaptcha();
      scrollToSection(declarationSectionRef);
      setTimeout(() => {
        captchaInputRef.current?.focus();
      }, 200);
      return;
    }
    
    try {
      
      // Helper function to convert File to base64
      const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            // Extract base64 content (remove data:image/png;base64, prefix)
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      // Convert File objects to {name, data} format
      const convertFilesToBase64 = async (files) => {
        if (!files) return undefined;
        
        if (Array.isArray(files)) {
          const converted = await Promise.all(
            files.map(async (file) => ({
              name: file.name,
              data: await fileToBase64(file)
            }))
          );
          return converted;
        } else if (files instanceof File) {
          return {
            name: files.name,
            data: await fileToBase64(files)
          };
        }
        return undefined;
      };

      // Prepare the data to send (convert files to base64 format)
      const dataToSend = {
        ...formData,
        documents: {
          degreeCertificate: await convertFilesToBase64(formData.documents.degreeCertificate),
          membershipProofs: await convertFilesToBase64(formData.documents.membershipProofs),
          nic: await convertFilesToBase64(formData.documents.nic),
          employerLetter: await convertFilesToBase64(formData.documents.employerLetter),
          transcript: await convertFilesToBase64(formData.documents.transcript),
          paymentConfirmation: await convertFilesToBase64(formData.documents.paymentConfirmation)
        }
      };

      // Fetch with 2-minute timeout for large file handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 120000); // 2 minutes
      
      const response = await fetch('http://localhost:5000/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const result = await response.json();

      if (result.success) {
        setSubmissionStatus('success');
        setSubmissionMessage('Application submitted successfully! Redirecting...');
        keepModalVisibleForRedirect = true;
        await new Promise((resolve) => setTimeout(resolve, 1400));
        navigate('/');
        return;
      } else {
        setSubmissionStatus('error');
        setSubmissionMessage(result.message || 'Failed to submit application. Please try again.');
        await new Promise((resolve) => setTimeout(resolve, 2200));
        return;
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      if (error.name === 'AbortError') {
        setSubmissionStatus('error');
        setSubmissionMessage('Request timed out. The server took too long to respond. Please try again.');
        await new Promise((resolve) => setTimeout(resolve, 2200));
      } else {
        setSubmissionStatus('error');
        setSubmissionMessage('Error submitting application: ' + error.message);
        await new Promise((resolve) => setTimeout(resolve, 2200));
        console.error('Detailed error:', error);
      }
    }
    } finally {
      if (!keepModalVisibleForRedirect) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="application-form-page">
      {isSubmitting && (
        <div className="submission-modal-overlay">
          <div className="submission-modal">
            {submissionStatus === 'submitting' ? (
              <div className="submission-spinner"></div>
            ) : submissionStatus === 'success' ? (
              <div className="submission-success-icon">✓</div>
            ) : (
              <div className="submission-error-icon">!</div>
            )}
            <p>{submissionMessage}</p>
          </div>
        </div>
      )}

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
        <div className="form-section" ref={qualificationsSectionRef}>
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
            <label>Full Name (as in NIC)</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Tharindu Eranda Weerasinghe"
              required
            />
            <div className={`verification-status ${documentVerification.name.status}`} style={{ marginTop: '8px' }}>
              <span className="verification-icon">
                {documentVerification.name.status === 'verified' ? '✔' : documentVerification.name.status === 'failed' ? '✖' : '•'}
              </span>
              <span>
                {documentVerification.name.status === 'verified'
                  ? 'Full Name matched with NIC document'
                  : documentVerification.name.status === 'failed'
                    ? documentVerification.name.message
                    : 'Full Name will be automatically matched with uploaded NIC document'}
              </span>
            </div>
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
              <div className={`verification-status ${documentVerification.nic.status}`} style={{ marginTop: '8px' }}>
                <span className="verification-icon">
                  {documentVerification.nic.status === 'verified' ? '✔' : documentVerification.nic.status === 'failed' ? '✖' : '•'}
                </span>
                <span>
                  {documentVerification.nic.status === 'verified'
                    ? 'NIC number verified'
                    : documentVerification.nic.status === 'failed'
                      ? documentVerification.nic.message
                      : 'NIC will be auto-verified after NIC file upload'}
                </span>
              </div>
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
        <div className="form-section" ref={membershipsSectionRef}>
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

          <div className={`verification-status ${documentVerification.degreeCertificate.status}`} style={{ marginTop: '12px' }}>
            <span className="verification-icon">
              {documentVerification.degreeCertificate.status === 'verified' ? '✔' : documentVerification.degreeCertificate.status === 'failed' ? '✖' : '•'}
            </span>
            <span>
              {documentVerification.degreeCertificate.status === 'verified'
                ? (documentVerification.degreeCertificate.message || 'Degree/Diploma details verified')
                : documentVerification.degreeCertificate.status === 'failed'
                  ? documentVerification.degreeCertificate.message
                  : 'Degree/Diploma will be auto-verified after certificate upload'}
            </span>
          </div>

        </div>

        {/* Membership of Professional Organizations */}
        <div className="form-section" ref={experiencesSectionRef}>
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

          <div className={`verification-status ${membershipExtraction.status === 'verified' ? 'verified' : membershipExtraction.status === 'failed' ? 'failed' : ''}`} style={{ marginTop: '12px' }}>
            <span className="verification-icon">
              {membershipExtraction.status === 'verified' ? '✔' : membershipExtraction.status === 'failed' ? '✖' : membershipExtraction.status === 'loading' ? '…' : '•'}
            </span>
            <span>
              {membershipExtraction.status === 'verified'
                ? membershipExtraction.message
                : membershipExtraction.status === 'failed'
                  ? membershipExtraction.message
                  : membershipExtraction.status === 'loading'
                    ? 'Extracting membership details from uploaded document(s)...'
                    : 'Upload membership proof files to auto-extract organization, category, and date.'}
            </span>
          </div>

        </div>

        {/* Work Experience */}
        <div className="form-section" ref={documentsSectionRef}>
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

          <div className={`verification-status ${workExperienceVerification.status === 'verified' ? 'verified' : workExperienceVerification.status === 'failed' ? 'failed' : ''}`} style={{ marginTop: '12px' }}>
            <span className="verification-icon">
              {workExperienceVerification.status === 'verified' ? '✔' : workExperienceVerification.status === 'failed' ? '✖' : workExperienceVerification.status === 'loading' ? '…' : '•'}
            </span>
            <span>
              {workExperienceVerification.status === 'verified'
                ? workExperienceVerification.message
                : workExperienceVerification.status === 'failed'
                  ? workExperienceVerification.message
                  : workExperienceVerification.status === 'loading'
                    ? 'Verifying work experience with employer letter...'
                    : 'Work experience will be auto-verified after uploading Employer Consent Letter'}
            </span>
          </div>

          {(Array.isArray(workExperienceVerification.extracted?.companies) && workExperienceVerification.extracted.companies.length > 0
            || Array.isArray(workExperienceVerification.extracted?.positions) && workExperienceVerification.extracted.positions.length > 0
            || Array.isArray(workExperienceVerification.extracted?.dateRanges) && workExperienceVerification.extracted.dateRanges.length > 0) && (
            <div style={{ marginTop: '10px', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f8fafc' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                Extracted from Employer Letter
              </div>
              {Array.isArray(workExperienceVerification.extracted?.companies) && workExperienceVerification.extracted.companies.length > 0 && (
                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                  Companies: {workExperienceVerification.extracted.companies.join(' | ')}
                </div>
              )}
              {Array.isArray(workExperienceVerification.extracted?.positions) && workExperienceVerification.extracted.positions.length > 0 && (
                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                  Positions: {workExperienceVerification.extracted.positions.join(' | ')}
                </div>
              )}
              {Array.isArray(workExperienceVerification.extracted?.dateRanges) && workExperienceVerification.extracted.dateRanges.length > 0 && (
                <div style={{ fontSize: '13px', color: '#334155' }}>
                  Date Ranges: {workExperienceVerification.extracted.dateRanges.map((range) => `${range.from} -> ${range.to}`).join(' | ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="form-section" ref={declarationSectionRef}>
          <h3 className="section-title required">Documents</h3>
          <p className="document-note">
            * Please make sure each file is 4 MB or less (Please upload the files in PDF format). All documents are required.
          </p>

          <div className="form-group">
            <label>Degree / Diploma Certificate(s)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => triggerFilePicker(degreeInputRef)}
                style={{
                  border: '1px solid #bfc5cc',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#111827',
                  cursor: 'pointer',
                  padding: '8px 14px',
                  fontSize: '16px',
                  lineHeight: 1
                }}
              >
                Choose files
              </button>
              <span style={{ fontSize: '16px', color: '#374151' }}>
                {Array.isArray(formData.documents.degreeCertificate) && formData.documents.degreeCertificate.length > 0
                  ? `${formData.documents.degreeCertificate.length} file(s) selected`
                  : 'No file chosen'}
              </span>
            </div>
            <input
              ref={degreeInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              multiple
              onChange={(e) => handleFileChange(e, 'degreeCertificate')}
              style={{ display: 'none' }}
            />
            {Array.isArray(formData.documents.degreeCertificate) && formData.documents.degreeCertificate.length > 0 && (
              <p className="document-note" style={{ marginTop: '8px', marginBottom: '8px' }}>
                {formData.documents.degreeCertificate.length} degree files selected.
              </p>
            )}
            {Array.isArray(formData.documents.degreeCertificate) && formData.documents.degreeCertificate.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                {formData.documents.degreeCertificate.map((file, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}
                  >
                    <span style={{ fontSize: '13px', color: '#374151' }}>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeDegreeFile(index)}
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                        padding: '2px 8px',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            {fileErrors.degreeCertificate && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{fileErrors.degreeCertificate}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>NIC</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => triggerFilePicker(nicInputRef)}
                style={{
                  border: '1px solid #bfc5cc',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#111827',
                  cursor: 'pointer',
                  padding: '8px 14px',
                  fontSize: '16px',
                  lineHeight: 1
                }}
              >
                Choose file
              </button>
              <span style={{ fontSize: '16px', color: '#374151' }}>
                {formData.documents.nic ? formData.documents.nic.name : 'No file chosen'}
              </span>
            </div>
            <input
              ref={nicInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => handleFileChange(e, 'nic')}
              style={{ display: 'none' }}
            />
            {formData.documents.nic && (
              <p className="document-note" style={{ marginTop: '8px', marginBottom: '8px' }}>
                NIC file selected.
              </p>
            )}
            {formData.documents.nic && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{formData.documents.nic.name}</span>
                  <button
                    type="button"
                    onClick={removeNicFile}
                    style={{
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#fff',
                      color: '#374151',
                      cursor: 'pointer',
                      padding: '2px 8px',
                      fontSize: '12px'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
            {fileErrors.nic && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{fileErrors.nic}</span>
              </div>
            )}
          </div>

          {documentVerification.isVerifying && (
            <p className="document-note" style={{ marginBottom: '10px', color: '#0f766e' }}>
              Verifying Name, Degree, and NIC automatically...
            </p>
          )}

          <div className="form-group">
            <label>Membership of Professional Organizations (Proof)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => triggerFilePicker(membershipProofInputRef)}
                style={{
                  border: '1px solid #bfc5cc',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#111827',
                  cursor: 'pointer',
                  padding: '8px 14px',
                  fontSize: '16px',
                  lineHeight: 1
                }}
              >
                Choose files
              </button>
              <span style={{ fontSize: '16px', color: '#374151' }}>
                {Array.isArray(formData.documents.membershipProofs) && formData.documents.membershipProofs.length > 0
                  ? `${formData.documents.membershipProofs.length} file(s) selected`
                  : 'No file chosen'}
              </span>
            </div>
            <input
              ref={membershipProofInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              multiple
              onChange={(e) => handleFileChange(e, 'membershipProofs')}
              style={{ display: 'none' }}
            />
            {Array.isArray(formData.documents.membershipProofs) && formData.documents.membershipProofs.length > 0 && (
              <p className="document-note" style={{ marginTop: '8px', marginBottom: '8px' }}>
                {formData.documents.membershipProofs.length} membership file(s) selected.
              </p>
            )}
            {Array.isArray(formData.documents.membershipProofs) && formData.documents.membershipProofs.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                {formData.documents.membershipProofs.map((file, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}
                  >
                    <span style={{ fontSize: '13px', color: '#374151' }}>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeMembershipProofFile(index)}
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                        padding: '2px 8px',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {fileErrors.membershipProofs && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{fileErrors.membershipProofs}</span>
              </div>
            )}
          </div>

          {documentVerification.error && (
            <div className="error-box">
              <span className="error-icon">⚠</span>
              <span className="error-text">{documentVerification.error}</span>
            </div>
          )}

          <div className="form-group">
            <label>Employer Consent Letter</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => triggerFilePicker(employerLetterInputRef)}
                style={{
                  border: '1px solid #bfc5cc',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#111827',
                  cursor: 'pointer',
                  padding: '8px 14px',
                  fontSize: '16px',
                  lineHeight: 1
                }}
              >
                Choose files
              </button>
              <span style={{ fontSize: '16px', color: '#374151' }}>
                {Array.isArray(formData.documents.employerLetter) && formData.documents.employerLetter.length > 0
                  ? `${formData.documents.employerLetter.length} file(s) selected`
                  : 'No file chosen'}
              </span>
            </div>
            <input
              ref={employerLetterInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              multiple
              onChange={(e) => handleFileChange(e, 'employerLetter')}
              style={{ display: 'none' }}
            />
            {Array.isArray(formData.documents.employerLetter) && formData.documents.employerLetter.length > 0 && (
              <p className="document-note" style={{ marginTop: '8px', marginBottom: '8px' }}>
                {formData.documents.employerLetter.length} employer letter file(s) selected.
              </p>
            )}
            {Array.isArray(formData.documents.employerLetter) && formData.documents.employerLetter.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                {formData.documents.employerLetter.map((file, index) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${index}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}
                  >
                    <span style={{ fontSize: '13px', color: '#374151' }}>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeEmployerLetterFile(index)}
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                        padding: '2px 8px',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            {fileErrors.employerLetter && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{fileErrors.employerLetter}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Transcript(s)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => triggerFilePicker(transcriptInputRef)}
                style={{
                  border: '1px solid #bfc5cc',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#111827',
                  cursor: 'pointer',
                  padding: '8px 14px',
                  fontSize: '16px',
                  lineHeight: 1
                }}
              >
                Choose file
              </button>
              <span style={{ fontSize: '16px', color: '#374151' }}>
                {formData.documents.transcript ? formData.documents.transcript.name : 'No file chosen'}
              </span>
            </div>
            <input
              ref={transcriptInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'transcript')}
              style={{ display: 'none' }}
            />
            {formData.documents.transcript && (
              <p className="document-note" style={{ marginTop: '8px', marginBottom: '8px' }}>
                Transcript file selected.
              </p>
            )}
            {formData.documents.transcript && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{formData.documents.transcript.name}</span>
                  <button
                    type="button"
                    onClick={removeTranscriptFile}
                    style={{
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#fff',
                      color: '#374151',
                      cursor: 'pointer',
                      padding: '2px 8px',
                      fontSize: '12px'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
            {fileErrors.transcript && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{fileErrors.transcript}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Payment Confirmation / Bank Receipt</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => triggerFilePicker(paymentConfirmationInputRef)}
                style={{
                  border: '1px solid #bfc5cc',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#111827',
                  cursor: 'pointer',
                  padding: '8px 14px',
                  fontSize: '16px',
                  lineHeight: 1
                }}
              >
                Choose file
              </button>
              <span style={{ fontSize: '16px', color: '#374151' }}>
                {formData.documents.paymentConfirmation ? formData.documents.paymentConfirmation.name : 'No file chosen'}
              </span>
            </div>
            <input
              ref={paymentConfirmationInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => handleFileChange(e, 'paymentConfirmation')}
              style={{ display: 'none' }}
            />
            {formData.documents.paymentConfirmation && (
              <p className="document-note" style={{ marginTop: '8px', marginBottom: '8px' }}>
                Payment confirmation file selected.
              </p>
            )}
            {formData.documents.paymentConfirmation && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{formData.documents.paymentConfirmation.name}</span>
                  <button
                    type="button"
                    onClick={removePaymentConfirmationFile}
                    style={{
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#fff',
                      color: '#374151',
                      cursor: 'pointer',
                      padding: '2px 8px',
                      fontSize: '12px'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
            {fileErrors.paymentConfirmation && (
              <div className="error-box">
                <span className="error-icon">⚠</span>
                <span className="error-text">{fileErrors.paymentConfirmation}</span>
              </div>
            )}

            <div className={`verification-status ${paymentReceiptVerification.status === 'verified' ? 'verified' : paymentReceiptVerification.status === 'failed' ? 'failed' : ''}`}>
              <span className="verification-icon">
                {paymentReceiptVerification.status === 'verified' ? '✔' : paymentReceiptVerification.status === 'failed' ? '✖' : paymentReceiptVerification.status === 'loading' ? '…' : '•'}
              </span>
              <span>
                {paymentReceiptVerification.status === 'verified'
                  ? paymentReceiptVerification.message
                  : paymentReceiptVerification.status === 'failed'
                    ? paymentReceiptVerification.message
                    : paymentReceiptVerification.status === 'loading'
                      ? 'Extracting and verifying account number and processing fee from receipt...'
                      : 'Upload payment receipt to auto-verify account no (0043618) and fee (Rs. 2,000).'}
              </span>
            </div>

            {(Array.isArray(paymentReceiptVerification.extracted?.accountNumbers) && paymentReceiptVerification.extracted.accountNumbers.length > 0
              || Array.isArray(paymentReceiptVerification.extracted?.amounts) && paymentReceiptVerification.extracted.amounts.length > 0) && (
              <div style={{ marginTop: '10px', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f8fafc' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                  Extracted from Payment Receipt
                </div>
                {Array.isArray(paymentReceiptVerification.extracted?.accountNumbers) && paymentReceiptVerification.extracted.accountNumbers.length > 0 && (
                  <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                    Account Numbers: {paymentReceiptVerification.extracted.accountNumbers.join(' | ')}
                  </div>
                )}
                {Array.isArray(paymentReceiptVerification.extracted?.amounts) && paymentReceiptVerification.extracted.amounts.length > 0 && (
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    Amounts: {paymentReceiptVerification.extracted.amounts.map((amount) => `Rs. ${amount}`).join(' | ')}
                  </div>
                )}
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
            <div
              className="captcha-display"
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              style={{ userSelect: 'none' }}
            >
              {captchaValue}
            </div>
            <input
              ref={captchaInputRef}
              type="text"
              name="captcha"
              value={formData.captcha}
              onChange={handleInputChange}
              placeholder="Enter captcha"
              required
            />
            {captchaError && (
              <div className="error-box" style={{ marginTop: '8px' }}>
                <span className="error-icon">⚠</span>
                <span className="error-text">{captchaError}</span>
              </div>
            )}
            <button type="button" className="add-button" onClick={generateCaptcha} style={{ marginTop: '10px' }}>
              Refresh Captcha
            </button>
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
