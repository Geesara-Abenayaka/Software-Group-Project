// Statuses are stored in more than one spelling ('pending', 'Approved', 'Under Review', 'Application Rejected'),
// so they are normalised to one key. Pending is amber, never red; each pill has its word and a dot.
const ALIASES = { 'application-rejected': 'rejected', review: 'under-review' };

const statusKey = (status) => {
  const key = String(status || 'pending').trim().toLowerCase().replace(/[\s_]+/g, '-');
  return ALIASES[key] || key;
};

function StatusPill({ status }) {
  const key = statusKey(status);
  const label = key.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  return <span className={`status-pill status-pill--${key}`}>{label}</span>;
}

export default StatusPill;
