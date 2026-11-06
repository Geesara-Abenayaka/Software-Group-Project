// Run with: cd server && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReport, reportPaymentKind } from '../utils/reportBuilder.js';
import { getStripeMode, normalizeStatus, paymentKindOf, toDateRange, toReference, toSriLankaDay } from '../utils/reportRules.js';

const FEE = { amount: 2000 };

const PROGRAMS = [
  { shortCode: 'MSC-CS', title: 'MSc in Computer Science', isProposed: false },
  { shortCode: 'MSC-DS', title: 'MSc in Data Science', isProposed: false }
];

const cardPayment = (overrides = {}) => ({
  method: 'card', status: 'succeeded', amount: 2000, currency: 'LKR', livemode: true, ...overrides
});

const application = (overrides = {}) => ({
  program: 'MSC-CS',
  status: 'pending',
  nicNo: '199912345678',
  submittedAt: new Date('2026-11-02T06:00:00Z'),
  qualifications: [],
  ...overrides
});

test('status spellings are merged', () => {
  assert.equal(normalizeStatus('Approved'), 'approved');
  assert.equal(normalizeStatus('approved'), 'approved');
  assert.equal(normalizeStatus('Rejected'), 'rejected');
  assert.equal(normalizeStatus('Application Rejected'), 'rejected');
  assert.equal(normalizeStatus('Short Listed'), 'shortlisted');
  assert.equal(normalizeStatus('under-review'), 'under-review');
  assert.equal(normalizeStatus('Under Review'), 'under-review');
  assert.equal(normalizeStatus('Pending'), 'pending');
  assert.equal(normalizeStatus(undefined), 'pending');
  assert.equal(normalizeStatus('waitlisted'), 'other');
});

test('payment kinds', () => {
  assert.equal(paymentKindOf(application({ payment: cardPayment() })), 'card');
  assert.equal(paymentKindOf(application({ payment: cardPayment({ livemode: false }) })), 'card-test');
  // Saved before livemode was stored: made with test keys.
  assert.equal(paymentKindOf(application({ payment: cardPayment({ livemode: undefined }) })), 'card-test');
  assert.equal(paymentKindOf(application({ payment: cardPayment({ status: 'processing' }) })), 'none');
  assert.equal(paymentKindOf(application({ documents: { paymentConfirmation: 'abc123' } })), 'bank-waiting');
  assert.equal(paymentKindOf(application({
    documents: { paymentConfirmation: 'abc123' }, payment: { method: 'bank', status: 'confirmed', amount: 2000 }
  })), 'bank-confirmed');
  assert.equal(paymentKindOf(application({
    documents: { paymentConfirmation: 'abc123' }, payment: { method: 'bank', status: 'rejected' }
  })), 'bank-rejected');
  assert.equal(paymentKindOf(application({ documents: {} })), 'none');
  assert.equal(paymentKindOf(application()), 'none');
});

test('test card payments count as card in test mode and are kept apart in live mode', () => {
  const testPaid = application({ payment: cardPayment({ livemode: undefined }) });
  assert.equal(reportPaymentKind(testPaid, false), 'card');
  assert.equal(reportPaymentKind(testPaid, true), 'testCard');

  const applications = [testPaid, application({ nicNo: '2', payment: cardPayment() })];

  const testReport = buildReport({ applications, programs: PROGRAMS, fee: FEE, liveMode: false });
  assert.equal(testReport.totals.payment.card, 2);
  assert.equal(testReport.totals.cardIncome, 4000);

  const liveReport = buildReport({ applications, programs: PROGRAMS, fee: FEE, liveMode: true });
  assert.equal(liveReport.totals.payment.card, 1);
  assert.equal(liveReport.totals.payment.testCard, 1);
  assert.equal(liveReport.totals.paid, 1);
  assert.equal(liveReport.totals.cardIncome, 2000);
});

