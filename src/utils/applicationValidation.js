// Validation rules for the application form, kept in one place so the submit check,
// the field errors and the section progress all agree.

export const MAX_GPA = 4;

const REQUIRED_MESSAGE = 'This field is required';
const CAPTCHA_MESSAGE = 'Captcha is incorrect. Please enter the exact text shown above.';
const DATE_PATTERN = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;

const isBlank = (value) => String(value ?? '').trim() === '';

// mm/dd/yyyy that is also a real calendar date (no 02/31).
const isValidDate = (value) => {
  const trimmedValue = String(value).trim();
  if (!DATE_PATTERN.test(trimmedValue)) return false;

  const [month, day, year] = trimmedValue.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

// Format checks, run after the required check. Each returns '' when valid, otherwise the message.
export const FIELD_RULES = {
  nicNo: (value) =>
    /^(\d{9}[VvXx]|\d{12})$/.test(String(value).trim()) ? '' : 'Enter a valid NIC (e.g. 199912345678 or 991234567V)',
  email: (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()) ? '' : 'Enter a valid email address',
  mobile: (value) =>
    /^07\d{8}$/.test(String(value).replace(/\s/g, '')) ? '' : 'Enter a 10-digit mobile number (07XXXXXXXX)',
  telephone: (value) =>
    /^\d{10}$/.test(String(value).trim()) ? '' : 'Telephone number must be exactly 10 digits',
  gpa: (value) => {
    const gpa = Number(String(value).trim());
    if (!Number.isFinite(gpa)) return 'GPA must be a number';
    return gpa >= 0 && gpa <= MAX_GPA ? '' : `GPA must be between 0 and ${MAX_GPA.toFixed(1)}`;
  },
  graduationDate: (value) => (isValidDate(value) ? '' : 'Enter valid graduation date (mm/dd/yyyy)'),
  dateJoined: (value) => (isValidDate(value) ? '' : 'Enter valid date (mm/dd/yyyy)')
};

const PERSONAL_FIELDS = ['title', 'fullName', 'nameWithInitials', 'nicNo', 'telephone', 'mobile', 'email', 'contactAddress'];

const PERSONAL_LABELS = {
  title: 'Title',
  fullName: 'Full Name',
  nameWithInitials: 'Name with initials',
  nicNo: 'NIC number',
  telephone: 'Telephone number',
  mobile: 'Mobile number',
  email: 'Email address',
  contactAddress: 'Contact address'
};

// Every row in these lists must be complete (the form always keeps at least one row).
const ROW_FIELDS = {
  qualifications: ['university', 'degree', 'specialization', 'duration', 'graduationDate', 'gpa'],
  memberships: ['organization', 'category', 'dateJoined'],
  experiences: ['fromMonth', 'fromYear', 'toMonth', 'toYear', 'company', 'position']
};

const ROW_LABELS = {
  qualifications: 'Academic Qualification',
  memberships: 'Membership',
  experiences: 'Work Experience'
};

const ROW_FIELD_LABELS = {
  university: 'University / Institute',
  degree: 'Degree / Qualification',
  specialization: 'Specialization / Minor',
  duration: 'Duration',
  graduationDate: 'Graduation date',
  gpa: 'GPA',
  organization: 'Professional organization',
  category: 'Membership category',
  dateJoined: 'Date joined',
  fromMonth: 'From month',
  fromYear: 'From year',
  toMonth: 'To month',
  toYear: 'To year',
  company: 'Company',
  position: 'Position'
};

const REQUIRED_DOCUMENTS = ['degreeCertificate', 'nic', 'membershipProofs', 'employerLetter', 'transcript', 'paymentConfirmation'];

export const DOCUMENT_LABELS = {
  degreeCertificate: 'Degree / Diploma certificate',
  nic: 'NIC',
  membershipProofs: 'Membership proof',
  employerLetter: 'Employer consent letter',
  transcript: 'Transcript',
  paymentConfirmation: 'Payment confirmation'
};

// A document slot holds a File, an array of Files, or nothing.
export const hasDocument = (value) => (Array.isArray(value) ? value.length > 0 : Boolean(value));

// Returns '' when valid, otherwise the message to show.
// `name` is a top-level field ('email') or a row field ('qualifications.0.gpa').
export const validateField = (name, value) => {
  if (isBlank(value)) return REQUIRED_MESSAGE;
  const rule = FIELD_RULES[String(name).split('.').pop()];
  return rule ? rule(value) : '';
};

// Returns { 'email': 'message', 'qualifications.0.degree': 'message', ... } for every problem,
// in the order the fields appear on the page. Pass `captchaValue` to also check the captcha text.
export const validateApplication = (data, { captchaValue } = {}) => {
  const errors = {};

  PERSONAL_FIELDS.forEach((name) => {
    const message = validateField(name, data[name]);
    if (message) errors[name] = message;
  });

  Object.entries(ROW_FIELDS).forEach(([listName, fields]) => {
    (data[listName] || []).forEach((row, index) => {
      fields.forEach((field) => {
        const key = `${listName}.${index}.${field}`;
        const message = validateField(key, row[field]);
        if (message) errors[key] = message;
      });
    });
  });

  REQUIRED_DOCUMENTS.forEach((name) => {
    if (!hasDocument(data.documents?.[name])) errors[`documents.${name}`] = 'Please upload this document';
  });

  // The form has no declaration checkbox yet, so the captcha is the only check in that section.
  const captcha = String(data.captcha ?? '').trim().toLowerCase();
  if (!captcha) {
    errors.captcha = REQUIRED_MESSAGE;
  } else if (captchaValue !== undefined && captcha !== String(captchaValue).toLowerCase()) {
    errors.captcha = CAPTCHA_MESSAGE;
  }

  return errors;
};

export const getSectionOfField = (fieldKey) => {
  if (fieldKey.startsWith('qualifications.')) return 'academic';
  if (fieldKey.startsWith('memberships.')) return 'memberships';
  if (fieldKey.startsWith('experiences.')) return 'work';
  if (fieldKey.startsWith('documents.')) return 'documents';
  if (fieldKey === 'declaration' || fieldKey === 'captcha') return 'declaration';
  return 'personal';
};

// { personal: true, academic: false, ... }: true when the section has no errors.
export const getSectionCompletion = (data, options) => {
  const errors = validateApplication(data, options);
  const sectionsWithErrors = new Set(Object.keys(errors).map(getSectionOfField));
  return ['personal', 'academic', 'memberships', 'work', 'documents', 'declaration']
    .reduce((result, key) => ({ ...result, [key]: !sectionsWithErrors.has(key) }), {});
};

// Name of a field for the error summary, e.g. 'Full Name' or 'Academic Qualification 2, GPA'.
export const getFieldLabel = (fieldKey) => {
  const [listName, index, field] = fieldKey.split('.');

  if (ROW_LABELS[listName]) return `${ROW_LABELS[listName]} ${Number(index) + 1}, ${ROW_FIELD_LABELS[field] || field}`;
  if (listName === 'documents') return DOCUMENT_LABELS[index] || 'Document';
  if (fieldKey === 'captcha') return 'Captcha';
  return PERSONAL_LABELS[fieldKey] || fieldKey;
};

// One sentence for the submission modal, e.g. 'Please fill Full Name.' or
// 'Academic Qualification 2: GPA must be between 0 and 4.0.'
export const getErrorSummary = (fieldKey, message) => {
  const [listName, index] = fieldKey.split('.');

  if (ROW_LABELS[listName]) {
    const rowLabel = `${ROW_LABELS[listName]} ${Number(index) + 1}`;
    return message === REQUIRED_MESSAGE ? `Please complete all fields in ${rowLabel}.` : `${rowLabel}: ${message}.`;
  }

  if (listName === 'documents') return 'Please upload all required documents before submitting.';
  if (PERSONAL_LABELS[fieldKey] && message === REQUIRED_MESSAGE) return `Please fill ${PERSONAL_LABELS[fieldKey]}.`;
  return message;
};
