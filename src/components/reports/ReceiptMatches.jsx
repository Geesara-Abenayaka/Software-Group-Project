import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

/**
 * Other applications that uploaded the same bank receipt file: one bank payment can only pay one fee.
 * matches: [{ applicationId, reference, fullName, exact }] from the server (exact = same SHA-256;
 * otherwise an older upload with the same file name and size).
 */
function ReceiptMatches({ matches }) {
  if (!matches?.length) return null;
  return matches.map((match) => (
    <span key={match.applicationId} className="receipt-match">
      <AlertTriangle size={13} aria-hidden="true" />
      <span>
        {match.exact ? 'Same receipt file as ' : 'Possibly the same receipt as '}
        <Link to={`/admin/application/${match.applicationId}`} className="report-link">{match.reference}</Link>
        {match.fullName ? ` (${match.fullName})` : ''}
      </span>
    </span>
  ));
}

export default ReceiptMatches;
