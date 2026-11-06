// Compares the application-fee payments in Stripe with the applications in the database.
// Stripe is the record of card money; this finds what the database alone can't show:
// payments with no application (the submission failed after paying, or the applicant paid twice),
// payments whose application was deleted, refunds and disputes made in Stripe, and card payments in the
// database that this Stripe account doesn't have (made with other keys).
import { getStripe } from './stripePayments.js';

const PURPOSE = 'application_fee';

// One Stripe PaymentIntent (with latest_charge expanded) as the check needs it. Amounts in rupees.
export const toStripePayment = (intent) => {
  const charge = typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
  return {
    paymentIntentId: intent.id,
    amount: intent.amount / 100,
    currency: String(intent.currency || '').toUpperCase(),
    created: new Date(intent.created * 1000).toISOString(),
    livemode: Boolean(intent.livemode),
    program: intent.metadata?.program || '',
    nicNo: intent.metadata?.nicNo || '',
    fullName: intent.metadata?.fullName || '',
    email: intent.metadata?.email || '',
    applicationId: intent.metadata?.applicationId || '',
    refundedAmount: charge ? (charge.amount_refunded || 0) / 100 : 0,
    disputed: Boolean(charge?.disputed)
  };
};

// Every succeeded application-fee payment created in the range (unix seconds, either may be null).
// Stripe's search can take up to a minute to include a brand-new payment.
export const searchApplicationFeePayments = async ({ start, end }) => {
  const query = [
    "status:'succeeded'",
    `metadata['purpose']:'${PURPOSE}'`,
    start ? `created>=${start}` : '',
    end ? `created<=${end}` : ''
  ].filter(Boolean).join(' AND ');

  const payments = [];
  let page;
  // Pages of 100; the cap stops a runaway loop (50,000 payments is far more than a year of applications).
  for (let pageCount = 0; pageCount < 500; pageCount += 1) {
    const result = await getStripe().paymentIntents.search({
      query,
      limit: 100,
      expand: ['data.latest_charge'],
      ...(page ? { page } : {})
    });
    payments.push(...result.data.map(toStripePayment));
    if (!result.has_more || !result.next_page) break;
    page = result.next_page;
  }
  return payments;
};

/**
 * Sorts the Stripe payments against the database. Pure, so it is tested without Stripe or MongoDB.
 * payments: from searchApplicationFeePayments.
 * applicationsByIntentId: Map paymentIntentId -> { _id, fullName, program } for applications saved with that payment.
 * existingApplicationIds: Set of application ids (strings) that still exist, among the payments' metadata.applicationId.
 */
export const classifyStripePayments = ({ payments, applicationsByIntentId, existingApplicationIds }) => {
  const matched = [];
  const noApplication = [];
  const applicationDeleted = [];

  for (const payment of payments) {
    const application = applicationsByIntentId.get(payment.paymentIntentId);
    if (application) {
      matched.push({ ...payment, applicationId: String(application._id) });
    } else if (payment.applicationId && existingApplicationIds.has(payment.applicationId)) {
      matched.push(payment);
    } else if (payment.applicationId) {
      applicationDeleted.push(payment);
    } else {
      noApplication.push(payment);
    }
  }

  const sum = (list, key = 'amount') => list.reduce((total, payment) => total + payment[key], 0);
  const refunds = payments.filter((payment) => payment.refundedAmount > 0);

  return {
    totals: {
      count: payments.length,
      amount: sum(payments),
      refunded: sum(refunds, 'refundedAmount'),
      net: sum(payments) - sum(refunds, 'refundedAmount'),
      matchedCount: matched.length,
      matchedAmount: sum(matched)
    },
    noApplication,
    applicationDeleted,
    refunds,
    disputes: payments.filter((payment) => payment.disputed)
  };
};
