import Stripe from 'stripe';

// The application processing fee, paid online by card through Stripe (or at the bank, with a receipt upload).
// Stripe counts LKR in cents, so Rs. 2,000 is 200000.
export const APPLICATION_FEE = { amount: 2000, currency: 'lkr' };
const FEE_IN_CENTS = APPLICATION_FEE.amount * 100;

// Marks the PaymentIntents this app creates, so other payments on the same Stripe account are never accepted.
const PURPOSE = 'application_fee';

let stripeClient = null;

// Both keys come from server/.env. Without them the server still runs; card payment is just unavailable.
export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);

export const getStripe = () => {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
};

// Stripe metadata values are limited to 500 characters.
const metadataValue = (value) => String(value ?? '').trim().slice(0, 500);

export const createApplicationFeeIntent = ({ program, programTitle, fullName, nicNo, email }) => (
  getStripe().paymentIntents.create({
    amount: FEE_IN_CENTS,
    currency: APPLICATION_FEE.currency,
    // Cards (and Link) only: nothing that sends the applicant away from the half-filled form.
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    description: `Application processing fee - ${programTitle || program}`,
    receipt_email: email || undefined,
    metadata: {
      purpose: PURPOSE,
      program: metadataValue(program),
      nicNo: metadataValue(nicNo),
      fullName: metadataValue(fullName),
      email: metadataValue(email)
    }
  })
);

// What the form, the admin view and the database need to know about a payment.
const summarize = (intent) => {
  const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  const card = charge?.payment_method_details?.card;
  return {
    paymentIntentId: intent.id,
    status: intent.status,
    amount: intent.amount / 100,
    currency: intent.currency.toUpperCase(),
    program: intent.metadata?.program || '',
    cardBrand: card?.brand || '',
    cardLast4: card?.last4 || '',
    receiptUrl: charge?.receipt_url || '',
    paidAt: charge ? new Date(charge.created * 1000).toISOString() : null,
    // false for payments made with test keys, so reports never count them as real money
    livemode: Boolean(intent.livemode)
  };
};

// Returns the payment's summary, or null when the id isn't an application-fee payment made through this app.
export const getApplicationFeePayment = async (paymentIntentId) => {
  if (!/^pi_[A-Za-z0-9]+$/.test(String(paymentIntentId || ''))) {
    return null;
  }

  try {
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    return intent.metadata?.purpose === PURPOSE ? { ...summarize(intent), applicationId: intent.metadata.applicationId || '' } : null;
  } catch (error) {
    if (error?.type === 'StripeInvalidRequestError') {
      return null; // unknown id
    }
    throw error;
  }
};

// Checks a card payment before an application is saved with it.
// Returns { ok: true, payment } for the Application's `payment` field, or { ok: false, message }.
export const verifyApplicationFeePayment = async (paymentIntentId, program) => {
  const payment = await getApplicationFeePayment(paymentIntentId);

  if (!payment) {
    return { ok: false, message: 'We could not find your card payment. Please pay again or upload your bank receipt.' };
  }
  if (payment.status !== 'succeeded') {
    return { ok: false, message: 'Your card payment has not gone through yet. Please complete the payment before submitting.' };
  }
  if (payment.amount !== APPLICATION_FEE.amount || payment.currency !== APPLICATION_FEE.currency.toUpperCase()) {
    return { ok: false, message: 'The card payment does not match the application fee.' };
  }
  if (payment.program !== program) {
    return { ok: false, message: 'This card payment was made for a different program.' };
  }
  if (payment.applicationId) {
    return { ok: false, message: 'This card payment has already been used for another application.' };
  }

  return {
    ok: true,
    payment: {
      method: 'card',
      status: payment.status,
      stripePaymentIntentId: payment.paymentIntentId,
      amount: payment.amount,
      currency: payment.currency,
      cardBrand: payment.cardBrand,
      cardLast4: payment.cardLast4,
      receiptUrl: payment.receiptUrl,
      paidAt: payment.paidAt,
      livemode: payment.livemode
    }
  };
};

// Links the payment to the saved application in the Stripe Dashboard, and stops it being used twice.
export const markPaymentUsed = (paymentIntentId, applicationId) => (
  getStripe().paymentIntents.update(paymentIntentId, { metadata: { applicationId: String(applicationId) } })
);
