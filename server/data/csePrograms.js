// Programme data for the Department of Computer Science & Engineering.
// Used by upsertPrograms.js. Source: the department's 2027 course information and adverts
// (postgrad.cse.uom.lk, checked on 30 October 2026). Check it again before each intake.

// ProgramDetailPage.jsx matches these exact resource names to decide what each card does.
const resourcesFor = (title, shortCode) => [
  { name: `${title} - Course Details`, type: 'pdf', fileSize: '6 KB', url: `/resources/${shortCode}-details.pdf` },
  { name: 'Call for Application', type: 'pdf', fileSize: '720 KB', url: `/resources/${shortCode}-application.pdf` },
  { name: 'Online Application', type: 'form', url: `/apply/${shortCode}` }
];

const TBA = 'To be announced';

// The 2027 intake is closed for these programmes; the department opens the next one in July 2027.
const NEXT_INTAKE = 'To be announced (next intake opens July 2027)';
const closedIntake = {
  deadline: NEXT_INTAKE,
  deadlines: { application: NEXT_INTAKE, selectionExams: TBA },
  applicationDeadline: null
};

// MBA 2027 intake (2nd round).
const MBA_DEADLINE = '05th November 2026';
const mbaIntake = {
  deadline: MBA_DEADLINE,
  deadlines: {
    application: MBA_DEADLINE,
    selectionExams: 'Selection test 07th November 2026, interviews 07th and 08th November 2026'
  },
  applicationDeadline: new Date('2026-11-05')
};

const MBA_ELIGIBILITY = [
  'An honours bachelor’s degree of the University of Moratuwa, plus at least one year of work experience',
  'Any other four-year degree from a recognised university, plus at least one year of work experience',
  'Any other three-year degree from a recognised university, plus at least two years of work experience',
  'Membership of a recognised professional institute obtained through an academic route, plus at least two years of work experience'
];

