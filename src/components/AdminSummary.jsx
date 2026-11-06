import { CheckCircle2, Clock, FileText, GraduationCap, Inbox } from 'lucide-react';
import { Skeleton } from './Loaders';
import '../styles/admin-summary.css';

/**
 * Overview at the top of the admin Programs page: four number tiles, then a bar per programme.
 * `summary` is the array from GET /applications/summary/by-program
 * ({ program: shortCode, total, pending, approved, rejected }), null while loading, or 'error'.
 * The bars are plain CSS with the number written next to each (no axis), and each row is a button
 * with its full text, so the chart doubles as its own table.
 */
function AdminSummary({ programs, summary, onOpenProgram }) {
  const loaded = Array.isArray(summary);
  const failed = summary === 'error';

  // Every application counts in the tiles, also those of a programme that was deleted since.
  const totals = loaded
    ? summary.reduce((sum, row) => ({
      total: sum.total + (row.total || 0),
      pending: sum.pending + (row.pending || 0),
      approved: sum.approved + (row.approved || 0)
    }), { total: 0, pending: 0, approved: 0 })
    : null;

  const rows = loaded
    ? programs
      .map((program) => {
        const row = summary.find((item) => item.program === program.shortCode) || {};
        return { program, total: row.total || 0, pending: row.pending || 0 };
      })
      .sort((a, b) => b.total - a.total)
    : [];
  const max = rows.length ? rows[0].total : 0;

  const tiles = [
    { label: 'Applications', value: totals?.total, Icon: FileText },
    { label: 'Pending', value: totals?.pending, Icon: Clock },
    { label: 'Approved', value: totals?.approved, Icon: CheckCircle2 },
    { label: 'Programs', value: programs.length, Icon: GraduationCap }
  ];

  const tileValue = (value) => {
    if (value !== undefined) return value;
    if (failed) return '—';
    return <Skeleton as="span" className="summary-tile__skeleton" />;
  };

  const chartSummary = rows.length && max > 0
    ? `Applications per program: ${rows[0].program.title} has the most, ${rows[0].total}`
    : 'Applications per program';

  return (
    <section className="admin-summary" aria-label="Summary">
      <div className="summary-tiles">
        {tiles.map((tile) => (
          <div key={tile.label} className="summary-tile">
            <div>
              <p className="summary-tile__label">{tile.label}</p>
              <p className="summary-tile__value">{tileValue(tile.value)}</p>
            </div>
            <span className="summary-tile__icon">
              <tile.Icon size={20} aria-hidden="true" />
            </span>
          </div>
        ))}
      </div>

      <div className="program-bars">
        <h3 className="program-bars__title">Applications per program</h3>

        {failed && <p className="program-bars__empty">Couldn&apos;t load the numbers. Reload the page to try again.</p>}

        {!loaded && !failed && (
          <div aria-hidden="true">
            {programs.slice(0, 3).map((program) => (
              <Skeleton key={program._id} className="program-bars__skeleton" />
            ))}
          </div>
        )}

        {loaded && totals.total === 0 && (
          <p className="program-bars__empty">
            <Inbox size={20} aria-hidden="true" />
            No applications yet
          </p>
        )}

        {loaded && totals.total > 0 && (
          <ul className="program-bars__list" aria-label={chartSummary}>
            {rows.map(({ program, total, pending }) => (
              <li key={program._id}>
                <button type="button" className="program-bar" onClick={() => onOpenProgram(program)}>
                  <span className="program-bar__name" title={program.title}>{program.title}</span>
                  <span className="program-bar__track" aria-hidden="true">
                    <span className="program-bar__fill" style={{ width: `${max ? (total / max) * 100 : 0}%` }} />
                  </span>
                  <span className="program-bar__count">
                    {total}
                    <span className="sr-only"> applications</span>
                  </span>
                  <span className="program-bar__pending">{pending > 0 ? `(${pending} pending)` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default AdminSummary;