test('totals: card, bank, none, paid, income and the bank estimate', () => {
  const report = buildReport({
    applications: [
      application({ nicNo: '1', payment: cardPayment() }),
      application({ nicNo: '2', payment: cardPayment() }),
      application({ nicNo: '3', documents: { paymentConfirmation: 'f1' } }),
      application({ nicNo: '4' })
    ],
    programs: PROGRAMS,
    fee: FEE,
    liveMode: true
  });

  assert.equal(report.totals.applications, 4);
  assert.deepEqual(report.totals.payment, {
    card: 2, bankConfirmed: 0, bankWaiting: 1, bankRejected: 0, none: 1, testCard: 0
  });
  assert.equal(report.totals.paid, 3);
  assert.equal(report.totals.cardIncome, 4000);
  assert.equal(report.totals.bankExpected, 2000);
});

test('the status of an application never changes its money', () => {
  const report = buildReport({
    applications: [
      application({ nicNo: '1', status: 'Application Rejected', payment: cardPayment() }),
      application({ nicNo: '2', status: 'approved', payment: cardPayment() })
    ],
    programs: PROGRAMS,
    fee: FEE,
    liveMode: true
  });

  assert.equal(report.totals.status.rejected, 1);
  assert.equal(report.totals.status.approved, 1);
  assert.equal(report.totals.cardIncome, 4000);
});

test('card income uses the amount saved with each payment, not the current fee', () => {
  const report = buildReport({
    applications: [application({ payment: cardPayment({ amount: 1500 }) })],
    programs: PROGRAMS,
    fee: FEE,
    liveMode: true
  });
  assert.equal(report.totals.cardIncome, 1500);
});

test('one person in two programs: two applications, one student, one applied to 2+', () => {
  const report = buildReport({
    applications: [
      application({ program: 'MSC-CS', nicNo: '991234567V' }),
      application({ program: 'MSC-DS', nicNo: ' 991234567v ' }),
      application({ program: 'MSC-DS', nicNo: '200012345678' })
    ],
    programs: PROGRAMS,
    fee: FEE
  });

  assert.equal(report.totals.applications, 3);
  assert.equal(report.totals.uniqueApplicants, 2);
  assert.equal(report.totals.multiProgramApplicants, 1);
});

test('days are Sri Lanka days', () => {
  // 31 October 19:00 UTC is 1 November 00:30 in Sri Lanka.
  assert.equal(toSriLankaDay('2026-10-31T19:00:00Z'), '2026-11-01');
  assert.equal(toSriLankaDay('2026-10-31T18:29:59Z'), '2026-10-31');

  const report = buildReport({
    applications: [
      application({ nicNo: '1', submittedAt: new Date('2026-10-31T19:00:00Z') }),
      application({ nicNo: '2', submittedAt: new Date('2026-11-01T10:00:00Z') }),
      application({ nicNo: '3', submittedAt: new Date('2026-10-30T10:00:00Z') })
    ],
    programs: PROGRAMS,
    fee: FEE
  });

  assert.deepEqual(report.byDay, [
    { date: '2026-10-30', applications: 1 },
    { date: '2026-11-01', applications: 2 }
  ]);
});

test('date range covers whole Sri Lanka days', () => {
  const { start, end } = toDateRange('2026-11-01', '2026-11-30');
  assert.equal(start.toISOString(), '2026-10-31T18:30:00.000Z');
  assert.equal(end.toISOString(), '2026-11-30T18:29:59.999Z');

  assert.deepEqual(toDateRange('', 'not a date'), { start: null, end: null });
  assert.deepEqual(toDateRange('2026-02-30', undefined), { start: null, end: null });
});

