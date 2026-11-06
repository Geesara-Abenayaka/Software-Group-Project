// Builds the admin report from applications already loaded from the database.
// No database access here, so every rule can be tested on plain objects (server/tests/reportBuilder.test.js).
// A department receives hundreds of applications a year, so counting in JavaScript is fast; switch to a
// MongoDB aggregation only if one period ever holds tens of thousands.
import { getBestGpa, getCategoryFromGpa, NO_GPA_CATEGORY } from './gpaCategory.js';
import { normalizeNic, normalizeStatus, paymentKindOf, STATUS_KEYS, toSriLankaDay } from './reportRules.js';

export const CATEGORY_KEYS = ['Category 1', 'Category 2', 'Category 3', NO_GPA_CATEGORY];

// The payment column an application counts in. With test keys, test card payments are the only card
// payments there are, so they count as card (the page says it is test mode). With live keys they are
// kept apart as 'testCard' and left out of the money.
export const reportPaymentKind = (application, liveMode) => {
  const kind = paymentKindOf(application);
  if (kind === 'card-test') {
    return liveMode ? 'testCard' : 'card';
  }
  return kind;
};

const emptyCounts = () => ({
  applications: 0,
  status: Object.fromEntries(STATUS_KEYS.map((key) => [key, 0])),
  payment: { card: 0, bank: 0, none: 0, testCard: 0 },
  paid: 0,
  cardIncome: 0,
  bankExpected: 0
});

const addApplication = (row, application, kind) => {
  row.applications += 1;
  row.status[normalizeStatus(application.status)] += 1;
  row.payment[kind] += 1;
  if (kind === 'card') {
    // The amount saved with the payment, so a later fee change doesn't change old income.
    row.cardIncome += Number(application.payment?.amount) || 0;
  }
};

// Paid = card + bank receipt. Bank money isn't confirmed, so it is an estimate at the current fee.
const finish = (row, feeAmount) => ({
  ...row,
  paid: row.payment.card + row.payment.bank,
  bankExpected: row.payment.bank * feeAmount
});

/**
 * applications: lean documents with program, status, nicNo, submittedAt, payment, documents.paymentConfirmation
 *   and qualifications.gpa.
 * programs: the programs to list (shortCode, title, isProposed), already filtered like the applications.
 * fee: { amount } in rupees. liveMode: true when the server uses live Stripe keys.
 */
export const buildReport = ({ applications, programs, fee, liveMode = false }) => {
  const feeAmount = Number(fee?.amount) || 0;
  const totals = emptyCounts();
  const rowsByProgram = new Map();
  const applicationsByDay = new Map();
  const applicationsByNic = new Map();
  const categories = Object.fromEntries(CATEGORY_KEYS.map((key) => [key, 0]));

  for (const application of applications) {
    const kind = reportPaymentKind(application, liveMode);

    const programRow = rowsByProgram.get(application.program) || emptyCounts();
    addApplication(totals, application, kind);
    addApplication(programRow, application, kind);
    rowsByProgram.set(application.program, programRow);

    if (application.submittedAt) {
      const day = toSriLankaDay(application.submittedAt);
      applicationsByDay.set(day, (applicationsByDay.get(day) || 0) + 1);
    }

    const nic = normalizeNic(application.nicNo);
    if (nic) {
      applicationsByNic.set(nic, (applicationsByNic.get(nic) || 0) + 1);
    }

    categories[getCategoryFromGpa(getBestGpa(application.qualifications))] += 1;
  }

  const knownCodes = new Set(programs.map((program) => program.shortCode));
  const byProgram = programs.map((program) => ({
    program: program.shortCode,
    title: program.title || program.shortCode,
    deleted: false,
    demo: Boolean(program.isProposed),
    ...finish(rowsByProgram.get(program.shortCode) || emptyCounts(), feeAmount)
  }));

  // Applications whose program was deleted keep the old code. They get their own row so the rows add up.
  for (const [code, row] of rowsByProgram) {
    if (!knownCodes.has(code)) {
      byProgram.push({ program: code, title: '', deleted: true, demo: false, ...finish(row, feeAmount) });
    }
  }

  const nicCounts = [...applicationsByNic.values()];

  return {
    totals: {
      ...finish(totals, feeAmount),
      uniqueApplicants: nicCounts.length,
      multiProgramApplicants: nicCounts.filter((count) => count > 1).length
    },
    byProgram,
    byDay: [...applicationsByDay]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, applications: count })),
    categories
  };
};
