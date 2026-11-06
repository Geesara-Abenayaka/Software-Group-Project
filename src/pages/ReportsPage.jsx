import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import BreakdownBars from '../components/reports/BreakdownBars';
import DailyChart from '../components/reports/DailyChart';
import PaymentList from '../components/reports/PaymentList';
import PaymentSplit from '../components/reports/PaymentSplit';
import ProgramTable from '../components/reports/ProgramTable';
import ReportFilters from '../components/reports/ReportFilters';
import ReportTiles from '../components/reports/ReportTiles';
import API_BASE_URL from '../utils/apiConfig';
import { formatDateTime } from '../utils/formatDate';
import { formatCount } from '../utils/formatMoney';
import {
  addDays,
  checkRange,
  describeRange,
  PERIOD_KEYS,
  resolvePeriod,
  todayInSriLanka
} from '../utils/reportPeriods';
import { errorMessage, readJson } from '../utils/readJson';
import { categoryItems, statusItems } from '../utils/reportRows';
import useDelayedFlag from '../utils/useDelayedFlag';

/**
 * Admin Reports: how many applied, how many paid the fee, and how much the fees brought in.
 * The filters live in the address (?period=30d&program=MSC-CS), so a link opens the same view.
 * Every number comes from GET /api/reports/summary; the rules behind them are in server/utils/reportRules.js.
 */
