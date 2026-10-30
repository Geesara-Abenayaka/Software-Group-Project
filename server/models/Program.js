import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['pdf', 'doc', 'link', 'form'],
    required: true
  },
  fileSize: String,
  url: String
});

const specializationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }
});

const programSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true
  },
  shortCode: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  detailedDescription: {
    type: String
  },
  deadline: {
    type: String,
    required: true
  },
  resourcesCount: {
    type: Number,
    default: 0
  },
  specializations: [specializationSchema],
  deadlines: {
    application: String,
    selectionExams: String
  },
  resources: [resourceSchema],
  level: {
    type: String,
    enum: ['MSc', 'MBA', 'Master', 'PG Diploma', 'Research'],
    default: 'MSc'
  },
  department: {
    type: String,
    default: 'Computer Science & Engineering'
  },
  duration: String,          // e.g. '2 years'
  mode: String,              // e.g. 'Part-time — Saturdays and weekday evenings'
  slqfLevel: Number,         // e.g. 10
  fee: String,               // free text, e.g. 'Rs. 450,000 (in 4 instalments)'
  eligibility: [String],     // one requirement per item
  applicationDeadline: Date, // real date, used for "Closing soon" badges and sorting
  isProposed: {
    type: Boolean,
    default: false           // true = demo programme, not offered by the department
  },
  icon: {
    type: String,
    default: 'graduation-cap'
  },
  color: {
    type: String,
    default: '#6B7280'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
programSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Program = mongoose.model('Program', programSchema);

export default Program;
