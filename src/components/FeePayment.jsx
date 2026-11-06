import { AlertCircle, ArrowUp, CheckCircle2, CreditCard, ExternalLink, Landmark, Lock, ShieldCheck } from 'lucide-react';
import { formatDate } from '../utils/formatDate';
import { describeCard, formatRupees } from '../utils/stripe';

/**
 * "Application fee" on the application form: pay online by card (Stripe) or upload a bank receipt.
 * `children` is the receipt upload, shown when "Bank receipt" is chosen. Once the card payment has gone
 * through, the choice is replaced by what was paid.
 *
 * `payment` is formData.onlinePayment; `cardAvailable` is false when the server has no Stripe keys,
 * and then only the receipt upload is shown, as before.
 */
function FeePayment({
  amount,
  cardAvailable,
  method,
  onMethodChange,
  payment,
  payerMissing,
  onGoToPersonal,
  onPay,
  isOpening,
  disabled,
  payButtonId,
  error,
  children
}) {
  const isPaid = payment?.status === 'succeeded';
  const errorId = `${payButtonId}-error`;

  return (
    <section className="fee-card" aria-labelledby="fee-card-title">
      <div className="fee-card__header">
        <div>
          <h3 id="fee-card-title" className="fee-card__title">
            Application fee
            <span className="required-mark" aria-hidden="true">*</span>
          </h3>
          <p className="fee-card__desc">
            {cardAvailable
              ? 'Pay the processing fee online by card, or pay at the bank and upload the receipt.'
              : 'Pay the processing fee at the bank and upload the receipt.'}
          </p>
        </div>
        <p className="fee-card__amount">
          <span className="sr-only">Amount: </span>
          {formatRupees(amount)}
        </p>
      </div>

      {isPaid ? (
        // Focus comes here when the payment window closes after paying (the Pay button is gone by then).
        <div className="fee-paid" id="fee-paid-summary" role="status" tabIndex={-1}>
          <CheckCircle2 size={28} className="fee-paid__icon" aria-hidden="true" />
          <div className="fee-paid__body">
            <p className="fee-paid__title">Application fee paid</p>
            <p className="fee-paid__meta">
              {formatRupees(payment.amount)}
              {payment.cardLast4 && <> · {describeCard(payment)}</>}
              {payment.paidAt && <> · {formatDate(payment.paidAt)}</>}
            </p>
            <p className="fee-paid__ref">Payment reference: <span>{payment.paymentIntentId}</span></p>
          </div>
          {payment.receiptUrl && (
            <a className="btn btn--secondary btn--sm fee-paid__receipt" href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
              Receipt
              <ExternalLink size={14} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      ) : (
        <>
          {cardAvailable && (
            <fieldset className="fee-options">
              <legend className="sr-only">How will you pay the application fee?</legend>
              <label className={`fee-option${method === 'card' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={method === 'card'}
                  onChange={() => onMethodChange('card')}
                />
                <span className="fee-option__icon" aria-hidden="true"><CreditCard size={20} /></span>
                <span className="fee-option__text">
                  <span className="fee-option__title">
                    Pay online by card
                    <span className="fee-option__tag">Instant</span>
                  </span>
                  <span className="fee-option__desc">Visa, Mastercard, Amex and more. No receipt to upload.</span>
                </span>
              </label>
              <label className={`fee-option${method === 'receipt' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="receipt"
                  checked={method === 'receipt'}
                  onChange={() => onMethodChange('receipt')}
                />
                <span className="fee-option__icon" aria-hidden="true"><Landmark size={20} /></span>
                <span className="fee-option__text">
                  <span className="fee-option__title">Bank receipt</span>
                  <span className="fee-option__desc">Paid at the bank or by Genie transfer? Upload the receipt.</span>
                </span>
              </label>
            </fieldset>
          )}

          {cardAvailable && method === 'card' ? (
            <div className="fee-pay">
              {payerMissing && (
                <div className="form-alert form-alert--info fee-pay__notice">
                  <AlertCircle size={18} aria-hidden="true" />
                  <div className="form-alert__body">
                    <p>Fill in your full name, NIC and email in Personal Particulars first. The payment is recorded under them.</p>
                    <button type="button" className="btn btn--quiet btn--sm fee-pay__goto" onClick={onGoToPersonal}>
                      <ArrowUp size={16} aria-hidden="true" />
                      Go to Personal Particulars
                    </button>
                  </div>
                </div>
              )}

              <div className="fee-pay__row">
                <button
                  type="button"
                  id={payButtonId}
                  className="btn btn--primary fee-pay__button"
                  onClick={onPay}
                  disabled={payerMissing || disabled || isOpening}
                  aria-describedby={error ? errorId : undefined}
                >
                  <Lock size={18} aria-hidden="true" />
                  Pay {formatRupees(amount)} now
                </button>
                <p className="fee-pay__secure">
                  <ShieldCheck size={16} aria-hidden="true" />
                  Secure payment by Stripe
                </p>
              </div>

              {error && (
                <p id={errorId} className="field-error">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{error}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="fee-receipt">{children}</div>
          )}
        </>
      )}
    </section>
  );
}

export default FeePayment;
