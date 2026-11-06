// Money, counts and card text, shared by the application form, the admin application page and the reports.
// Kept apart from stripe.js so pages that only show amounts don't load Stripe's loader.

// "Rs. 2,000", as the fee is written everywhere else on the site.
export const formatRupees = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-US')}`;

// "1,250"
export const formatCount = (value) => Number(value || 0).toLocaleString('en-US');

const CARD_BRANDS = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay'
};

// "Visa •••• 4242"
export const describeCard = ({ cardBrand, cardLast4 } = {}) => {
  const brand = CARD_BRANDS[cardBrand] || (cardBrand ? cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1) : 'Card');
  return cardLast4 ? `${brand} •••• ${cardLast4}` : brand;
};
