import { formatCount, formatRupees } from '../../utils/formatMoney';

/**
 * One bar split by how the fee was paid, with a legend that carries every number,
 * so the colours are never the only way to read it.
 */
function PaymentSplit({ totals }) {
  const { payment, cardIncome, bankIncome, bankExpected } = totals;

  const parts = [
    { key: 'card', label: 'Card', count: payment.card, detail: `${formatRupees(cardIncome)} collected` },
    {
      key: 'bank-confirmed',
      label: 'Bank receipt, confirmed',
      count: payment.bankConfirmed,
      detail: `${formatRupees(bankIncome)} collected`
    },
    {
      key: 'bank-waiting',
      label: 'Bank receipt, not checked yet',
      count: payment.bankWaiting,
      detail: payment.bankWaiting > 0 ? `${formatRupees(bankExpected)} expected` : ''
    },
    {
      key: 'bank-rejected',
      label: 'Bank receipt, rejected',
      count: payment.bankRejected,
      detail: payment.bankRejected > 0 ? 'counted as not paid' : ''
    },
    { key: 'none', label: 'No payment on record', count: payment.none, detail: '' }
  ];
  if (payment.testCard > 0) {
    parts.push({ key: 'test', label: 'Test card payment', count: payment.testCard, detail: 'left out of the totals' });
  }

  const total = parts.reduce((sum, part) => sum + part.count, 0);
  const share = (count) => (total ? Math.round((count / total) * 100) : 0);

  return (
    <section className="report-card" aria-labelledby="report-split-title">
      <h2 id="report-split-title" className="report-card__title">How the fee was paid</h2>

      <div className="report-split" aria-hidden="true">
        {parts.filter((part) => part.count > 0).map((part) => (
          <span
            key={part.key}
            className={`report-split__part report-split__part--${part.key}`}
            style={{ flexGrow: part.count }}
          />
        ))}
      </div>

      <ul className="report-legend">
        {parts.map((part) => (
          <li key={part.key} className="report-legend__item">
            <span className={`report-legend__swatch report-split__part--${part.key}`} aria-hidden="true" />
            <span className="report-legend__label">{part.label}</span>
            <span className="report-legend__count">
              {formatCount(part.count)}
              <span className="report-legend__share"> ({share(part.count)}%)</span>
            </span>
            {part.detail && <span className="report-legend__detail">{part.detail}</span>}
          </li>
        ))}
      </ul>

      <p className="report-card__note">
        Collected is card payments plus bank receipts an admin has confirmed. The fee is not refunded when an
        application is rejected. Use "Check with Stripe" below for refunds and disputes made in Stripe.
      </p>
    </section>
  );
}

export default PaymentSplit;