// Fields to keep in line with the department's data. Only these fields are changed.
export const UPDATES = {
  'msc-cs': {
    level: 'MSc',
    description: 'A two-year, part-time MSc that deepens technical knowledge for practising computing professionals.',
    detailedDescription:
      'The MSc in Computer Science is a two-year, part-time programme (SLQF level 10) that gives practising professionals a greater depth of technical knowledge and exposure to emerging and niche areas of computing. ' +
      'It runs over six 12-week trimesters: taught modules first, then a research project in the chosen specialisation.',
    specializations: [
      { name: 'Cloud Computing' },
      { name: 'Computer Networks' },
      { name: 'Data Science, Engineering and Analytics' },
      { name: 'Information Systems Management' },
      { name: 'Mobile Computing' },
      { name: 'Parallel Computing' },
      { name: 'Security Engineering' },
      { name: 'Software Architecture' }
    ],
    duration: '2 years',
    mode: 'Part-time — Saturdays at the university (hybrid), some weekday evenings',
    slqfLevel: 10,
    fee: 'Rs. 700,000 (2027 intake): Rs. 100,000 registration + Rs. 600,000 course fee, payable in full or in instalments',
    eligibility: [
      'BSc Engineering (Hons) of the University of Moratuwa',
      'Any other four-year bachelor’s degree in Engineering, Science or Technology in a field relevant to Computer Science',
      'A three-year bachelor’s degree in Engineering, Science or Technology in a relevant field, plus at least one year of relevant work experience',
      'Membership of a recognised professional institute obtained through an academic route, plus at least one year of relevant work experience'
    ],
    ...closedIntake
  },
  'msc-ds-ai': {
    level: 'MSc',
    description: 'An advanced MSc in machine learning, deep learning, artificial intelligence and data science.',
    detailedDescription:
      'The MSc in Data Science and Artificial Intelligence is a two-year, part-time programme (SLQF level 10) for practising professionals with an engineering or science background. ' +
      'Compared with the data science specialisation of the MSc in Computer Science, it goes deeper into machine learning, deep learning, artificial intelligence and data science, alongside core computer science topics.',
    duration: '2 years',
    mode: 'Part-time — Saturdays at the university (hybrid), some weekday evenings',
    slqfLevel: 10,
    fee: 'Rs. 700,000 (2027 intake): Rs. 100,000 registration + Rs. 600,000 course fee, payable in full or in instalments',
    eligibility: [
      'BSc Engineering (Hons) of the University of Moratuwa',
      'Any other four-year bachelor’s degree in Engineering, Science or Technology in a field relevant to data science or AI',
      'A three-year bachelor’s degree in Engineering, Science or Technology in a relevant field, plus at least one year of relevant work experience',
      'Membership of a recognised professional institute obtained through an academic route, plus at least one year of relevant work experience'
    ],
    ...closedIntake
  },
  mcs: {
    level: 'Master',
    description: 'A one-year, part-time, coursework-only master’s for working professionals.',
    detailedDescription:
      'The Master of Computer Science is a one-year, part-time programme (SLQF level 9) made up entirely of coursework, with no research component. ' +
      'It runs over two 12-week semesters, mostly online, and ends with a capstone project.',
    specializations: [],
    duration: '1 year',
    mode: 'Part-time — online, mainly asynchronous',
    slqfLevel: 9,
    fee: 'Rs. 550,000 (2027 intake): Rs. 100,000 registration + Rs. 450,000 course fee, payable in full or in instalments',
    eligibility: [
      'BSc Engineering (Hons) of the University of Moratuwa',
      'Any other four-year bachelor’s degree in Engineering, Science or Technology in a field relevant to Computer Science',
      'A three-year bachelor’s degree in Engineering, Science or Technology in a relevant field, subject to passing the aptitude test',
      'Membership of a recognised professional institute obtained through an academic route, subject to passing the aptitude test'
    ],
    ...closedIntake
  },
  'master-ds-ai': {
    level: 'Master',
    description: 'A one-year, part-time, coursework-only master’s in data science and AI, taught online.',
    detailedDescription:
      'The Master of Data Science & AI is a one-year, part-time programme (SLQF level 9) made up entirely of coursework. ' +
      'It runs over three 12-week semesters, online, and ends with a capstone project.',
    specializations: [],
    duration: '1 year',
    mode: 'Part-time — online and asynchronous',
    slqfLevel: 9,
    fee: 'Rs. 550,000 (2027 intake): Rs. 100,000 registration + Rs. 450,000 course fee, payable in full or in instalments',
    eligibility: [
      'BSc Engineering of the University of Moratuwa in a relevant field',
      'Any other four-year degree in Engineering, Science or Technology in a relevant field',
      'A three-year degree in Engineering, Science or Technology in a relevant field, subject to passing the aptitude test',
      'Membership of a recognised professional institute obtained through an academic route'
    ],
    ...closedIntake
  },
  'mba-it': {
    level: 'MBA',
    description: 'Combines a general MBA with specialist knowledge of applying IT in management.',
    detailedDescription:
      'The MBA in Information Technology is a two-year, part-time programme (SLQF level 10) that combines a general MBA with specialist knowledge of applying IT in management. ' +
      'Students can specialise in Business Analytics, AI for Business or Project Management, or choose their own electives.',
    specializations: [
      { name: 'Business Analytics' },
      { name: 'AI for Business' },
      { name: 'Project Management' }
    ],
    duration: '2 years',
    mode: 'Part-time — Saturdays at the university',
    slqfLevel: 10,
    fee: 'Rs. 650,000 (2027 intake): Rs. 100,000 registration + Rs. 550,000 course fee, payable in full or in instalments',
    eligibility: MBA_ELIGIBILITY,
    ...mbaIntake
  },
  'mba-egov': {
    level: 'MBA',
    description: 'Combines a general MBA with specialist knowledge of IT in government and public-sector management.',
    detailedDescription:
      'The MBA in eGovernance is a two-year, part-time programme (SLQF level 10) that combines a general MBA with specialist knowledge of IT-enabled public-sector service design, delivery and management. ' +
      'It is aimed at professionals who will lead eGovernance work in public-sector organisations.',
    specializations: [
      { name: 'Public Sector Management' },
      { name: 'e-Government Concepts' },
      { name: 'Interoperability and Integration in e-Government' },
      { name: 'Legal Frameworks for e-Governance' }
    ],
    duration: '2 years',
    mode: 'Part-time — Saturdays at the university',
    slqfLevel: 10,
    fee: 'Rs. 650,000 (2027 intake): Rs. 100,000 registration + Rs. 550,000 course fee, payable in full or in instalments',
    eligibility: MBA_ELIGIBILITY,
    ...mbaIntake
  }
};

// CSE programmes that are missing from the app. They take the same fields as UPDATES.
// The department does not list a separate PG Diploma or MPhil / PhD, so they are not added.
export const NEW_PROGRAMS = [
  {
    title: 'Master of Computer Science',
    shortCode: 'mcs',
    ...UPDATES.mcs,
    resources: resourcesFor('Master of Computer Science', 'mcs')
  }
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
