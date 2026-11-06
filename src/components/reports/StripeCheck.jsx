import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { ButtonSpinner } from '../Loaders';
import API_BASE_URL from '../../utils/apiConfig';
import { adminFetch } from '../../utils/adminSession';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { formatCount, formatRupees } from '../../utils/formatMoney';
import { errorMessage, readJson } from '../../utils/readJson';

function StripeLink({ payment }) {
  return (
    <a className="report-link report-pay__link" href={payment.dashboardUrl} target="_blank" rel="noopener noreferrer">
      Open in Stripe
      <ExternalLink size={13} aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function ApplicationLink({ payment }) {
  if (payment.applicationId) {
    return <Link to={`/admin/application/${payment.applicationId}`} className="report-link">{payment.reference}</Link>;
  }
  if (payment.deletedApplicationReference) {
    return <span className="report-muted">{payment.deletedApplicationReference} (deleted)</span>;
  }
  return <span className="report-muted">None</span>;
}

// One list of payments that need someone's attention.
function IssueTable({ id, title, hint, payments, amountKey = 'amount', amountLabel = 'Amount' }) {
  if (!payments.length) return null;
  return (
    <div className="stripe-check__issue">
      <h3 id={id} className="stripe-check__issue-title">
        {title} <span className="stripe-check__count">{formatCount(payments.length)}</span>
      </h3>
      <p className="stripe-check__hint">{hint}</p>
      <div className="report-table-wrap">
        <table className="report-table" aria-labelledby={id}>
          <thead>
            <tr>
              <th scope="col">Paid on</th>
              <th scope="col">Name</th>
              <th scope="col">NIC</th>
              <th scope="col">Email</th>
              <th scope="col">Program</th>
              <th scope="col">Application</th>
              <th scope="col" className="cell-number">{amountLabel}</th>
              <th scope="col"><span className="sr-only">Stripe</span></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.paymentIntentId}>
                <td>{formatDate(payment.created || payment.paidAt)}</td>
                <td className="report-table__wrap">{payment.fullName || '—'}</td>
                <td>{payment.nicNo || '—'}</td>
                <td className="report-table__wrap">{payment.email || '—'}</td>
                <td className="report-table__wrap">{payment.programTitle || payment.program || '—'}</td>
                <td><ApplicationLink payment={payment} /></td>
                <td className="cell-number">{formatRupees(payment[amountKey])}</td>
                <td>{payment.dashboardUrl ? <StripeLink payment={payment} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Compares the card payments in Stripe with the applications, on request (it calls Stripe).
 * baseQuery: the report's filters as a query string. A result for other filters is put aside.
 */
function StripeCheck({ baseQuery }) {
  const [result, setResult] = useState({ query: null, data: null, error: '' });
  const [running, setRunning] = useState(false);

  const current = result.query === baseQuery ? result : { data: null, error: '' };
  const data = current.data;

  const run = async () => {
    setRunning(true);
    try {
      const response = await adminFetch(`${API_BASE_URL}/reports/stripe-check?${baseQuery}`);
      const body = await readJson(response, "Couldn't reach Stripe. Please try again in a minute.");
      setResult({ query: baseQuery, data: body.data, error: '' });
    } catch (error) {
      setResult({ query: baseQuery, data: null, error: errorMessage(error, "Couldn't reach Stripe. Please try again in a minute.") });
    } finally {
      setRunning(false);
    }
  };

  const issueCount = data?.configured
    ? data.noApplication.length + data.applicationDeleted.length + data.refunds.length + data.disputes.length + data.missingInStripe.length
    : 0;

  return (
    <section className="report-card stripe-check" aria-labelledby="stripe-check-title">
      <div className="report-card__head">
        <div>
          <h2 id="stripe-check-title" className="report-card__title">Check with Stripe</h2>
          <p className="stripe-check__intro">
            Compares the card payments in Stripe with the applications: payments with no application, payments whose
            application was deleted, refunds and disputes.
          </p>
        </div>
        <button type="button" className="btn btn--secondary btn--sm" onClick={run} disabled={running}>
          {running ? <ButtonSpinner /> : <ShieldCheck size={16} aria-hidden="true" />}
          {running ? 'Checking…' : data ? 'Check again' : 'Check with Stripe'}
        </button>
      </div>

      <div aria-live="polite">
        {current.error && <p className="report-field-error">{current.error}</p>}

        {data && !data.configured && (
          <p className="stripe-check__summary">Card payment isn&apos;t set up on the server (no Stripe keys), so there is nothing to check.</p>
        )}

        {data?.configured && (
          <>
            <p className="stripe-check__summary">
              <strong>Stripe{data.stripeMode === 'test' ? ' (test mode)' : ''}:</strong>
              {' '}{formatCount(data.totals.count)} {data.totals.count === 1 ? 'payment' : 'payments'}, {formatRupees(data.totals.amount)}
              {' · '}{formatCount(data.totals.matchedCount)} match an application
              {data.totals.refunded > 0 && <> · {formatRupees(data.totals.refunded)} refunded · net {formatRupees(data.totals.net)}</>}
            </p>

            {issueCount === 0 && (
              <p className="stripe-check__ok">
                <CheckCircle2 size={18} aria-hidden="true" />
                Everything matches: every payment in Stripe belongs to an application, with no refunds or disputes.
              </p>
            )}

            <IssueTable
              id="stripe-check-no-application"
              title="Paid, but no application"
              hint="The applicant paid but no application was saved (the submission failed, or they paid twice). Contact them, or refund the payment in Stripe."
              payments={data.noApplication}
            />
            <IssueTable
              id="stripe-check-deleted"
              title="Paid, application deleted"
              hint="The application was deleted after paying, so this money is not in the report's totals. The money stays in Stripe."
              payments={data.applicationDeleted}
            />
            <IssueTable
              id="stripe-check-refunds"
              title="Refunded in Stripe"
              hint="Refunds are made in the Stripe Dashboard. The report's totals don't take them off; the net amount above does."
              payments={data.refunds}
              amountKey="refundedAmount"
              amountLabel="Refunded"
            />
            <IssueTable
              id="stripe-check-disputes"
              title="Disputed"
              hint="The cardholder asked their bank to reverse the payment. Respond in the Stripe Dashboard before Stripe's deadline."
              payments={data.disputes}
            />
            <IssueTable
              id="stripe-check-missing"
              title="In the database, not in this Stripe account"
              hint="Usually a payment made with other Stripe keys (for example a test payment while live keys are used)."
              payments={data.missingInStripe}
            />
            {data.missingNotLookedUp > 0 && (
              <p className="stripe-check__hint">{formatCount(data.missingNotLookedUp)} more database payments were not looked up. Narrow the period and check again.</p>
            )}

            <p className="report-card__note">
              Checked {formatDateTime(data.checkedAt)}. Payments made in the last minute may not show yet.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export default StripeCheck;
