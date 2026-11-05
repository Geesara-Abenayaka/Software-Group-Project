import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// "Applications › MSc in CS › APP-1A2B3C" on the pages three levels deep.
// `items` is [{ label, to }], the last one is the current page (no link).
function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`}>
              {isLast || !item.to ? (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
              {!isLast && <ChevronRight size={14} className="breadcrumbs__separator" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
