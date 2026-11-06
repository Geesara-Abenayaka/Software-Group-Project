import express from 'express';
import mongoose from 'mongoose';
import Application from '../models/Application.js';
import Program from '../models/Program.js';
import { isDateString } from '../utils/applicationWindow.js';
import { APPLICATION_FEE, getApplicationFeePayment, isStripeConfigured } from '../utils/stripePayments.js';
import { classifyStripePayments, searchApplicationFeePayments } from '../utils/stripeCheck.js';
import { buildReport, PAYMENT_KEYS, reportPaymentKind } from '../utils/reportBuilder.js';
import { loadReceiptMatches } from '../utils/receiptMatches.js';
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

const BANK_METHODS = ['bankConfirmed', 'bankWaiting', 'bankRejected'];

const toPaymentRow = (application, liveMode, programTitles, receiptMatches) => {
  const method = reportPaymentKind(application, liveMode);
  const payment = application.payment || {};
  const isCard = method === 'card' || method === 'testCard';
  const isBank = BANK_METHODS.includes(method);
  const receiptFileId = application.documents?.paymentConfirmation;
  const reviewed = method === 'bankConfirmed' || method === 'bankRejected';

  return {
    _id: String(application._id),
    reference: toReference(application._id),
    fullName: application.fullName || '',
    nicNo: application.nicNo || '',
    program: application.program,
    programTitle: programTitles.get(application.program) || '',
    submittedAt: application.submittedAt || null,
    method,
    // Card payments and confirmed receipts carry the amount collected; other rows have none.
    amount: isCard || method === 'bankConfirmed' ? Number(payment.amount) || 0 : null,
    paidAt: isCard ? payment.paidAt || null : null,
    cardBrand: isCard ? payment.cardBrand || '' : '',
    cardLast4: isCard ? payment.cardLast4 || '' : '',
    stripePaymentIntentId: isCard ? payment.stripePaymentIntentId || '' : '',
    receiptUrl: isCard ? payment.receiptUrl || '' : '',
    receiptFileId: isBank && receiptFileId ? String(receiptFileId) : '',
    reviewedBy: reviewed ? payment.reviewedBy || '' : '',
    reviewedAt: reviewed ? payment.reviewedAt || null : null,
    note: reviewed ? payment.note || '' : '',
    // Other applications that uploaded the same receipt file
    receiptMatches: isBank ? receiptMatches.get(String(application._id)) || [] : []
  };
};

// What ?method= accepts: one payment column, or 'bank' for every bank receipt.
const METHOD_FILTERS = {
  ...Object.fromEntries(PAYMENT_KEYS.map((key) => [key, [key]])),
  bank: BANK_METHODS
};