function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [today] = useState(todayInSriLanka);
  const [programs, setPrograms] = useState([]);
  // The application period saved in Settings: undefined while loading, null when none is saved.
  const [applicationPeriod, setApplicationPeriod] = useState(undefined);
  const [reloadCount, setReloadCount] = useState(0);
  // The last report received, with the request it answered, so a new filter keeps the old numbers on screen
  // (dimmed) until the new ones arrive.
  const [result, setResult] = useState({ key: null, data: null, error: '' });

  const settingsReady = applicationPeriod !== undefined;
  const requestedPeriod = searchParams.get('period');
  const periodKey = PERIOD_KEYS.includes(requestedPeriod)
    ? requestedPeriod
    : (applicationPeriod ? 'application' : 'all');
  const customFrom = searchParams.get('from') || '';
  const customTo = searchParams.get('to') || '';
  const program = searchParams.get('program') || '';
  const showDemo = searchParams.get('demo') === 'show';

  const range = resolvePeriod(periodKey, { applicationPeriod, from: customFrom, to: customTo, today });
  const rangeError = periodKey === 'custom' ? checkRange(range) : '';

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    if (program) params.set('program', program);
    if (!showDemo) params.set('hideDemo', '1');
    return params.toString();
  }, [range.from, range.to, program, showDemo]);

  const requestKey = `${query}#${reloadCount}`;
  const canRequest = settingsReady && !rangeError;
  // Loading also while Settings is read, because the default period depends on it.
  const loading = !rangeError && (!settingsReady || result.key !== requestKey);
  const showSkeletons = useDelayedFlag(loading && !result.data);
  const report = result.data;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/programs`, { signal: controller.signal })
      .then((response) => readJson(response, 'Could not load the programs.'))
      .then((body) => setPrograms(Array.isArray(body.data) ? body.data : []))
      .catch(() => {}); // the program list just stays empty; the report still loads

    fetch(`${API_BASE_URL}/settings/application-period`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setApplicationPeriod(body?.value?.start && body?.value?.end ? body.value : null))
      .catch((error) => {
        if (error.name !== 'AbortError') setApplicationPeriod(null);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!canRequest) return undefined;

    const controller = new AbortController();
    fetch(`${API_BASE_URL}/reports/summary?${query}`, { signal: controller.signal })
      .then((response) => readJson(response, "Couldn't load the report."))
      .then((body) => setResult({ key: requestKey, data: body.data, error: '' }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        const message = errorMessage(error, "Couldn't load the report.");
        setResult((previous) => ({ key: requestKey, data: previous.data, error: message }));
      });

    return () => controller.abort();
  }, [canRequest, query, requestKey]);

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next, { replace: true });
  };

  const handlePeriodChange = (key) => {
    if (key === 'custom') {
      // Start from the dates on screen, or the last 30 days.
      updateParams({
        period: 'custom',
        from: range.from || addDays(today, -29),
        to: range.to || today
      });
    } else {
      updateParams({ period: key, from: '', to: '' });
    }
  };

  const reload = () => setReloadCount((count) => count + 1);

  const programTitle = program
    ? programs.find((item) => item.shortCode === program)?.title || program
    : 'All programs';
  const totals = report?.totals || null;
  const isEmpty = Boolean(report) && !loading && totals.applications === 0;
  const failed = Boolean(result.error) && !loading;

  return (
    <AdminLayout>
      <div className="admin-content-full">
        <main id="main" tabIndex={-1} className="admin-main-full report-main">
          <div className="page-title-row report-title-row">
            <div>
              <h1 className="page-heading">Reports</h1>
              <p className="report-subtitle">Applications, fee payments and fees collected.</p>
            </div>
          </div>

          <ReportFilters
            periodKey={periodKey}
            onPeriodChange={handlePeriodChange}
            applicationPeriod={applicationPeriod}
            customFrom={customFrom}
            customTo={customTo}
            onCustomChange={(from, to) => updateParams({ period: 'custom', from, to })}
            rangeError={rangeError}
            today={today}
            programs={programs}
            program={program}
            onProgramChange={(value) => updateParams({ program: value })}
            showDemo={showDemo}
            onShowDemoChange={(value) => updateParams({ demo: value ? 'show' : '' })}
          />

          <div className="report-status-line">
            <p className="report-scope">
              <strong>{describeRange(range)}</strong>
              <span aria-hidden="true"> · </span>
              {programTitle}
            </p>
            {report && (
              <p className="report-updated" aria-live="polite">
                {loading ? 'Updating…' : `Updated ${formatDateTime(report.generatedAt)}`}
                <button type="button" className="btn btn--quiet btn--sm report-refresh" onClick={reload} disabled={loading}>
                  <RefreshCw size={16} aria-hidden="true" />
                  Refresh
                </button>
              </p>
            )}
          </div>

          {failed && (
            <div className="report-alert" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <p>
                {result.error}
                {report ? ' The numbers below are from the last time it loaded.' : ''}
              </p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={reload}>Try again</button>
            </div>
          )}

          {report && report.stripeMode !== 'live' && totals.payment.card > 0 && (
            <p className="report-banner">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>
                <strong>Test mode.</strong> Card payments here were made with Stripe test cards.
                They are not real money.
              </span>
            </p>
          )}
          {report && report.stripeMode === 'live' && totals.payment.testCard > 0 && (
            <p className="report-banner">
              <AlertTriangle size={18} aria-hidden="true" />
              <span>
                {formatCount(totals.payment.testCard)} test card {totals.payment.testCard === 1 ? 'payment is' : 'payments are'} left
                out of these totals.
              </span>
            </p>
          )}

          <div
            className={`report-body${loading && report ? ' report-body--updating' : ''}${loading && !report && !showSkeletons ? ' skeleton-wait' : ''}`}
            aria-busy={loading}
          >
            {(report || (loading && !failed)) && <ReportTiles totals={report ? totals : null} />}

            {report && totals.applications > 0 && (
              <>
                <div className="report-grid">
                  <PaymentSplit totals={totals} />
                  <DailyChart byDay={report.byDay} from={range.from} to={range.to} today={today} />
                </div>
                <ProgramTable byProgram={report.byProgram} totals={totals} />
                <div className="report-grid">
                  <BreakdownBars id="report-status-title" title="Status" items={statusItems(totals.status)} />
                  <BreakdownBars
                    id="report-category-title"
                    title="GPA category"
                    items={categoryItems(report.categories)}
                    note="From the best GPA among each applicant's qualifications."
                  />
                </div>
              </>
            )}

            {report && totals.applications > 0 && (
              <PaymentList baseQuery={query} refreshKey={reloadCount} liveMode={report.stripeMode === 'live'} />
            )}

            {isEmpty && (
              <div className="report-card report-empty">
                <Inbox size={24} aria-hidden="true" />
                <p>No applications in this period.</p>
                {(periodKey !== 'all' || program) && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => updateParams({ period: 'all', from: '', to: '', program: '' })}
                  >
                    Show all time, all programs
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </AdminLayout>
  );
}

export default ReportsPage;
