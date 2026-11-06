import { formatCount } from '../../utils/formatMoney';

/**
 * A short list of labelled bars with the count and share written next to each, so the list reads as a table too.
 * items: [{ key, label, hint?, value }]
 */
function BreakdownBars({ id, title, items, note }) {
  const max = items.reduce((highest, item) => Math.max(highest, item.value), 0);
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="report-card" aria-labelledby={id}>
      <h2 id={id} className="report-card__title">{title}</h2>
      <ul className="report-bars">
        {items.map((item) => (
          <li key={item.key} className="report-bars__row">
            <span className="report-bars__label">
              {item.label}
              {item.hint && <span className="report-bars__hint">{item.hint}</span>}
            </span>
            <span className="report-bars__track" aria-hidden="true">
              <span className="report-bars__fill" style={{ width: `${max ? (item.value / max) * 100 : 0}%` }} />
            </span>
            <span className="report-bars__value">
              {formatCount(item.value)}
              <span className="report-bars__share"> ({total ? Math.round((item.value / total) * 100) : 0}%)</span>
            </span>
          </li>
        ))}
      </ul>
      {note && <p className="report-card__note">{note}</p>}
    </section>
  );
}

export default BreakdownBars;