// One row per application in the period, with how its fee was paid. Newest first.
// GET /api/reports/payments?from&to&program&hideDemo&method=card|bank|bankWaiting|...&q=perera&page=1&limit=25
// limit=all returns every row (for the CSV export).
router.get('/payments', async (req, res) => {
  const filters = readFilters(req.query);
  if (filters.error) {
    return res.status(400).json({ success: false, message: filters.error });
  }

  const method = Object.hasOwn(METHOD_FILTERS, req.query.method) ? req.query.method : '';
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

    const hasReceipts = applications.some((application) => application.documents?.paymentConfirmation);
    const receiptMatches = hasReceipts ? await loadReceiptMatches() : new Map();

    let rows = applications.map((application) => toPaymentRow(application, liveMode, programTitles, receiptMatches));
    if (method) {
      rows = rows.filter((row) => METHOD_FILTERS[method].includes(row.method));
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

// How many database card payments missing from Stripe's search are looked up one by one.
const MAX_LOOKUPS = 25;

const dashboardUrl = (paymentIntentId, stripeMode) => (
  `https://dashboard.stripe.com/${stripeMode === 'live' ? '' : 'test/'}payments/${paymentIntentId}`
);

// Compares the card payments in Stripe with the applications in the database: payments with no application,
// payments whose application was deleted, refunds and disputes, and database card payments this Stripe
// account doesn't have. It calls Stripe, so the page runs it when asked, not on every load.
// GET /api/reports/stripe-check?from&to&program&hideDemo
router.get('/stripe-check', async (req, res) => {
  const filters = readFilters(req.query);
  if (filters.error) {
    return res.status(400).json({ success: false, message: filters.error });
  }
  if (!isStripeConfigured()) {
    return res.json({ success: true, data: { configured: false } });
  }

  try {
    const stripeMode = getStripeMode();
    const { allPrograms } = await buildQuery(filters);
    const programTitles = new Map(allPrograms.map((program) => [program.shortCode, program.title]));
    const demoCodes = allPrograms.filter((program) => program.isProposed).map((program) => program.shortCode);
    const inScope = (code) => (filters.program ? code === filters.program : !(filters.hideDemo && demoCodes.includes(code)));

    const { start, end } = toDateRange(filters.from, filters.to);
    const toSeconds = (date) => (date ? Math.floor(date.getTime() / 1000) : null);
    const payments = (await searchApplicationFeePayments({ start: toSeconds(start), end: toSeconds(end) }))
      .filter((payment) => inScope(payment.program));

    const intentIds = payments.map((payment) => payment.paymentIntentId);
    const linkedIds = payments.map((payment) => payment.applicationId).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const [savedWithPayment, stillThere] = await Promise.all([
      Application.find({ 'payment.stripePaymentIntentId': { $in: intentIds } })
        .select('fullName program payment.stripePaymentIntentId')
        .lean(),
      Application.find({ _id: { $in: linkedIds } }).select('_id').lean()
    ]);
    const applicationsByIntentId = new Map(savedWithPayment.map((application) => [application.payment.stripePaymentIntentId, application]));
    const existingApplicationIds = new Set(stillThere.map((application) => String(application._id)));

    const result = classifyStripePayments({ payments, applicationsByIntentId, existingApplicationIds });

    const describe = (payment) => {
      const application = applicationsByIntentId.get(payment.paymentIntentId);
      const applicationId = application
        ? String(application._id)
        : existingApplicationIds.has(payment.applicationId) ? payment.applicationId : '';
      return {
        ...payment,
        programTitle: programTitles.get(payment.program) || '',
        applicationId,
        reference: applicationId ? toReference(applicationId) : '',
        deletedApplicationReference: !applicationId && payment.applicationId ? toReference(payment.applicationId) : '',
        dashboardUrl: dashboardUrl(payment.paymentIntentId, stripeMode)
      };
    };

    // Card payments in the database that the search didn't return. Each is looked up by its id first,
    // because the search can take a minute to include a new payment. Only payments made with this kind of
    // key (live or test) can be in this Stripe account.
    const databaseFilter = {
      'payment.method': 'card',
      'payment.status': 'succeeded',
      'payment.livemode': stripeMode === 'live' ? true : { $ne: true }
    };
    if (start || end) {
      databaseFilter['payment.paidAt'] = {};
      if (start) databaseFilter['payment.paidAt'].$gte = start;
      if (end) databaseFilter['payment.paidAt'].$lte = end;
    }
    if (filters.program) {
      databaseFilter.program = filters.program;
    } else if (filters.hideDemo && demoCodes.length > 0) {
      databaseFilter.program = { $nin: demoCodes };
    }
    const found = new Set(intentIds);
    const notReturned = (await Application.find(databaseFilter).select('fullName nicNo program payment').lean())
      .filter((application) => !found.has(application.payment.stripePaymentIntentId));

    const toLookUp = notReturned.slice(0, MAX_LOOKUPS);
    const lookups = [];
    for (let index = 0; index < toLookUp.length; index += 5) {
      // Five at a time: quicker than one by one, and well inside Stripe's rate limit.
      lookups.push(...await Promise.all(toLookUp.slice(index, index + 5)
        .map((application) => getApplicationFeePayment(application.payment.stripePaymentIntentId))));
    }

    const missingInStripe = [];
    toLookUp.forEach((application, index) => {
      const payment = lookups[index];
      if (!payment || payment.status !== 'succeeded') {
        missingInStripe.push({
          applicationId: String(application._id),
          reference: toReference(application._id),
          fullName: application.fullName || '',
          nicNo: application.nicNo || '',
          program: application.program,
          programTitle: programTitles.get(application.program) || '',
          paymentIntentId: application.payment.stripePaymentIntentId,
          amount: application.payment.amount,
          paidAt: application.payment.paidAt || null
        });
      }
    });

    return res.json({
      success: true,
      data: {
        configured: true,
        stripeMode,
        checkedAt: new Date().toISOString(),
        filters: describeFilters(filters),
        totals: result.totals,
        noApplication: result.noApplication.map(describe),
        applicationDeleted: result.applicationDeleted.map(describe),
        refunds: result.refunds.map(describe),
        disputes: result.disputes.map(describe),
        missingInStripe,
        missingNotLookedUp: Math.max(0, notReturned.length - MAX_LOOKUPS)
      }
    });
  } catch (error) {
    console.error('Error comparing payments with Stripe:', error.message);
    return res.status(502).json({ success: false, message: "Couldn't reach Stripe. Please try again in a minute." });
  }
});

export default router;
