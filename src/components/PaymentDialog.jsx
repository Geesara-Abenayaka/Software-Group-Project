import { useEffect, useMemo, useRef, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { AlertTriangle, ExternalLink, Lock, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { ButtonSpinner, Skeleton } from './Loaders';
import useDialogFocus from '../utils/useDialogFocus';
import { formatDate } from '../utils/formatDate';
import { buildStripeAppearance, describeCard, formatRupees, getStripe } from '../utils/stripe';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Stripe's own wording for card problems ("Your card was declined.") is clear; anything else gets ours.
const paymentErrorMessage = (error) => (
  error?.type === 'card_error' || error?.type === 'validation_error'
    ? error.message
    : 'The payment could not be completed. Please try again.'
);

// Stripe's card form, inside <Elements>. Calls onSucceeded with the payment as the server sees it.
function CardForm({ amount, payer, checkPayment, onProcessingChange, onSucceeded }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isReady, setIsReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const setProcessing = (value) => {
    setIsProcessing(value);
    onProcessingChange(value);
  };

  // The server's view of the payment (card brand, last digits, receipt). If that check fails,
  // the payment still went through: keep what Stripe.js returned; the server checks again on submit.
  const confirmedPayment = async (paymentIntent) => {
    try {
      return await checkPayment(paymentIntent.id);
    } catch {
      return {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase()
      };
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || isProcessing) return;

    setError('');
    setProcessing(true);
    try {
      // Shows Stripe's own messages next to empty or wrong card fields.
      const { error: fieldError } = await elements.submit();
      if (fieldError) {
        setError(paymentErrorMessage(fieldError));
        return;
      }

      // Cards that need 3-D Secure open the bank's check in a Stripe pop-up; the page never leaves the form.
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
      if (confirmError) {
        setError(paymentErrorMessage(confirmError));
        return;
      }

      // Cards almost always finish at once; give a slow bank a few seconds before giving up.
      let payment = await confirmedPayment(paymentIntent);
      for (let attempt = 0; payment.status === 'processing' && attempt < 5; attempt += 1) {
        await wait(2000);
        payment = await confirmedPayment(paymentIntent);
      }

      if (payment.status === 'succeeded') {
        onSucceeded(payment);
      } else if (payment.status === 'processing') {
        setError('Your bank is still processing the payment. Please wait a minute before trying again, so you are not charged twice.');
      } else {
        setError('The payment was not completed. Please try again.');
      }
    } catch {
      setError('Something went wrong while paying. Please check your internet connection and try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form className="pay-dialog__form" onSubmit={handleSubmit} noValidate>
      <div className="pay-dialog__element">
        {!isReady && !loadFailed && (
          <div className="pay-dialog__element-loading" aria-hidden="true">
            <Skeleton className="pay-skeleton pay-skeleton--label" />
            <Skeleton className="pay-skeleton pay-skeleton--input" />
            <div className="pay-skeleton-row">
              <Skeleton className="pay-skeleton pay-skeleton--input" />
              <Skeleton className="pay-skeleton pay-skeleton--input" />
            </div>
          </div>
        )}
        <PaymentElement
          options={{
            layout: 'tabs',
            business: { name: 'University of Moratuwa' },
            defaultValues: { billingDetails: { name: payer.fullName, email: payer.email } }
          }}
          onReady={() => setIsReady(true)}
          onChange={() => setError('')}
          onLoadError={() => {
            setLoadFailed(true);
            setError('The card form could not load. Please close this window and try again.');
          }}
        />
      </div>

      {error && (
        <div className="form-alert form-alert--error pay-dialog__error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <p className="form-alert__body">{error}</p>
        </div>
      )}

      <button type="submit" className="btn btn--primary pay-dialog__pay" disabled={!stripe || !isReady || isProcessing}>
        {isProcessing ? <ButtonSpinner /> : <Lock size={18} aria-hidden="true" />}
        {isProcessing ? 'Processing payment…' : `Pay ${formatRupees(amount)}`}
      </button>
    </form>
  );
}

function PaymentSuccess({ payment, onDone }) {
  const headingRef = useRef(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="pay-success">
      <svg className="success-check pay-success__check" width="64" height="64" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="3" />
        <path d="M15 27l7 7 15-15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 className="pay-success__title" tabIndex={-1} ref={headingRef}>Payment successful</h2>
      <p className="pay-success__lead">
        {formatRupees(payment.amount)} paid{payment.cardLast4 ? ` with ${describeCard(payment)}` : ''}
      </p>

      <dl className="pay-details">
        {payment.paidAt && (
          <div className="pay-details__row">
            <dt>Date</dt>
            <dd>{formatDate(payment.paidAt)}</dd>
          </div>
        )}
        <div className="pay-details__row">
          <dt>Payment reference</dt>
          <dd className="pay-details__ref">{payment.paymentIntentId}</dd>
        </div>
      </dl>

      <p className="pay-success__note">You don&rsquo;t need to upload a bank receipt. Finish the form and submit your application.</p>

      <div className="pay-success__actions">
        {payment.receiptUrl && (
          <a className="btn btn--secondary" href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
            View receipt
            <ExternalLink size={16} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
        <button type="button" className="btn btn--primary" onClick={onDone}>Continue application</button>
      </div>
    </div>
  );
}

/**
 * The card payment window for the application fee. `loadIntent()` starts (or reuses) the payment on the
 * server and returns { clientSecret, publishableKey, amount }; `checkPayment(id)` returns the server's
 * view of a payment. `onPaid(payment)` is called as soon as the payment succeeds, before the applicant
 * presses Continue, so closing the window can't lose it.
 */
function PaymentDialog({ amount, programName, payer, loadIntent, checkPayment, onPaid, onClose }) {
  const dialogRef = useRef(null);
  const [intent, setIntent] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payment, setPayment] = useState(null);
  const appearance = useMemo(() => buildStripeAppearance(), []);

  // Esc and the close button do nothing while a payment is going through.
  useDialogFocus(dialogRef, isProcessing ? null : onClose, true);

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadIntent()
      .then((data) => {
        if (!cancelled) setIntent(data);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message || 'Could not start the card payment. Please try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [loadIntent, attempt]);

  const stripePromise = intent ? getStripe(intent.publishableKey) : null;

  // Stripe's script can be blocked (ad blockers, firewalls); say so instead of loading forever.
  useEffect(() => {
    if (!stripePromise) return undefined;
    let cancelled = false;
    stripePromise
      .then((stripe) => {
        if (!stripe) throw new Error('missing');
      })
      .catch(() => {
        if (!cancelled) {
          setIntent(null);
          setLoadError('The secure card form could not load. Check your internet connection, turn off any ad blocker for this site, and try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [stripePromise]);

  const handleSucceeded = (result) => {
    setPayment(result);
    onPaid(result);
  };

  return (
    <div className="pay-overlay" onClick={(event) => event.target === event.currentTarget && !isProcessing && onClose()}>
      <div
        className="pay-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-dialog-title"
        aria-busy={isProcessing}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="pay-dialog__header">
          <div className="pay-dialog__heading">
            <span className="pay-dialog__badge" aria-hidden="true"><Lock size={18} /></span>
            <div>
              <h2 id="pay-dialog-title" className="pay-dialog__title">Pay application fee</h2>
              <p className="pay-dialog__subtitle">Secure card payment</p>
            </div>
          </div>
          <button
            type="button"
            className="pay-dialog__close"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close payment window"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="pay-dialog__body">
          {payment ? (
            <PaymentSuccess payment={payment} onDone={onClose} />
          ) : (
            <>
              <dl className="pay-summary">
                <div className="pay-summary__row">
                  <dt>Application processing fee</dt>
                  <dd>{programName}</dd>
                </div>
                <div className="pay-summary__row">
                  <dt>Applicant</dt>
                  <dd>{payer.fullName}<span className="pay-summary__nic">NIC {payer.nicNo}</span></dd>
                </div>
                <div className="pay-summary__row pay-summary__total">
                  <dt>Total</dt>
                  <dd>{formatRupees(intent?.amount ?? amount)}</dd>
                </div>
              </dl>

              {loadError ? (
                <div className="pay-dialog__load-error">
                  <div className="form-alert form-alert--error" role="alert">
                    <AlertTriangle size={18} aria-hidden="true" />
                    <p className="form-alert__body">{loadError}</p>
                  </div>
                  <button type="button" className="btn btn--secondary" onClick={() => {
                      setLoadError('');
                      setAttempt((count) => count + 1);
                    }}>
                    <RefreshCw size={16} aria-hidden="true" />
                    Try again
                  </button>
                </div>
              ) : intent ? (
                <Elements stripe={stripePromise} options={{ clientSecret: intent.clientSecret, appearance, loader: 'never' }}>
                  <CardForm
                    amount={intent.amount}
                    payer={payer}
                    checkPayment={checkPayment}
                    onProcessingChange={setIsProcessing}
                    onSucceeded={handleSucceeded}
                  />
                </Elements>
              ) : (
                <div className="pay-dialog__element-loading" role="status" aria-label="Loading the secure card form">
                  <Skeleton className="pay-skeleton pay-skeleton--label" />
                  <Skeleton className="pay-skeleton pay-skeleton--input" />
                  <div className="pay-skeleton-row">
                    <Skeleton className="pay-skeleton pay-skeleton--input" />
                    <Skeleton className="pay-skeleton pay-skeleton--input" />
                  </div>
                  <Skeleton className="pay-skeleton pay-skeleton--button" />
                </div>
              )}
            </>
          )}
        </div>

        {!payment && (
          <p className="pay-dialog__footer">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>
              Payments are processed by Stripe. Your card number goes straight to Stripe over an encrypted
              connection; the University never sees or stores it.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default PaymentDialog;
