import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  // Program Information
  program: {
    type: String,
    required: true
  },
  
  // Personal Particulars
  title: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  nameWithInitials: {
    type: String,
    required: true
  },
  nicNo: {
    type: String,
    required: true
  },
  telephone: {
    type: String
  },
  mobile: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  contactAddress: {
    type: String,
    required: true
  },
  
  // Qualifications
  qualifications: [{
    university: String,
    degree: String,
    specialization: String,
    duration: String,
    graduationDate: String
  }],
  
  // Registration Status
  partTime: {
    type: Boolean,
    default: false
  },
  alreadyRegistered: {
    type: Boolean,
    default: false
  },
  
  // Professional Memberships
  memberships: [{
    organization: String,
    category: String,
    dateJoined: String
  }],
  
  // Work Experience
  experiences: [{
    fromMonth: String,
    fromYear: String,
    toMonth: String,
    toYear: String,
    company: String,
    position: String
  }],
  
  // Documents (stored as file paths or base64)
  documents: {
    degreeCertificate: String,
    nic: String,
    employerLetter: String,
    transcript: String,
    paymentConfirmation: String
  },
  
  // Declaration
  declaration: {
    type: Boolean,
    required: true
  },
  
  // Captcha
  captcha: String,
  
  // Application Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under-review', 'Pending', 'Approved', 'Application Rejected', 'Short Listed'],
    default: 'pending'
  },
  
  // Marks
  oaMarks: {
    type: String,
    default: ''
  },
  writingMarks: {
    type: String,
    default: ''
  },
  interviewMarks: {
    type: String,
    default: ''
  },
  graduationDate: {
    type: String,
    default: ''
  },
  
  // Submission Date
  submittedAt: {
    type: Date,
    default: Date.now
  },
  
  // Admin notes
  adminNotes: String
}, {
  timestamps: true
});

const Application = mongoose.model('Application', applicationSchema);

export default Application;
