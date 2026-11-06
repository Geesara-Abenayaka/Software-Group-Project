import express from 'express';
import Application from '../models/Application.js';
import Program from '../models/Program.js';
import { isDateString } from '../utils/applicationWindow.js';
import { APPLICATION_FEE } from '../utils/stripePayments.js';
import { buildReport, reportPaymentKind } from '../utils/reportBuilder.js';
import { getStripeMode, toDateRange, toReference } from '../utils/reportRules.js';

// Admin reports: how many applied, how many paid the fee, and how much the fees brought in.
// The rules behind each number are in utils/reportRules.js and utils/reportBuilder.js.
const router = express.Router();

const SUMMARY_FIELDS = [
  'program',
  'status',
  'nicNo',
  'submittedAt',
  'payment.method',
  'payment.status',
  'payment.amount',
  'payment.livemode',
  'documents.paymentConfirmation',
  'qualifications.gpa'
].join(' ');

const PAYMENT_LIST_FIELDS = 'program fullName nicNo submittedAt payment documents.paymentConfirmation';

const PAYMENT_METHODS = ['card', 'bank', 'none', 'testCard'];

const FEE = { amount: APPLICATION_FEE.amount, currency: APPLICATION_FEE.currency.toUpperCase() };

// Reads the filters every report takes: from and to (yyyy-mm-dd, Sri Lanka days, both included),
// program (a short code) and hideDemo ('1' leaves out programs marked as proposed/demo).
// Values are always turned into strings, so a query such as ?program[$ne]=x can't reach MongoDB as an operator.
const readFilters = (query) => {
  const from = query.from ? String(query.from) : '';
  const to = query.to ? String(query.to) : '';
  const program = query.program ? String(query.program).trim() : '';
  const hideDemo = query.hideDemo === '1' || query.hideDemo === 'true';

  if ((from && !isDateString(from)) || (to && !isDateString(to))) {
    return { error: 'Dates must be real dates written as yyyy-mm-dd.' };
  }
  if (from && to && from > to) {
    return { error: 'The start date must be on or before the end date.' };
  }

  return { from, to, program, hideDemo };
};

// The MongoDB filter for those filters, and the programs the report lists.
const buildQuery = async ({ from, to, program, hideDemo }) => {
  const allPrograms = await Program.find().select('shortCode title isProposed').sort({ title: 1 }).lean();
  const filter = {};

  const { start, end } = toDateRange(from, to);
  if (start || end) {
    filter.submittedAt = {};
    if (start) filter.submittedAt.$gte = start;
    if (end) filter.submittedAt.$lte = end;
  }

  let programs = allPrograms;
  if (program) {
    // A program chosen by name is shown even when it is a demo program.
    filter.program = program;
    programs = allPrograms.filter((item) => item.shortCode === program);
  } else if (hideDemo) {
    const demoCodes = allPrograms.filter((item) => item.isProposed).map((item) => item.shortCode);
    if (demoCodes.length > 0) {
      filter.program = { $nin: demoCodes };
    }
    programs = allPrograms.filter((item) => !item.isProposed);
  }

  return { filter, programs, allPrograms };
};

const describeFilters = ({ from, to, program, hideDemo }) => ({
  from: from || null,
  to: to || null,
  program: program || null,
  hideDemo
});

// Totals, rows per program, applications per day and GPA categories.
// GET /api/reports/summary?from=2026-10-01&to=2026-11-30&program=MSC-CS&hideDemo=1
router.get('/summary', async (req, res) => {
  const filters = readFilters(req.query);
  if (filters.error) {
    return res.status(400).json({ success: false, message: filters.error });
  }

  try {
    const { filter, programs } = await buildQuery(filters);
    const applications = await Application.find(filter).select(SUMMARY_FIELDS).lean();
    const stripeMode = getStripeMode();

    const report = buildReport({ applications, programs, fee: FEE, liveMode: stripeMode === 'live' });

    return res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        filters: describeFilters(filters),
        fee: FEE,
        stripeMode,
        ...report
      }
    });
  } catch (error) {
    console.error('Error building report:', error);
    return res.status(500).json({ success: false, message: 'Could not build the report. Please try again.' });
  }
});

const toPaymentRow = (application, liveMode, programTitles) => {
  const method = reportPaymentKind(application, liveMode);
  const payment = application.payment || {};
  const isCard = method === 'card' || method === 'testCard';
  const receiptFileId = application.documents?.paymentConfirmation;

  return {
    _id: String(application._id),
    reference: toReference(application._id),
    fullName: application.fullName || '',
    nicNo: application.nicNo || '',
    program: application.program,
    programTitle: programTitles.get(application.program) || '',
    submittedAt: application.submittedAt || null,
    method,
    amount: isCard ? Number(payment.amount) || 0 : null,
    paidAt: isCard ? payment.paidAt || null : null,
    cardBrand: isCard ? payment.cardBrand || '' : '',
    cardLast4: isCard ? payment.cardLast4 || '' : '',
    stripePaymentIntentId: isCard ? payment.stripePaymentIntentId || '' : '',
    receiptUrl: isCard ? payment.receiptUrl || '' : '',
    receiptFileId: method === 'bank' && receiptFileId ? String(receiptFileId) : ''
  };
};

// One row per application in the period, with how its fee was paid. Newest first.
// GET /api/reports/payments?from&to&program&hideDemo&method=card|bank|none|testCard&q=perera&page=1&limit=25
// limit=all returns every row (for the CSV export).
router.get('/payments', async (req, res) => {
  const filters = readFilters(req.query);
  if (filters.error) {
    return res.status(400).json({ success: false, message: filters.error });
  }

  const method = PAYMENT_METHODS.includes(req.query.method) ? req.query.method : '';
  const search = String(req.query.q || '').trim().toLowerCase();
  const returnAll = req.query.limit === 'all';
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 200);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  try {
    const { filter, allPrograms } = await buildQuery(filters);
    const applications = await Application.find(filter)
      .select(PAYMENT_LIST_FIELDS)
      .sort({ submittedAt: -1 })
      .lean();

    const liveMode = getStripeMode() === 'live';
    const programTitles = new Map(allPrograms.map((program) => [program.shortCode, program.title]));

    let rows = applications.map((application) => toPaymentRow(application, liveMode, programTitles));
    if (method) {
      rows = rows.filter((row) => row.method === method);
    }
    if (search) {
      rows = rows.filter((row) => [row.fullName, row.nicNo, row.reference]
        .some((value) => value.toLowerCase().includes(search)));
    }

    const total = rows.length;
    const pageRows = returnAll ? rows : rows.slice((page - 1) * limit, page * limit);

    return res.json({
      success: true,
      data: pageRows,
      total,
      page: returnAll ? 1 : page,
      limit: returnAll ? total : limit,
      filters: { ...describeFilters(filters), method: method || null, q: search || null }
    });
  } catch (error) {
    console.error('Error listing report payments:', error);
    return res.status(500).json({ success: false, message: 'Could not load the payment list. Please try again.' });
  }
});

export default router;
