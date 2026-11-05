import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Calendar, Check, Info, Plus, RefreshCw, Trash2 } from 'lucide-react';
import '../styles/ApplicationFormPage.css';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import API_BASE_URL from '../utils/apiConfig';
import { MAX_GPA, getErrorSummary, getSectionCompletion, getSectionOfField, hasDocument, validateApplication, validateField } from '../utils/applicationValidation';
import { loadDraft, mergeDraft, removeDraft, saveDraft } from '../utils/applicationDraft';
import { formatReference } from '../utils/applicationReference';

// Shown in the submission modal; handleSubmit moves through them with setSubmissionStep.
const SUBMISSION_STEPS = ['Checking your details', 'Uploading documents', 'Submitting application'];

const createEmptyFormData = (program) => ({
  program,
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
    graduationDate: '',
    gpa: ''
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

// Options of the select fields; the labels are also shown on the review screen.
const TITLE_OPTIONS = [
  { value: 'mr', label: 'Mr' },
  { value: 'mrs', label: 'Mrs' },
  { value: 'ms', label: 'Ms' },
  { value: 'dr', label: 'Dr' },
  { value: 'prof', label: 'Prof' }
];

const UNIVERSITY_OPTIONS = [
  { value: 'uom', label: 'University of Moratuwa' },
  { value: 'uop', label: 'University of Peradeniya' },
  { value: 'uor', label: 'University of Ruhuna' },
  { value: 'usjp', label: 'University of Sri Jayewardenepura' },
  { value: 'uoc', label: 'University of Colombo' },
  { value: 'uok', label: 'University of Kelaniya' },
  { value: 'rjt', label: 'Rajarata University' },
  { value: 'wusl', label: 'Wayamba University' },
  { value: 'susl', label: 'Sabaragamuwa University' },
  { value: 'uwu', label: 'Uva Wellassa University' },
  { value: 'uoj', label: 'University of Jaffna' },
  { value: 'seu', label: 'South Eastern University' },
  { value: 'ksdu', label: 'General Sir John Kotelawala Defence University' },
  { value: 'ousl', label: 'Open University of Sri Lanka' }
];

const DEGREE_OPTIONS = [
  { value: 'bsc', label: 'BSc (Hons)' },
  { value: 'msc', label: 'MSc' },
  { value: 'phd', label: 'PhD' }
];

const DURATION_OPTIONS = [1, 2, 3, 4, 5].map((years) => ({
  value: String(years),
  label: `${years} ${years === 1 ? 'Year' : 'Years'}`
}));

const MONTH_OPTIONS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  .map((label, index) => ({ value: String(index + 1).padStart(2, '0'), label }));

// Field ids follow the validator's keys: 'qualifications.0.gpa' -> 'field-qualifications-0-gpa'.
const fieldId = (key) => `field-${key.replace(/\./g, '-')}`;

// Every answer on this form is required. The inputs carry `required`, which screen readers announce,
// so the star is only for the eye.
function RequiredMark() {
  return <span className="required-mark" aria-hidden="true">*</span>;
}

// Smooth scrolling, unless the visitor asked the system for less motion.
const scrollBehavior = () => (
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
);

// Sticky bar over the form: ✓ complete, ● the section on screen, ○ not complete yet.
// Each step shows its name too, so the state is never colour alone.
function FormProgress({ sections, completion, currentKey, onSelect }) {
  const doneCount = sections.filter((section) => completion[section.key]).length;
  const currentIndex = Math.max(0, sections.findIndex((section) => section.key === currentKey));

  return (
    <nav className="form-progress" aria-label="Application progress">
      <ol className="form-progress__steps">
        {sections.map((section) => {
          const done = completion[section.key];
          const current = section.key === currentKey;
          return (
            <li key={section.key}>
              <button
                type="button"
                className={`form-progress__step${done ? ' is-done' : ''}${current ? ' is-current' : ''}`}
                aria-current={current ? 'step' : undefined}
                onClick={() => onSelect(section.key)}
              >
                <span className="form-progress__marker" aria-hidden="true">
                  {done && <Check size={12} strokeWidth={3} />}
                </span>
                {section.label}
                <span className="sr-only">{done ? ', complete' : ', not complete yet'}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="form-progress__phone">
        Step {currentIndex + 1} of {sections.length} · {sections[currentIndex].label}
      </p>

      <div className="form-progress__meter">
        <div className="form-progress__track" aria-hidden="true">
          <div className="form-progress__fill" style={{ width: `${(doneCount / sections.length) * 100}%` }} />
        </div>
        <span className="form-progress__count">{doneCount} of {sections.length} complete</span>
      </div>
    </nav>
  );
}

// "28 Oct, 3:15 pm" for the draft banner.
const formatDraftTime = (timestamp) => {
  const date = new Date(timestamp);
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day}, ${time}`;
};

// Removes the error at `index` from an index-keyed error map and shifts later entries down by one.
const removeIndexedError = (errors, index) => {
  const adjusted = {};
  Object.keys(errors).forEach(key => {
    const keyIndex = parseInt(key, 10);
    if (keyIndex < index) {
      adjusted[keyIndex] = errors[key];
    } else if (keyIndex > index) {
      adjusted[keyIndex - 1] = errors[key];
    }
  });
  return adjusted;
};

function ApplicationFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileError, setMobileError] = useState('');
  const [telephoneError, setTelephoneError] = useState('');
  const [nicError, setNicError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [graduationDateErrors, setGraduationDateErrors] = useState({});
  const [gpaErrors, setGpaErrors] = useState({});
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
  const [submissionStep, setSubmissionStep] = useState(0); // index in SUBMISSION_STEPS
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
  const personalSectionRef = useRef(null);
  const qualificationsSectionRef = useRef(null);
  const membershipsSectionRef = useRef(null);
  const experiencesSectionRef = useRef(null);
  const documentsSectionRef = useRef(null);
  const declarationSectionRef = useRef(null);
  const captchaInputRef = useRef(null);
  // The six sections in page order; the keys match getSectionCompletion.
  const SECTIONS = [
    { key: 'personal', label: 'Personal', ref: personalSectionRef },
    { key: 'academic', label: 'Academic', ref: qualificationsSectionRef },
    { key: 'memberships', label: 'Memberships', ref: membershipsSectionRef },
    { key: 'work', label: 'Work', ref: experiencesSectionRef },
    { key: 'documents', label: 'Documents', ref: documentsSectionRef },
    { key: 'declaration', label: 'Declaration', ref: declarationSectionRef }
  ];
  const [currentSection, setCurrentSection] = useState('personal');
  const [submittedApplicationId, setSubmittedApplicationId] = useState('');
  const [applicationWindow, setApplicationWindow] = useState({ open: true, message: '' });

  // Answers typed earlier for this programme come back after a refresh; files have to be chosen again.
  const [draftSavedAt, setDraftSavedAt] = useState(() => loadDraft(location.state?.program)?.savedAt || null);
  const [formData, setFormData] = useState(() => (
    mergeDraft(createEmptyFormData(location.state?.program || ''), loadDraft(location.state?.program))
  ));
  // The form as it was loaded (or reset); it isn't saved again until the user changes something.
  const untouchedFormDataRef = useRef(formData);
  const hasChosenFiles = Object.values(formData.documents).some(hasDocument);

  useEffect(() => {
    // After a successful submit the draft is no longer needed. Running this here, after the
    // cleanup below has cancelled any pending save, means a late save can't bring it back.
    if (submittedApplicationId) {
      removeDraft(formData.program);
      return undefined;
    }

    if (formData === untouchedFormDataRef.current) {
      return undefined;
    }

    const timer = setTimeout(() => saveDraft(formData), 1000);
    return () => clearTimeout(timer);
  }, [formData, submittedApplicationId]);

  // Files can't be kept in a draft, so warn before the page is closed or reloaded with files chosen.
  useEffect(() => {
    if (!hasChosenFiles || submittedApplicationId) {
      return undefined;
    }

    const warnBeforeLeaving = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [hasChosenFiles, submittedApplicationId]);

  // "Start over" in the draft banner
  const discardDraft = () => {
    removeDraft(formData.program);
    const emptyFormData = createEmptyFormData(formData.program);
    untouchedFormDataRef.current = emptyFormData;
    setFormData(emptyFormData);
    setDraftSavedAt(null);
  };

  // Check if program is provided, if not redirect to homepage
  useEffect(() => {
    if (!location.state?.program) {
      alert('Please select a program from the programs page first.');
      navigate('/');
    }
  }, [location.state, navigate]);

  // The date range and deadline from Settings can close applications; the server checks again on submit.
  useEffect(() => {
    if (!location.state?.program) {
      return;
    }

    fetch(`${API_BASE_URL}/programs/${encodeURIComponent(location.state.program)}/application-window`)
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setApplicationWindow(result.data);
        }
      })
      .catch(() => {}); // the form stays open; the server still refuses a closed submission
  }, [location.state]);

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

  // The progress bar marks the section in the band just under it as the one on screen.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const sectionByElement = new Map([
      [personalSectionRef.current, 'personal'],
      [qualificationsSectionRef.current, 'academic'],
      [membershipsSectionRef.current, 'memberships'],
      [experiencesSectionRef.current, 'work'],
      [documentsSectionRef.current, 'documents'],
      [declarationSectionRef.current, 'declaration']
    ].filter(([element]) => element));
    const visible = new Set();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const key = sectionByElement.get(entry.target);
        if (entry.isIntersecting) {
          visible.add(key);
        } else {
          visible.delete(key);
        }
      });
      // The first section in page order wins, so a short section between two others still shows.
      const first = [...sectionByElement.values()].find((key) => visible.has(key));
      if (first) {
        setCurrentSection(first);
      }
    }, { rootMargin: '-120px 0px -60% 0px', threshold: 0 });

    sectionByElement.forEach((_, element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  // Clicking a step in the progress bar: scroll to that section and move focus there for keyboard users.
  const goToSection = (key) => {
    const section = SECTIONS.find((item) => item.key === key)?.ref.current;
    if (!section) return;
    section.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    section.focus({ preventScroll: true });
  };

  const sectionCompletion = getSectionCompletion(formData, { captchaValue });

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

      const response = await fetch(`${API_BASE_URL}/verify/verify-payment-receipt`, {
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
        graduationDate: '',
        gpa: ''
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

    // Also remove the errors for this index and shift the later ones down
    setGraduationDateErrors(prev => removeIndexedError(prev, index));
    setGpaErrors(prev => removeIndexedError(prev, index));
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

    // Check the GPA range while typing; an empty GPA is reported on submit
    if (field === 'gpa') {
      const message = String(value).trim() ? validateField('gpa', value) : '';
      setGpaErrors(prev => {
        const next = { ...prev };
        if (message) {
          next[index] = message;
        } else {
          delete next[index];
        }
        return next;
      });
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

      const response = await fetch(`${API_BASE_URL}/verify/verify-documents`, {
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

      const response = await fetch(`${API_BASE_URL}/verify/extract-memberships`, {
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

      const response = await fetch(`${API_BASE_URL}/verify/extract-work-experience`, {
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

    // Personal fields are focused directly, so that section has no ref here.
    const sectionRefs = {
      academic: qualificationsSectionRef,
      memberships: membershipsSectionRef,
      work: experiencesSectionRef,
      documents: documentsSectionRef,
      declaration: declarationSectionRef
    };

    const personalErrorSetters = {
      nicNo: setNicError,
      email: setEmailError,
      mobile: setMobileError,
      telephone: setTelephoneError
    };

    // Show loader immediately so long verification/preparation steps are visible to users.
    setIsSubmitting(true);
    setSubmissionStatus('submitting');
    setSubmissionMessage('Your application is submitting...');
    setSubmissionStep(0);
    await new Promise((resolve) => setTimeout(resolve, 0));
    let keepModalOpen = false;

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

    // Show the first problem (in page order) and take the user to it.
    const errors = validateApplication(formData, { captchaValue });
    const firstErrorKey = Object.keys(errors)[0];

    if (firstErrorKey) {
      const message = errors[firstErrorKey];
      const section = getSectionOfField(firstErrorKey);
      const gpaErrorMatch = firstErrorKey.match(/^qualifications\.(\d+)\.gpa$/);

      if (gpaErrorMatch) {
        setGpaErrors(prev => ({ ...prev, [gpaErrorMatch[1]]: message }));
      }
      personalErrorSetters[firstErrorKey]?.(message);
      if (firstErrorKey === 'captcha') {
        setCaptchaError(message);
      }

      await showSubmissionModalError(getErrorSummary(firstErrorKey, message));

      if (section === 'personal') {
        focusField(`[name="${firstErrorKey}"]`);
      } else {
        scrollToSection(sectionRefs[section]);
      }

      if (firstErrorKey === 'captcha') {
        setFormData((prev) => ({ ...prev, captcha: '' }));
        generateCaptcha();
        setTimeout(() => {
          captchaInputRef.current?.focus();
        }, 200);
      }
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

    try {
      setSubmissionStep(1);

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
        qualifications: formData.qualifications.map((qualification) => ({
          ...qualification,
          gpa: Number(qualification.gpa)
        })),
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

      setSubmissionStep(2);
      const response = await fetch(`${API_BASE_URL}/applications`, {
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
        // The id is kept for the reference number (formatReference); setting it also removes the draft.
        setSubmittedApplicationId(result.data._id);
        setDraftSavedAt(null);
        setSubmissionStatus('success');
        setSubmissionMessage('Application submitted successfully!');
        // The modal stays open with the reference number until the applicant leaves.
        keepModalOpen = true;
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
      if (!keepModalOpen) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    // `apply-page` keeps the public form's styles off the admin view, which shares this stylesheet.
    <div className="application-form-page apply-page">
      {isSubmitting && (
        <div className="submission-modal-overlay">
          <div className="submission-modal" role="dialog" aria-modal="true" aria-live="polite">
            {submissionStatus === 'submitting' ? (
              <div className="submission-spinner"></div>
            ) : submissionStatus === 'success' ? (
              <svg className="success-check submission-check" width="64" height="64" viewBox="0 0 52 52" fill="none" aria-hidden="true">
                <circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="3" />
                <path d="M15 27l7 7 15-15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <div className="submission-error-icon">!</div>
            )}
            <p>{submissionMessage}</p>

            {submissionStatus === 'submitting' && (
              <ol className="submission-steps">
                {SUBMISSION_STEPS.map((label, index) => (
                  <li
                    key={label}
                    className={index < submissionStep ? 'is-done' : index === submissionStep ? 'is-current' : ''}
                    aria-current={index === submissionStep ? 'step' : undefined}
                  >
                    <span className="submission-step-marker" aria-hidden="true">
                      {index < submissionStep ? '✓' : index + 1}
                    </span>
                    {label}
                  </li>
                ))}
              </ol>
            )}

            {submissionStatus === 'success' && (
              <>
                {submittedApplicationId && (
                  <div className="submission-reference">
                    <span className="submission-reference-label">Your reference number</span>
                    <strong className="submission-reference-number">{formatReference(submittedApplicationId)}</strong>
                    <span className="submission-reference-note">
                      Please save it. Quote it if you contact the department about your application.
                    </span>
                  </div>
                )}
                <button type="button" className="submission-done-btn" onClick={() => navigate('/')} autoFocus>
                  Back to programs
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <SiteHeader />

      <main className="apply-main" id="main" tabIndex={-1}>
      {/* Mirrors the title of the paper form */}
      <div className="form-header">
        <p className="form-header__org">University of Moratuwa</p>
        <p className="form-header__org">Faculty of Engineering</p>
        <p className="form-header__org">Department of Computer Science and Engineering</p>
        <h1 className="form-header__title">Application for Postgraduate Studies</h1>
        {location.state?.programName && (
          <p className="program-chip">
            Applying for: <strong>{location.state.programName}</strong>
          </p>
        )}
      </div>

      {!applicationWindow.open && (
        <div className="form-alert form-alert--error applications-closed" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <p className="form-alert__body">{applicationWindow.message}</p>
        </div>
      )}

      {draftSavedAt && (
        <div className="form-alert form-alert--info draft-banner" role="status">
          <Info size={18} aria-hidden="true" />
          <p className="form-alert__body">
            We restored your draft from {formatDraftTime(draftSavedAt)}. Documents need to be chosen again.
          </p>
          <button type="button" className="btn btn--quiet btn--sm draft-banner__action" onClick={discardDraft}>
            Start over
          </button>
        </div>
      )}

      <FormProgress
        sections={SECTIONS}
        completion={sectionCompletion}
        currentKey={currentSection}
        onSelect={goToSection}
      />

      {/* noValidate: our own checks show the errors, not the browser's pop-ups */}
      <form onSubmit={handleSubmit} className="application-form" noValidate>
        <p className="required-note">Fields marked <span aria-hidden="true">*</span> are required.</p>

        {/* Personal Particulars */}
        <fieldset className="form-section" ref={personalSectionRef} tabIndex={-1}>
          <legend className="section-legend"><h2 className="section-title">Personal Particulars</h2></legend>

          <div className="form-row form-row--title">
          <div className="form-group">
            <label htmlFor={fieldId('title')}>Title<RequiredMark /></label>
            <select
              id={fieldId('title')}
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              autoComplete="honorific-prefix"
              required
            >
              <option value="">Select</option>
              {TITLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor={fieldId('fullName')}>Full Name (as in NIC)<RequiredMark /></label>
            <input
              id={fieldId('fullName')}
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Tharindu Eranda Weerasinghe"
              autoComplete="name"
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor={fieldId('nameWithInitials')}>Name with Initials<RequiredMark /></label>
              <input
                id={fieldId('nameWithInitials')}
                type="text"
                name="nameWithInitials"
                value={formData.nameWithInitials}
                onChange={handleInputChange}
                placeholder="T.E. Weerasinghe"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor={fieldId('nicNo')}>NIC No<RequiredMark /></label>
              <input
                id={fieldId('nicNo')}
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
              <label htmlFor={fieldId('telephone')}>Telephone<RequiredMark /></label>
              <input
                id={fieldId('telephone')}
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleTelephoneChange}
                placeholder="0112345678"
                autoComplete="tel"
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
              <label htmlFor={fieldId('mobile')}>Mobile<RequiredMark /></label>
              <input
                id={fieldId('mobile')}
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleMobileChange}
                placeholder="0771234567"
                autoComplete="tel"
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
            <label htmlFor={fieldId('email')}>Email<RequiredMark /></label>
            <input
              id={fieldId('email')}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleEmailChange}
              placeholder="name@gmail.com"
              autoComplete="email"
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
            <label htmlFor={fieldId('contactAddress')}>Contact Address<RequiredMark /></label>
            <textarea
              id={fieldId('contactAddress')}
              name="contactAddress"
              value={formData.contactAddress}
              onChange={handleInputChange}
              rows="3"
              autoComplete="street-address"
              required
            />
          </div>
        </fieldset>

        {/* Academic Qualifications */}
        <fieldset className="form-section" ref={qualificationsSectionRef} tabIndex={-1}>
          <legend className="section-legend"><h2 className="section-title">Academic Qualifications</h2></legend>

          {formData.qualifications.map((qual, index) => (
            <div key={index} className="qualification-item">
              <div className="item-header">
                <h3 className="item-title">Qualification {index + 1}</h3>
                {formData.qualifications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQualification(index)}
                    className="btn btn--quiet btn--sm"
                    aria-label={`Remove qualification ${index + 1}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Remove
                  </button>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor={fieldId(`qualifications.${index}.university`)}>University / Institute<RequiredMark /></label>
                  <select
                    id={fieldId(`qualifications.${index}.university`)}
                    value={qual.university}
                    onChange={(e) => handleQualificationChange(index, 'university', e.target.value)}
                    required
                  >
                    <option value="">Select University</option>
                    {UNIVERSITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor={fieldId(`qualifications.${index}.degree`)}>Degree / Qualification<RequiredMark /></label>
                  <select
                    id={fieldId(`qualifications.${index}.degree`)}
                    value={qual.degree}
                    onChange={(e) => handleQualificationChange(index, 'degree', e.target.value)}
                    required
                  >
                    <option value="">Select Qualifications</option>
                    {DEGREE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-three">
                <div className="form-group">
                  <label htmlFor={fieldId(`qualifications.${index}.specialization`)}>Specialization / Minor<RequiredMark /></label>
                  <input
                    id={fieldId(`qualifications.${index}.specialization`)}
                    type="text"
                    value={qual.specialization}
                    onChange={(e) => handleQualificationChange(index, 'specialization', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={fieldId(`qualifications.${index}.duration`)}>Duration (Years)<RequiredMark /></label>
                  <select
                    id={fieldId(`qualifications.${index}.duration`)}
                    value={qual.duration}
                    onChange={(e) => handleQualificationChange(index, 'duration', e.target.value)}
                    required
                  >
                    <option value="">Select Duration</option>
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor={fieldId(`qualifications.${index}.graduationDate`)}>Graduation Date<RequiredMark /></label>
                  <div className="date-input-wrapper">
                    <input
                      id={fieldId(`qualifications.${index}.graduationDate`)}
                      type="text"
                      value={qual.graduationDate}
                      onChange={(e) => handleQualificationChange(index, 'graduationDate', e.target.value)}
                      placeholder="mm/dd/yyyy"
                      className={graduationDateErrors[index] ? 'input-error' : ''}
                      required
                    />
                    <label className="calendar-icon-label">
                      <Calendar size={18} className="calendar-icon" aria-hidden="true" />
                      <input
                        type="date"
                        className="date-picker-hidden"
                        aria-label={`Pick the graduation date of qualification ${index + 1} from a calendar`}
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
                <div className="form-group">
                  <label htmlFor={fieldId(`qualifications.${index}.gpa`)}>GPA (Max {MAX_GPA.toFixed(1)})<RequiredMark /></label>
                  <input
                    id={fieldId(`qualifications.${index}.gpa`)}
                    required
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max={MAX_GPA}
                    value={qual.gpa ?? ''}
                    onChange={(e) => handleQualificationChange(index, 'gpa', e.target.value)}
                    placeholder="e.g. 3.75"
                    className={gpaErrors[index] ? 'input-error' : ''}
                  />
                  {gpaErrors[index] && (
                    <div className="error-box">
                      <span className="error-icon">⚠</span>
                      <span className="error-text">{gpaErrors[index]}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addQualification} className="btn btn--secondary add-item-btn">
            <Plus size={18} aria-hidden="true" />
            Add another qualification
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

        </fieldset>

        {/* Membership of Professional Organizations */}
        <fieldset className="form-section" ref={membershipsSectionRef} tabIndex={-1}>
          <legend className="section-legend"><h2 className="section-title">Membership of Professional Organizations</h2></legend>

          {formData.memberships.map((membership, index) => (
            <div key={index} className="membership-item">
              <div className="item-header">
                <h3 className="item-title">Membership {index + 1}</h3>
                {formData.memberships.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMembership(index)}
                    className="btn btn--quiet btn--sm"
                    aria-label={`Remove membership ${index + 1}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Remove
                  </button>
                )}
              </div>
              <div className="form-row-three">
                <div className="form-group">
                  <label htmlFor={fieldId(`memberships.${index}.organization`)}>Professional Organization<RequiredMark /></label>
                  <input
                    id={fieldId(`memberships.${index}.organization`)}
                    type="text"
                    value={membership.organization}
                    onChange={(e) => handleMembershipChange(index, 'organization', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={fieldId(`memberships.${index}.category`)}>Membership Category<RequiredMark /></label>
                  <input
                    id={fieldId(`memberships.${index}.category`)}
                    type="text"
                    value={membership.category}
                    onChange={(e) => handleMembershipChange(index, 'category', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={fieldId(`memberships.${index}.dateJoined`)}>Date Joined<RequiredMark /></label>
                  <div className="date-input-wrapper">
                    <input
                      id={fieldId(`memberships.${index}.dateJoined`)}
                      type="text"
                      value={membership.dateJoined}
                      onChange={(e) => handleMembershipChange(index, 'dateJoined', e.target.value)}
                      placeholder="mm/dd/yyyy"
                      className={membershipDateErrors[index] ? 'input-error' : ''}
                      required
                    />
                    <label className="calendar-icon-label">
                      <Calendar size={18} className="calendar-icon" aria-hidden="true" />
                      <input
                        type="date"
                        className="date-picker-hidden"
                        aria-label={`Pick the date you joined, membership ${index + 1}, from a calendar`}
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

          <button type="button" onClick={addMembership} className="btn btn--secondary add-item-btn">
            <Plus size={18} aria-hidden="true" />
            Add another membership
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

        </fieldset>

        {/* Work Experience */}
        <fieldset className="form-section" ref={experiencesSectionRef} tabIndex={-1}>
          <legend className="section-legend"><h2 className="section-title">Work Experience (most recent first)</h2></legend>

          {formData.experiences.map((exp, index) => (
            <div key={index} className="experience-item">
              <div className="item-header">
                <h3 className="item-title">Experience {index + 1}</h3>
                {formData.experiences.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExperience(index)}
                    className="btn btn--quiet btn--sm"
                    aria-label={`Remove experience ${index + 1}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    Remove
                  </button>
                )}
              </div>
              <div className="form-row-six">
                <div className="form-group">
                  <label htmlFor={fieldId(`experiences.${index}.fromMonth`)}>From Month<RequiredMark /></label>
                  <select
                    id={fieldId(`experiences.${index}.fromMonth`)}
                    value={exp.fromMonth}
                    onChange={(e) => handleExperienceChange(index, 'fromMonth', e.target.value)}
                    required
                  >
                    <option value="">Month</option>
                    {MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor={fieldId(`experiences.${index}.fromYear`)}>Year<RequiredMark /></label>
                  <input
                    id={fieldId(`experiences.${index}.fromYear`)}
                    type="text"
                    inputMode="numeric"
                    value={exp.fromYear}
                    onChange={(e) => handleExperienceChange(index, 'fromYear', e.target.value)}
                    placeholder="Year"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={fieldId(`experiences.${index}.toMonth`)}>To Month<RequiredMark /></label>
                  <select
                    id={fieldId(`experiences.${index}.toMonth`)}
                    value={exp.toMonth}
                    onChange={(e) => handleExperienceChange(index, 'toMonth', e.target.value)}
                    required
                  >
                    <option value="">Month</option>
                    {MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor={fieldId(`experiences.${index}.toYear`)}>Year<RequiredMark /></label>
                  <input
                    id={fieldId(`experiences.${index}.toYear`)}
                    type="text"
                    inputMode="numeric"
                    value={exp.toYear}
                    onChange={(e) => handleExperienceChange(index, 'toYear', e.target.value)}
                    placeholder="Year"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={fieldId(`experiences.${index}.company`)}>Company<RequiredMark /></label>
                  <input
                    id={fieldId(`experiences.${index}.company`)}
                    type="text"
                    value={exp.company}
                    onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                    autoComplete="organization"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={fieldId(`experiences.${index}.position`)}>Position<RequiredMark /></label>
                  <input
                    id={fieldId(`experiences.${index}.position`)}
                    type="text"
                    value={exp.position}
                    onChange={(e) => handleExperienceChange(index, 'position', e.target.value)}
                    autoComplete="organization-title"
                    required
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addExperience} className="btn btn--secondary add-item-btn">
            <Plus size={18} aria-hidden="true" />
            Add another experience
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
        </fieldset>

        {/* Documents */}
        <fieldset className="form-section" ref={documentsSectionRef} tabIndex={-1}>
          <legend className="section-legend"><h2 className="section-title">Documents</h2></legend>
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
            <div className="form-alert form-alert--error document-check-error" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <p className="form-alert__body">{documentVerification.error}</p>
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
        </fieldset>

        {/* Declaration */}
        <fieldset className="form-section" ref={declarationSectionRef} tabIndex={-1}>
          <legend className="section-legend"><h2 className="section-title">Declaration</h2></legend>
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
            <label htmlFor={fieldId('captcha')}>Enter captcha<RequiredMark /></label>
            <div
              className="captcha-display"
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {captchaValue}
            </div>
            <input
              ref={captchaInputRef}
              id={fieldId('captcha')}
              type="text"
              name="captcha"
              value={formData.captcha}
              onChange={handleInputChange}
              placeholder="Enter captcha"
              autoComplete="off"
              required
            />
            {captchaError && (
              <div className="error-box captcha-error">
                <span className="error-icon">⚠</span>
                <span className="error-text">{captchaError}</span>
              </div>
            )}
            <button type="button" className="btn btn--quiet btn--sm captcha-refresh" onClick={generateCaptcha}>
              <RefreshCw size={16} aria-hidden="true" />
              Refresh captcha
            </button>
          </div>

          <p className="captcha-note">
            Note: If your internet connection is slow, you may receive an error while submitting the form. If so, please try with a different internet
            connection with a faster speed.
          </p>
        </fieldset>

        <button type="submit" className="btn btn--primary submit-button" disabled={!applicationWindow.open}>
          {applicationWindow.open ? 'Submit Application' : 'Applications Closed'}
        </button>
      </form>
      </main>

      <SiteFooter />
    </div>
  );
}

export default ApplicationFormPage;