test('programs: every program has a row, a deleted program gets its own, and rows add up', () => {
  const report = buildReport({
    applications: [
      application({ program: 'MSC-CS', nicNo: '1', payment: cardPayment() }),
      application({ program: 'OLD-PROG', nicNo: '2', documents: { paymentConfirmation: 'f' } })
    ],
    programs: PROGRAMS,
    fee: FEE,
    liveMode: true
  });

  assert.equal(report.byProgram.length, 3);
  const [cs, ds, deleted] = report.byProgram;
  assert.equal(cs.applications, 1);
  assert.equal(cs.cardIncome, 2000);
  assert.equal(ds.applications, 0);
  assert.deepEqual({ program: deleted.program, deleted: deleted.deleted, waiting: deleted.payment.bankWaiting },
    { program: 'OLD-PROG', deleted: true, waiting: 1 });

  const sum = (key) => report.byProgram.reduce((total, row) => total + row[key], 0);
  for (const key of ['applications', 'paid', 'cardIncome', 'bankIncome', 'income', 'bankExpected']) {
    assert.equal(sum(key), report.totals[key], key);
  }
});

test('bank receipts: confirmed ones are collected money, waiting ones expected, rejected ones not paid', () => {
  const receipt = { paymentConfirmation: 'file' };
  const report = buildReport({
    applications: [
      application({ nicNo: '1', payment: cardPayment() }),
      application({ nicNo: '2', documents: receipt, payment: { method: 'bank', status: 'confirmed', amount: 2000 } }),
      application({ nicNo: '3', documents: receipt, payment: { method: 'bank', status: 'confirmed' } }),
      application({ nicNo: '4', documents: receipt }),
      application({ nicNo: '5', documents: receipt, payment: { method: 'bank', status: 'rejected' } }),
      application({ nicNo: '6' })
    ],
    programs: PROGRAMS,
    fee: FEE,
    liveMode: true
  });

  const { totals } = report;
  assert.deepEqual(totals.payment, { card: 1, bankConfirmed: 2, bankWaiting: 1, bankRejected: 1, none: 1, testCard: 0 });
  assert.equal(totals.paid, 4, 'card + confirmed + waiting');
  assert.equal(totals.cardIncome, 2000);
  assert.equal(totals.bankIncome, 4000, 'a confirmed receipt without an amount counts at the current fee');
  assert.equal(totals.income, 6000);
  assert.equal(totals.bankExpected, 2000, 'only the receipt still waiting');
  const { paid, payment, applications } = totals;
  assert.equal(paid + payment.bankRejected + payment.none + payment.testCard, applications);
});

test('GPA categories use the best GPA', () => {
  const report = buildReport({
    applications: [
      application({ nicNo: '1', qualifications: [{ gpa: 3.1 }, { gpa: 3.8 }] }),
      application({ nicNo: '2', qualifications: [{ gpa: 3.4 }] }),
      application({ nicNo: '3', qualifications: [{ gpa: 2.9 }] }),
      application({ nicNo: '4', qualifications: [{ gpa: null }] })
    ],
    programs: PROGRAMS,
    fee: FEE
  });

  assert.deepEqual(report.categories, { 'Category 1': 1, 'Category 2': 1, 'Category 3': 1, 'No GPA': 1 });
});

test('an empty period gives zeros, not errors', () => {
  const report = buildReport({ applications: [], programs: PROGRAMS, fee: FEE });
  assert.equal(report.totals.applications, 0);
  assert.equal(report.totals.uniqueApplicants, 0);
  assert.equal(report.byProgram.length, 2);
  assert.deepEqual(report.byDay, []);
});

test('Stripe mode comes from the secret key', () => {
  const saved = process.env.STRIPE_SECRET_KEY;
  try {
    process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
    assert.equal(getStripeMode(), 'live');
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    assert.equal(getStripeMode(), 'test');
    process.env.STRIPE_SECRET_KEY = '';
    assert.equal(getStripeMode(), 'off');
  } finally {
    if (saved === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = saved;
  }
});

test('reference numbers match the front end', () => {
  assert.equal(toReference('6729f1c2a1b2c3d4e51a2b3c'), 'APP-1A2B3C');
  assert.equal(toReference(''), '');
});
