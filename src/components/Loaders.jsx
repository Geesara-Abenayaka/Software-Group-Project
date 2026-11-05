import { GraduationCap } from 'lucide-react';

export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

// Placeholder in the shape of a programme card on the home page.
export function ProgramCardSkeleton() {
  return (
    <div className="program-card-skeleton" aria-hidden="true">
      <Skeleton className="program-card-skeleton__header" />
      <div className="program-card-skeleton__body">
        <Skeleton className="skeleton-text" style={{ width: '92%' }} />
        <Skeleton className="skeleton-text" style={{ width: '74%' }} />
        <div style={{ margin: '18px 0 6px' }}>
          <Skeleton className="skeleton-chip" />
          <Skeleton className="skeleton-chip" />
        </div>
        <Skeleton className="skeleton-text" style={{ width: '45%' }} />
        <Skeleton className="skeleton-button" />
      </div>
    </div>
  );
}

// Placeholder rows; render inside a <tbody>.
export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} aria-hidden="true">
          {Array.from({ length: columns }, (_, col) => (
            <td key={col}>
              <Skeleton className="skeleton-text" style={{ width: `${55 + ((row + col) % 3) * 15}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function PageLoader({ message = 'Loading…' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
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
