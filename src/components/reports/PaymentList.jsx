import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, SearchX } from 'lucide-react';
import API_BASE_URL from '../../utils/apiConfig';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { describeCard, formatCount, formatRupees } from '../../utils/formatMoney';
import { errorMessage, readJson } from '../../utils/readJson';
import { PAYMENT_METHOD_LABELS } from '../../utils/reportRows';

const PAGE_SIZE = 25;

function PaymentCell({ row }) {
  if (row.method === 'card' || row.method === 'testCard') {
    return (
      <>
        <span className="report-pay">{row.method === 'testCard' ? 'Test card payment' : describeCard(row)}</span>
        {row.paidAt && <span className="report-pay__sub">Paid {formatDateTime(row.paidAt)}</span>}
        {row.receiptUrl && (
          <a className="report-link report-pay__link" href={row.receiptUrl} target="_blank" rel="noopener noreferrer">
            Stripe receipt
            <ExternalLink size={13} aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </>
    );
  }

  if (row.method === 'bank') {
    return (
      <>
        <span className="report-pay">Bank receipt</span>
        <span className="report-pay__sub">Not confirmed</span>
        {row.receiptFileId && (
          <a className="report-link report-pay__link" href={`${API_BASE_URL}/applications/${row._id}/file/${row.receiptFileId}`}>
            Download receipt
          </a>
        )}
      </>
    );
  }

  return <span className="report-muted">No payment on record</span>;
}

/**
 * Every application in the report's period with how its fee was paid, newest first, 25 at a time.
 * baseQuery: the report's filters as a query string; refreshKey changes when the page's Refresh is pressed.
 */
function PaymentList({ baseQuery, refreshKey, liveMode }) {
  const [method, setMethod] = useState('');
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState({ listKey: '', number: 1 });
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: null, rows: [], total: 0, error: '' });

  // Search after the admin stops typing for a moment.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Any change of filter, search or refresh starts again at page 1.
  const listKey = `${baseQuery}|${method}|${search}|${refreshKey}`;
  const pageNumber = page.listKey === listKey ? page.number : 1;
  const requestKey = `${listKey}#${pageNumber}#${attempt}`;
  const loading = result.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(baseQuery);
    if (method) params.set('method', method);
    if (search) params.set('q', search);
    params.set('page', String(pageNumber));
    params.set('limit', String(PAGE_SIZE));

    fetch(`${API_BASE_URL}/reports/payments?${params}`, { signal: controller.signal })
      .then((response) => readJson(response, "Couldn't load the payment list."))
      .then((body) => setResult((previous) => ({
        key: requestKey,
        // "Show more" adds the next page under the rows already shown.
        rows: pageNumber > 1 && previous.key?.startsWith(`${listKey}#`) ? [...previous.rows, ...body.data] : body.data,
        total: body.total,
        error: ''
      })))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setResult((previous) => ({
          key: requestKey,
          rows: previous.key?.startsWith(`${listKey}#`) ? previous.rows : [],
          total: previous.key?.startsWith(`${listKey}#`) ? previous.total : 0,
          error: errorMessage(error, "Couldn't load the payment list.")
        }));
      });

    return () => controller.abort();
  }, [baseQuery, method, search, pageNumber, listKey, requestKey]);

  const { rows, total, error } = result;
  const failed = Boolean(error) && !loading;
  const methods = ['card', 'bank', 'none', ...(liveMode ? ['testCard'] : [])];

  return (
    <section className="report-card report-card--table report-card--payments" aria-labelledby="report-payments-title">
      <div className="report-card__head">
        <h2 id="report-payments-title" className="report-card__title">Payments</h2>
        <div className="report-list-filters">
          <div className="report-field">
            <label htmlFor="report-method">Payment</label>
            <select id="report-method" value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="">All</option>
              {methods.map((key) => (
                <option key={key} value={key}>{PAYMENT_METHOD_LABELS[key]}</option>
              ))}
            </select>
          </div>
          <div className="report-field report-search">
            <label htmlFor="report-search">Search</label>
            <input
              id="report-search"
              type="search"
              value={searchText}
              placeholder="Name, NIC or reference"
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
        </div>
      </div>

      <p className="report-list-count" aria-live="polite">
        {loading && rows.length === 0
          ? 'Loading…'
          : `Showing ${formatCount(rows.length)} of ${formatCount(total)}`}
      </p>

      <div className={`report-table-wrap${loading && rows.length > 0 ? ' report-body--updating' : ''}`} aria-busy={loading}>
        <table className="report-table report-table--payments">
          <thead>
            <tr>
              <th scope="col">Submitted</th>
              <th scope="col">Reference</th>
              <th scope="col">Name</th>
              <th scope="col">NIC</th>
              <th scope="col">Program</th>
              <th scope="col">Payment</th>
              <th scope="col" className="cell-number">Amount</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && !failed && (
              <tr>
                <td colSpan="7" className="table-empty">
                  <div className="table-empty__inner">
                    <SearchX size={24} aria-hidden="true" />
                    <p>No applications match.</p>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row._id}>
                <td>{formatDate(row.submittedAt)}</td>
                <td>
                  <Link to={`/admin/application/${row._id}`} className="report-link">{row.reference}</Link>
                </td>
                <td className="report-table__wrap">{row.fullName}</td>
                <td>{row.nicNo}</td>
                <td className="report-table__wrap">{row.programTitle || `Deleted program (${row.program})`}</td>
                <td className="report-table__wrap report-pay-cell"><PaymentCell row={row} /></td>
                <td className="cell-number">
                  {row.method === 'card' && formatRupees(row.amount)}
                  {row.method === 'testCard' && <span className="report-muted">{formatRupees(row.amount)} (test)</span>}
                  {(row.method === 'bank' || row.method === 'none') && (
                    <>
                      <span aria-hidden="true">—</span>
                      <span className="sr-only">{row.method === 'bank' ? 'Not confirmed' : 'None'}</span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {failed && (
        <div className="report-alert report-alert--inline" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setAttempt((count) => count + 1)}>
            Try again
          </button>
        </div>
      )}

      {!failed && rows.length < total && (
        <div className="report-more">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            disabled={loading}
            onClick={() => setPage({ listKey, number: pageNumber + 1 })}
          >
            {loading ? 'Loading…' : `Show ${formatCount(Math.min(PAGE_SIZE, total - rows.length))} more`}
          </button>
        </div>
      )}
    </section>
  );
}

export default PaymentList;
