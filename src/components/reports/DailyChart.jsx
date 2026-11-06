import { useMemo } from 'react';
import { bucketApplications } from '../../utils/reportPeriods';
import { formatCount } from '../../utils/formatMoney';

/**
 * Applications per day (per week or month for long periods), as CSS columns.
 * Each column has its date and count as text for screen readers and as a tooltip.
 */
function DailyChart({ byDay, from, to, today }) {
  const { unit, buckets } = useMemo(
    () => bucketApplications(byDay, { from, to }, today),
    [byDay, from, to, today]
  );

  const max = buckets.reduce((highest, bucket) => Math.max(highest, bucket.count), 0);
  const busiest = buckets.find((bucket) => bucket.count === max && max > 0);
  const title = `Applications per ${unit}`;

  return (
    <section className="report-card" aria-labelledby="report-daily-title">
      <h2 id="report-daily-title" className="report-card__title">{title}</h2>

      {max === 0 ? (
        <p className="report-card__note">No applications in this period.</p>
      ) : (
        <>
          <div className="report-columns-wrap">
            <span className="report-columns__max" aria-hidden="true">{formatCount(max)}</span>
            <ol
              className="report-columns"
              aria-label={`${title}. Busiest: ${busiest.fullLabel}, ${formatCount(max)}.`}
            >
              {buckets.map((bucket) => (
                <li key={bucket.key} className="report-columns__item" title={`${bucket.fullLabel}: ${formatCount(bucket.count)}`}>
                  <span
                    className="report-columns__bar"
                    style={{ height: bucket.count ? `max(3px, ${(bucket.count / max) * 100}%)` : 0 }}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{bucket.fullLabel}: {formatCount(bucket.count)}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="report-columns__axis" aria-hidden="true">
            <span>{buckets[0].label}</span>
            {buckets.length > 1 && <span>{buckets[buckets.length - 1].label}</span>}
          </div>
          <p className="report-card__note">
            Busiest {unit}: {busiest.fullLabel} ({formatCount(max)} {max === 1 ? 'application' : 'applications'})
          </p>
        </>
      )}
    </section>
  );
}

export default DailyChart;
