// Programme data for the Department of Computer Science & Engineering.
// Used by upsertPrograms.js. Confirm every detail on postgrad.cse.mrt.ac.lk before running it.

// ProgramDetailPage.jsx matches these exact resource names to decide what each card does.
const resourcesFor = (title, shortCode) => [
  { name: `${title} - Course Details`, type: 'pdf', fileSize: '6 KB', url: `/resources/${shortCode}-details.pdf` },
  { name: 'Call for Application', type: 'pdf', fileSize: '720 KB', url: `/resources/${shortCode}-application.pdf` },
  { name: 'Online Application', type: 'form', url: `/apply/${shortCode}` }
];

const TBA = 'To be announced';

// Fields to correct on programmes that already exist. Only these fields are changed.
export const UPDATES = {
  'msc-cs': {
    level: 'MSc',
    description: 'A two-year, part-time MSc that deepens technical knowledge for practising computing professionals.',
    detailedDescription:
      'The MSc in Computer Science is a two-year, part-time programme (SLQF level 10) for practising professionals. ' +
      'Students can follow a broad programme or specialise in one area. Students who finish the coursework with a shorter project can exit with a PG Diploma.',
    specializations: [
      { name: 'Software Architecture' },
      { name: 'Security Engineering' },
      { name: 'Cloud Computing' },
      { name: 'Data Science, Engineering & Analytics' }
    ],
    duration: '2 years',
    mode: 'Part-time — Saturdays and weekday evenings',
    slqfLevel: 10
  },
  'msc-ds-ai': {
    level: 'MSc',
    description: 'An advanced MSc in machine learning, deep learning, artificial intelligence and data science.'
  },
  'mba-it': {
    level: 'MBA',
    description: 'Combines a general MBA with specialist knowledge of applying IT in management.'
  },
  'mba-egov': {
    level: 'MBA',
    description: 'Combines a general MBA with specialist knowledge of IT in government and public-sector management.'
  },
  'master-ds-ai': {
    level: 'Master',
    description: 'A professional master’s for working professionals, focused on applying data science and AI in industry.'
  }
};

// Real CSE programmes that are missing from the app.
export const NEW_PROGRAMS = [
  {
    title: 'Master of Computer Science',
    shortCode: 'mcs',
    level: 'Master',
    description: 'A one-year, part-time, coursework-only master’s for working professionals.',
    detailedDescription:
      'The Master of Computer Science is a one-year, part-time programme (SLQF level 9) made up of coursework only. ' +
      'It suits working professionals who want advanced computer science knowledge in a shorter time than the two-year MSc.',
    specializations: [],
    duration: '1 year',
    mode: 'Part-time',
    slqfLevel: 9,
    deadline: TBA,
    deadlines: { application: TBA, selectionExams: TBA },
    resources: resourcesFor('Master of Computer Science', 'mcs')
  },
  {
    title: 'PG Diploma in Computer Science',
    shortCode: 'pgd-cs',
    level: 'PG Diploma',
    description: 'A one-year postgraduate diploma: MSc coursework with a shorter project.',
    detailedDescription:
      'The PG Diploma in Computer Science covers the coursework of the MSc in Computer Science with a shorter project, and takes one year. ' +
      'It is also the exit award for MSc students who do not continue to the full degree.',
    specializations: [
      { name: 'Software Architecture' },
      { name: 'Security Engineering' },
      { name: 'Cloud Computing' },
      { name: 'Data Science, Engineering & Analytics' }
    ],
    duration: '1 year',
    mode: 'Part-time — Saturdays and weekday evenings',
    deadline: TBA,
    deadlines: { application: TBA, selectionExams: TBA },
    resources: resourcesFor('PG Diploma in Computer Science', 'pgd-cs')
  }
  // Add MPhil / PhD here only after the department confirms it (level: 'Research').
];

// Demo programmes built from CSE's own specialisation areas. NOT offered by the department.
export const PROPOSED_PROGRAMS = [
  ['MSc in Cyber Security', 'msc-cyber', 'MSc', ['Security Engineering', 'Digital Forensics', 'Network Security']],
  ['MSc in Software Engineering', 'msc-se', 'MSc', ['Software Architecture', 'DevOps & Cloud-Native', 'Software Quality']],
  ['MSc in Cloud & Distributed Computing', 'msc-cloud', 'MSc', ['Cloud Computing', 'Parallel Computing', 'Edge & IoT']],
  ['MSc in Networked & Mobile Systems', 'msc-net', 'MSc', ['Computer Networks', 'Mobile Computing', 'Internet of Things']],
  ['MBA in Business Analytics', 'mba-ba', 'MBA', ['Data-Driven Decision Making', 'BI & Visualisation']],
  ['MBA in Digital Transformation', 'mba-dt', 'MBA', ['IT Strategy', 'Information Systems Management', 'Digital Innovation']]
].map(([title, shortCode, level, specs]) => ({
  title,
  shortCode,
  level,
  isProposed: true,
  description: `Proposed programme in ${specs.join(', ').toLowerCase()}.`,
  detailedDescription: `${title} is a proposed programme shown for demonstration. It is not currently offered by the department.`,
  specializations: specs.map((name) => ({ name })),
  deadline: TBA,
  deadlines: { application: TBA, selectionExams: TBA },
  resources: resourcesFor(title, shortCode)
}));
