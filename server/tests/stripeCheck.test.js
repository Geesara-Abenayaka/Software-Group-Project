// Run with: cd server && npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyStripePayments, toStripePayment } from '../utils/stripeCheck.js';

const intent = (id, overrides = {}, charge = {}) => ({
  id,
  amount: 200000,
  currency: 'lkr',
  created: 1793000000,
  livemode: false,
  status: 'succeeded',
  metadata: { purpose: 'application_fee', program: 'MSC-CS', nicNo: '1', fullName: 'A', email: 'a@x.lk', ...overrides },
  latest_charge: { amount_refunded: 0, disputed: false, ...charge }
});

test('a Stripe payment in rupees, with refund and dispute', () => {
  const payment = toStripePayment(intent('pi_1', { applicationId: 'app1' }, { amount_refunded: 200000, disputed: true }));
  assert.equal(payment.amount, 2000);
  assert.equal(payment.currency, 'LKR');
  assert.equal(payment.applicationId, 'app1');
  assert.equal(payment.refundedAmount, 2000);
  assert.equal(payment.disputed, true);
  assert.equal(payment.created, new Date(1793000000 * 1000).toISOString());
});

test('a payment without an expanded charge has no refund or dispute', () => {
  const payment = toStripePayment({ ...intent('pi_2'), latest_charge: 'ch_123' });
  assert.equal(payment.refundedAmount, 0);
  assert.equal(payment.disputed, false);
});

test('matched, no application, application deleted, refunds and disputes', () => {
  const payments = [
    intent('pi_matched'),
    intent('pi_linked', { applicationId: 'app-exists' }),
    intent('pi_orphan'),
    intent('pi_deleted', { applicationId: 'app-gone' }),
    intent('pi_refunded', { applicationId: 'app-exists-2' }, { amount_refunded: 200000 }),
    intent('pi_disputed', {}, { disputed: true })
  ].map(toStripePayment);

  const result = classifyStripePayments({
    payments,
    applicationsByIntentId: new Map([['pi_matched', { _id: 'app-m', fullName: 'A' }]]),
    existingApplicationIds: new Set(['app-exists', 'app-exists-2'])
  });

  assert.deepEqual(result.totals, {
    count: 6, amount: 12000, refunded: 2000, net: 10000, matchedCount: 3, matchedAmount: 6000
  });
  assert.deepEqual(result.noApplication.map((p) => p.paymentIntentId), ['pi_orphan', 'pi_disputed']);
  assert.deepEqual(result.applicationDeleted.map((p) => p.paymentIntentId), ['pi_deleted']);
  assert.deepEqual(result.refunds.map((p) => p.paymentIntentId), ['pi_refunded']);
  assert.deepEqual(result.disputes.map((p) => p.paymentIntentId), ['pi_disputed']);
});

test('no payments: zeros', () => {
  const result = classifyStripePayments({ payments: [], applicationsByIntentId: new Map(), existingApplicationIds: new Set() });
  assert.equal(result.totals.count, 0);
  assert.equal(result.totals.net, 0);
});
