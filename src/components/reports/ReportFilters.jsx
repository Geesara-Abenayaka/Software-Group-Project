import { describeRange, PERIODS } from '../../utils/reportPeriods';

/**
 * Period, custom dates, program and the demo-program switch at the top of the Reports page.
 * All values live in the page address; this component only shows them and reports changes.
 */
function ReportFilters({
  periodKey,
  onPeriodChange,
  applicationPeriod,
  customFrom,
  customTo,
  onCustomChange,
  rangeError,
  today,
  programs,
  program,
  onProgramChange,
  showDemo,
  onShowDemoChange
}) {
  const hasDemoPrograms = programs.some((item) => item.isProposed);
  const sortedPrograms = [...programs].sort((a, b) => a.title.localeCompare(b.title));

  const periodLabel = (period) => {
    if (period.key !== 'application') return period.label;
    return applicationPeriod
      ? `${period.label} (${describeRange({ from: applicationPeriod.start, to: applicationPeriod.end })})`
      : `${period.label} (not set in Settings)`;
  };

  return (
    <div className="report-filters">
      <div className="report-filters__row">
        <div className="report-field">
          <label htmlFor="report-period">Period</label>
          <select id="report-period" value={periodKey} onChange={(event) => onPeriodChange(event.target.value)}>
            {PERIODS.map((period) => (
              <option key={period.key} value={period.key} disabled={period.key === 'application' && !applicationPeriod}>
                {periodLabel(period)}
              </option>
            ))}
          </select>
        </div>

        {periodKey === 'custom' && (
          <>
            <div className="report-field report-field--date">
              <label htmlFor="report-from">From</label>
              <input
                id="report-from"
                type="date"
                value={customFrom}
                max={customTo || today}
                aria-invalid={Boolean(rangeError)}
                aria-describedby={rangeError ? 'report-range-error' : undefined}
                onChange={(event) => onCustomChange(event.target.value, customTo)}
              />
            </div>
            <div className="report-field report-field--date">
              <label htmlFor="report-to">To</label>
              <input
                id="report-to"
                type="date"
                value={customTo}
                min={customFrom || undefined}
                aria-invalid={Boolean(rangeError)}
                aria-describedby={rangeError ? 'report-range-error' : undefined}
                onChange={(event) => onCustomChange(customFrom, event.target.value)}
              />
            </div>
          </>
        )}

        <div className="report-field report-field--program">
          <label htmlFor="report-program">Program</label>
          <select id="report-program" value={program} onChange={(event) => onProgramChange(event.target.value)}>
            <option value="">All programs</option>
            {sortedPrograms.map((item) => (
              <option key={item._id || item.shortCode} value={item.shortCode}>
                {item.isProposed ? `${item.title} (demo)` : item.title}
              </option>
            ))}
          </select>
        </div>

        {hasDemoPrograms && (
          <label className="report-check">
            <input
              type="checkbox"
              checked={!showDemo}
              disabled={Boolean(program)}
              onChange={(event) => onShowDemoChange(!event.target.checked)}
            />
            Leave out demo programs
          </label>
        )}
      </div>

      {rangeError && (
        <p id="report-range-error" className="report-field-error" role="alert">{rangeError}</p>
      )}
    </div>
  );
}

export default ReportFilters;
