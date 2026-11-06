// Card payment of the application fee through Stripe.
// `/pure` waits until loadStripe is called, so Stripe's script is only fetched when someone opens the payment window.
import { loadStripe } from '@stripe/stripe-js/pure';

const stripePromises = new Map();

export const getStripe = (publishableKey) => {
  if (!stripePromises.has(publishableKey)) {
    const promise = loadStripe(publishableKey);
    // A failed load (offline, blocked script) is forgotten, so "Try again" loads it again.
    promise.catch(() => stripePromises.delete(publishableKey));
    stripePromises.set(publishableKey, promise);
  }
  return stripePromises.get(publishableKey);
};

// "Rs. 2,000", as the fee is written everywhere else on the site.
export const formatRupees = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-US')}`;

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

// The card form lives in Stripe's iframe and can't see our CSS, so it gets the same tokens as plain values.
// Read from :root so the site's theme stays defined in one place (index.css).
export const buildStripeAppearance = () => {
  const styles = getComputedStyle(document.documentElement);
  const token = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;

  const brand = token('--brand', '#8b1a1a');
  const danger = token('--danger', '#991b1b');
  const border = token('--border-strong', '#d1d5db');
  const focusRing = token('--focus-ring', '0 0 0 3px rgba(139, 26, 26, 0.35)');

  return {
    theme: 'stripe',
    variables: {
      colorPrimary: brand,
      colorBackground: token('--surface', '#ffffff'),
      colorText: token('--ink', '#1f2937'),
      colorTextSecondary: token('--ink-muted', '#4b5563'),
      colorTextPlaceholder: token('--subtle', '#9ca3af'),
      colorDanger: danger,
      colorSuccess: token('--success', '#15803d'),
      fontFamily: token('--font-sans', 'system-ui, sans-serif'),
      fontSizeBase: '15px',
      fontWeightMedium: '600',
      borderRadius: token('--radius-sm', '6px'),
      spacingUnit: '4px',
      focusBoxShadow: focusRing,
      focusOutline: 'none'
    },
    rules: {
      '.Label': { color: token('--ink-soft', '#374151'), fontWeight: '600', marginBottom: '6px' },
      '.Input': { borderColor: border, boxShadow: 'none', padding: '12px' },
      '.Input:hover': { borderColor: token('--muted', '#6b7280') },
      '.Input:focus': { borderColor: brand, boxShadow: focusRing },
      '.Input--invalid': { borderColor: danger, boxShadow: 'none' },
      '.Error': { color: danger },
      '.Tab': { borderColor: token('--border', '#e5e7eb'), boxShadow: 'none' },
      '.Tab:hover': { borderColor: border },
      '.Tab--selected': { borderColor: brand, boxShadow: `0 0 0 1px ${brand}` },
      '.Tab--selected:hover': { borderColor: brand },
      '.Tab--selected:focus': { boxShadow: focusRing }
    }
  };
};
