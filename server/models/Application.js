import mongoose from 'mongoose';

const qualificationSchema = new mongoose.Schema({
  university: String,
  degree: String,
  specialization: String,
  duration: String,
  graduationDate: String,
  gpa: {
    type: Number,
    min: [0, 'GPA must be greater than or equal to 0'],
    max: [4, 'GPA must be less than or equal to 4.0']
  }
}, { _id: false });

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
  qualifications: [qualificationSchema],
  
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
  
  // Documents (stored as GridFS file IDs)
  documents: {
    degreeCertificate: [mongoose.Schema.Types.ObjectId], // Array for multiple files
    membershipProofs: [mongoose.Schema.Types.ObjectId],   // Array for multiple files
    nic: mongoose.Schema.Types.ObjectId,                   // Single file
    employerLetter: [mongoose.Schema.Types.ObjectId],     // Array for multiple files
    transcript: mongoose.Schema.Types.ObjectId,            // Single file
    paymentConfirmation: mongoose.Schema.Types.ObjectId    // Single file
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

// Optimizes admin list/filter/sort and NIC search queries.
applicationSchema.index({ program: 1, submittedAt: -1 });
applicationSchema.index({ status: 1, submittedAt: -1 });
applicationSchema.index({ nicNo: 1 });
applicationSchema.index({ submittedAt: -1 });
applicationSchema.index({ program: 1, nicNo: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);

export default Application;
