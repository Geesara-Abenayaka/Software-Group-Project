// Rules for counting applications and payments in the admin reports, kept in one place so the
// report page, its exports and any later page count the same way.
// Days are Sri Lanka days (UTC+5:30, no daylight saving), the same as applicationWindow.js.
import { isDateString } from './applicationWindow.js';

export const REPORT_TIME_ZONE = 'Asia/Colombo';
const SRI_LANKA_OFFSET = '+05:30';

// '2026-11-01', '2026-11-30' -> the first and last moment of those days in Sri Lanka.
// A missing or invalid date gives null (no limit on that side).
export const toDateRange = (from, to) => ({
  start: isDateString(from) ? new Date(`${from}T00:00:00.000${SRI_LANKA_OFFSET}`) : null,
  end: isDateString(to) ? new Date(`${to}T23:59:59.999${SRI_LANKA_OFFSET}`) : null
});

// The Sri Lanka day of a moment, as yyyy-mm-dd.
export const toSriLankaDay = (date) => new Date(date).toLocaleDateString('en-CA', { timeZone: REPORT_TIME_ZONE });

// Statuses are stored in several spellings ('Approved', 'Application Rejected', 'Short Listed'...).
// Same groups as src/components/StatusPill.jsx.
const STATUS_GROUPS = {
  pending: 'pending',
  'under-review': 'under-review',
  review: 'under-review',
  'short-listed': 'shortlisted',
  shortlisted: 'shortlisted',
  approved: 'approved',
  rejected: 'rejected',
  'application-rejected': 'rejected'
};

export const STATUS_KEYS = ['pending', 'under-review', 'shortlisted', 'approved', 'rejected', 'other'];

export const normalizeStatus = (status) => {
  const key = String(status || 'pending').trim().toLowerCase().replace(/[\s_]+/g, '-');
  return STATUS_GROUPS[key] || 'other';
};

export const normalizeNic = (nic) => String(nic || '').trim().toUpperCase();

// How an application's fee was paid: 'card' (a live Stripe payment), 'card-test' (a Stripe test payment),
// 'bank' (a bank receipt was uploaded) or 'none'.
// Card payments saved before `livemode` was stored have none; they were all made with test keys.
export const paymentKindOf = (application) => {
  const payment = application?.payment;
  if (payment?.method === 'card' && payment.status === 'succeeded') {
    return payment.livemode === true ? 'card' : 'card-test';
  }
  return application?.documents?.paymentConfirmation ? 'bank' : 'none';
};

// 'live' or 'test' from the Stripe key in server/.env, 'off' without one.
export const getStripeMode = () => {
  const key = String(process.env.STRIPE_SECRET_KEY || '');
  if (/^(sk|rk)_live_/.test(key)) return 'live';
  if (/^(sk|rk)_test_/.test(key)) return 'test';
  return 'off';
};

// The short reference students and admins quote: APP-1A2B3C (same as src/utils/applicationReference.js).
export const toReference = (id) => (id ? `APP-${String(id).slice(-6).toUpperCase()}` : '');
