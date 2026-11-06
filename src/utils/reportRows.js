// Rows and labels shared by the Reports page and its CSV and PDF exports, so all three say the same thing.

// Pending also counts under review, shortlisted and any unusual status, so each program row adds up.
export const pendingOf = (status) => status.pending + status['under-review'] + status.shortlisted + status.other;

// One row of the "By program" table from a row (or the totals) of GET /api/reports/summary.
export const toProgramRow = (row) => ({
  key: row.program,
  name: row.deleted ? `Deleted program (${row.program})` : row.title,
  program: row.program,
  deleted: row.deleted,
  demo: row.demo,
  applications: row.applications,
  approved: row.status.approved,
  pending: pendingOf(row.status),
  rejected: row.status.rejected,
  card: row.payment.card,
  bank: row.payment.bank,
  none: row.payment.none,
  cardIncome: row.cardIncome,
  bankExpected: row.bankExpected
});

export const PROGRAM_COLUMNS = [
  { key: 'name', label: 'Program', text: true },
  { key: 'applications', label: 'Applications' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'card', label: 'Paid by card' },
  { key: 'bank', label: 'Bank receipt' },
  { key: 'none', label: 'Not paid' },
  { key: 'cardIncome', label: 'Collected', money: true }
];

const STATUS_LABELS = [
  ['pending', 'Pending'],
  ['under-review', 'Under review'],
  ['shortlisted', 'Shortlisted'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['other', 'Other status']
];

// Status bars; "Other status" only when some application has an unusual status.
export const statusItems = (status) => STATUS_LABELS
  .map(([key, label]) => ({ key, label, value: status[key] || 0 }))
  .filter((item) => item.key !== 'other' || item.value > 0);

// Same thresholds as server/utils/gpaCategory.js (best GPA of all qualifications).
const CATEGORY_LABELS = [
  ['Category 1', 'GPA 3.7 or above'],
  ['Category 2', 'GPA 3.3 to 3.69'],
  ['Category 3', 'GPA below 3.3'],
  ['No GPA', 'No GPA given']
];

export const categoryItems = (categories) => CATEGORY_LABELS
  .map(([key, hint]) => ({ key, label: key, hint, value: categories[key] || 0 }));

export const PAYMENT_METHOD_LABELS = {
  card: 'Card',
  bank: 'Bank receipt',
  none: 'No payment on record',
  testCard: 'Test card payment'
};
