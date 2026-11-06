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
