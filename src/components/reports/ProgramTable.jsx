import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { formatCount, formatRupees } from '../../utils/formatMoney';
import { PROGRAM_COLUMNS, toProgramRow } from '../../utils/reportRows';

/** Applications, decisions and payments per program, with a totals row. Columns sort on click. */
function ProgramTable({ byProgram, totals }) {
  const [sort, setSort] = useState({ key: 'applications', direction: 'descending' });

  const rows = byProgram.map(toProgramRow).sort((a, b) => {
    const column = PROGRAM_COLUMNS.find((item) => item.key === sort.key);
    const order = column?.text
      ? a[sort.key].localeCompare(b[sort.key])
      : a[sort.key] - b[sort.key];
    // Ties keep a fixed order by name, so rows don't jump around.
    return (sort.direction === 'ascending' ? order : -order) || a.name.localeCompare(b.name);
  });

  const totalRow = toProgramRow({
    program: '', title: 'Total', deleted: false, demo: false, ...totals
  });

  const toggleSort = (key) => {
    setSort((current) => (current.key === key
      ? { key, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
      : { key, direction: key === 'name' ? 'ascending' : 'descending' }));
  };

  const sortState = (key) => (sort.key === key ? sort.direction : 'none');
  const sortIcon = (key) => {
    if (sort.key !== key) return <ArrowUpDown size={14} aria-hidden="true" />;
    return sort.direction === 'ascending' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />;
  };

  const cell = (row, column) => (column.money ? formatRupees(row[column.key]) : formatCount(row[column.key]));

  return (
    <section className="report-card report-card--table" aria-labelledby="report-programs-title">
      <h2 id="report-programs-title" className="report-card__title">By program</h2>

      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              {PROGRAM_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sortState(column.key)}
                  className={column.text ? undefined : 'cell-number'}
                >
                  <button type="button" className="th-sort" onClick={() => toggleSort(column.key)}>
                    {column.label}
                    {sortIcon(column.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="report-table__name">
                  {row.deleted ? (
                    <span className="report-muted">{row.name}</span>
                  ) : (
                    <Link to={`/admin/applications/${encodeURIComponent(row.program)}`} className="report-link">
                      {row.name}
                    </Link>
                  )}
                  {row.demo && <span className="report-tag">demo</span>}
                </th>
                {PROGRAM_COLUMNS.slice(1).map((column) => (
                  <td key={column.key} className="cell-number">{cell(row, column)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {PROGRAM_COLUMNS.slice(1).map((column) => (
                <td key={column.key} className="cell-number">{cell(totalRow, column)}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="report-card__note">
        Pending includes under review and shortlisted. Collected is card payments only; bank receipts are not confirmed,
        so they are not added here.
      </p>
    </section>
  );
}

export default ProgramTable;
