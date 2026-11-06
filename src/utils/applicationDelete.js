import { formatRupees } from './formatMoney';

// The confirm text before an admin deletes an application. A card payment is mentioned, because deleting
// the application also removes the payment from the reports, while the money stays in Stripe.
export const deleteConfirmMessage = (payment) => (
  payment?.method === 'card'
    ? `This can't be undone. This application has a card payment of ${formatRupees(payment.amount || 2000)}. `
      + 'Deleting it removes the payment from the reports; the money stays in Stripe.'
    : "This can't be undone."
);
