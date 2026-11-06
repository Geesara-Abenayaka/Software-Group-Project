import express from 'express';
import rateLimit from 'express-rate-limit';
import Application from '../models/Application.js';
import Program from '../models/Program.js';
import { getApplicationWindow } from '../utils/applicationWindow.js';
import {
  APPLICATION_FEE,
  createApplicationFeeIntent,
  getApplicationFeePayment,
  isStripeConfigured
} from '../utils/stripePayments.js';

const router = express.Router();

// Each payment start creates a PaymentIntent, so keep one address from creating hundreds. Applicants on
// one campus or office network share an address, so the limit leaves room for many of them.
const intentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many payment attempts. Please wait a few minutes and try again.' }
});

const NOT_CONFIGURED = {
  success: false,
  message: 'Card payment is not available right now. Please pay at the bank and upload the receipt instead.'
};

// Whether the form should offer card payment, and for how much.
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: isStripeConfigured(),
      amount: APPLICATION_FEE.amount,
      currency: APPLICATION_FEE.currency.toUpperCase()
    }
  });
});

// Starts a card payment of the application fee. The amount is set here, never by the browser.
// Body: { program, fullName, nicNo, email }
router.post('/intent', intentLimiter, async (req, res) => {
  if (!isStripeConfigured()) {
    return res.status(503).json(NOT_CONFIGURED);
  }

  try {
    const program = String(req.body?.program || '').trim();
    const nicNo = String(req.body?.nicNo || '').trim().toUpperCase();
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim();

    if (!program || !nicNo || !fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Enter your full name, NIC and email in Personal Particulars before paying.'
      });
    }

    const programDoc = await Program.findOne({ shortCode: program }).select('title shortCode applicationDeadline').lean();
    if (!programDoc) {
      return res.status(404).json({ success: false, message: 'Program not found.' });
    }

    // Don't take money from someone who can't apply.
    const applicationWindow = await getApplicationWindow(programDoc);
    if (!applicationWindow.open) {
      return res.status(403).json({ success: false, message: applicationWindow.message });
    }

    const alreadyApplied = await Application.exists({ program, nicNo });
    if (alreadyApplied) {
      return res.status(409).json({
        success: false,
        message: 'This NIC has already submitted an application for this program, so there is nothing to pay.'
      });
    }

    const intent = await createApplicationFeeIntent({ program, programTitle: programDoc.title, fullName, nicNo, email });

    return res.status(201).json({
      success: true,
      data: {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        amount: APPLICATION_FEE.amount,
        currency: APPLICATION_FEE.currency.toUpperCase()
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error.message);
    return res.status(502).json({ success: false, message: 'Could not start the card payment. Please try again.' });
  }
});

// The checked result of a card payment (status, card brand and last 4 digits, receipt link).
// The form calls it after paying and when it restores a saved draft.
router.get('/intent/:id', async (req, res) => {
  if (!isStripeConfigured()) {
    return res.status(503).json(NOT_CONFIGURED);
  }

  try {
    const payment = await getApplicationFeePayment(req.params.id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found.' });
    }

    const { applicationId, ...details } = payment;
    return res.json({ success: true, data: { ...details, used: Boolean(applicationId) } });
  } catch (error) {
    console.error('Error fetching payment:', error.message);
    return res.status(502).json({ success: false, message: 'Could not check the payment. Please try again.' });
  }
});

export default router;
