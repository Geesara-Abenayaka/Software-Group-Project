import { GraduationCap } from 'lucide-react';
import useDelayedFlag from '../utils/useDelayedFlag';

// `as="span"` for a placeholder inside inline content.
export function Skeleton({ as = 'div', className = '', style }) {
  const Tag = as;
  return <Tag className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

// Placeholder in the shape of a programme card on the home page (icon and title, description,
// specialization chips, then the deadline and the button below a divider). Reuses the card's layout classes.
export function ProgramCardSkeleton() {
  return (
    <div className="program-card-skeleton" aria-hidden="true">
      <div className="program-card__top">
        <Skeleton style={{ width: '44px', height: '44px', borderRadius: '50%', flex: 'none' }} />
        <div style={{ flex: 1 }}>
          <Skeleton className="skeleton-text" style={{ width: '70%', height: '18px', marginBottom: '8px' }} />
          <Skeleton className="skeleton-text" style={{ width: '40%', marginBottom: 0 }} />
        </div>
      </div>
      <div>
        <Skeleton className="skeleton-text" style={{ width: '95%' }} />
        <Skeleton className="skeleton-text" style={{ width: '100%' }} />
        <Skeleton className="skeleton-text" style={{ width: '60%', marginBottom: 0 }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <Skeleton className="skeleton-chip" style={{ marginRight: 0 }} />
        <Skeleton className="skeleton-chip" style={{ marginRight: 0 }} />
        <Skeleton className="skeleton-chip" style={{ width: '150px', marginRight: 0 }} />
      </div>
      <div className="program-card__footer">
        <Skeleton className="skeleton-text" style={{ width: '90%' }} />
        <Skeleton className="skeleton-text" style={{ width: '30%', marginBottom: 0 }} />
        <Skeleton className="skeleton-button" style={{ height: '44px', marginTop: '12px' }} />
      </div>
    </div>
  );
}

// Placeholder built from the admin programme card's own classes, so it has the same size.
export function AdminProgramCardSkeleton() {
  return (
    <div className="program-card-admin skeleton-card" aria-hidden="true">
      <div className="card-top-row">
        <Skeleton style={{ width: '46px', height: '46px', borderRadius: '10px' }} />
        <Skeleton className="skeleton-chip" style={{ width: '80px', marginRight: 0 }} />
      </div>
      <Skeleton className="skeleton-title" style={{ width: '70%', marginBottom: 0 }} />
      <div>
        <Skeleton className="skeleton-text" style={{ width: '95%', height: '16px', marginBottom: '11px' }} />
        <Skeleton className="skeleton-text" style={{ width: '70%', height: '16px', marginBottom: 0 }} />
      </div>
      <Skeleton className="skeleton-text" style={{ width: '130px', height: '20px', marginBottom: 0 }} />
    </div>
  );
}

// Placeholder rows; render inside a <tbody>. Pass the real rows' height so the table doesn't jump.
export function TableSkeleton({ rows = 6, columns = 5, rowHeight }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} aria-hidden="true" style={rowHeight ? { height: `${rowHeight}px` } : undefined}>
          {Array.from({ length: columns }, (_, col) => (
            <td key={col}>
              <Skeleton className="skeleton-text" style={{ width: `${55 + ((row + col) % 3) * 15}%`, marginBottom: 0 }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// Takes its space at once but only appears after 200 ms, so quick loads don't flash it.
export function PageLoader({ message = 'Loading…' }) {
  const visible = useDelayedFlag(true);

  return (
    <div className={`page-loader${visible ? '' : ' skeleton-wait'}`} role="status" aria-live="polite">
      <div className="page-loader__cap">
        <GraduationCap size={30} color="white" aria-hidden="true" />
      </div>
      <div className="page-loader__bar" />
      <p>{message}</p>
    </div>
  );
}

export function ButtonSpinner() {
  return <span className="btn-spinner" aria-hidden="true" />;
}

export function TopProgressBar({ active }) {
  return active ? <div className="top-progress" role="progressbar" aria-label="Loading" /> : null;
}
