import { Banknote, CreditCard, FileText, Users } from 'lucide-react';
import { Skeleton } from '../Loaders';
import { formatCount, formatRupees } from '../../utils/formatMoney';

/**
 * The four numbers the client asked for: applications, students, fee paid and fees collected.
 * `totals` is data.totals from GET /api/reports/summary, or null while the first report loads.
 * Uses the summary-tile look of the Programs page (admin-summary.css).
 */
function ReportTiles({ totals }) {
  if (!totals) {
    return (
      <div className="summary-tiles report-tiles" aria-hidden="true">
        {['Applications', 'Students', 'Fee paid', 'Fees collected'].map((label) => (
          <div key={label} className="summary-tile">
            <div>
              <p className="summary-tile__label">{label}</p>
              <p className="summary-tile__value"><Skeleton as="span" className="summary-tile__skeleton" /></p>
              <Skeleton className="skeleton-text report-tile__skeleton-note" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const {
    applications, uniqueApplicants, multiProgramApplicants, paid, payment, income, cardIncome, bankIncome, bankExpected
  } = totals;
  const paidShare = applications ? Math.round((paid / applications) * 100) : 0;
  const bankReceipts = payment.bankConfirmed + payment.bankWaiting;
  const notPaid = payment.none + payment.bankRejected;

  const tiles = [
    {
      label: 'Applications',
      value: formatCount(applications),
      Icon: FileText,
      notes: ['Submitted in this period']
    },
    {
      label: 'Students',
      value: formatCount(uniqueApplicants),
      Icon: Users,
      notes: [
        multiProgramApplicants > 0
          ? `${formatCount(multiProgramApplicants)} applied to 2 or more programs`
          : 'Different NIC numbers'
      ]
    },
    {
      label: 'Fee paid',
      value: formatCount(paid),
      extra: applications ? `${paidShare}%` : '',
      Icon: CreditCard,
      notes: [
        `${formatCount(payment.card)} by card · ${formatCount(bankReceipts)} by bank receipt`,
        payment.bankRejected > 0
          ? `${formatCount(notPaid)} not paid (${formatCount(payment.bankRejected)} receipt${payment.bankRejected === 1 ? '' : 's'} rejected)`
          : `${formatCount(notPaid)} not paid`
      ]
    },
    {
      label: 'Fees collected',
      value: formatRupees(income),
      Icon: Banknote,
      notes: [
        bankIncome > 0
          ? `${formatRupees(cardIncome)} by card · ${formatRupees(bankIncome)} by confirmed bank receipts`
          : 'Paid by card',
        payment.bankWaiting > 0
          ? `+ ${formatRupees(bankExpected)} expected from ${formatCount(payment.bankWaiting)} receipt${payment.bankWaiting === 1 ? '' : 's'} not checked yet`
          : ''
      ]
    }
  ];

  return (
    <div className="summary-tiles report-tiles">
      {tiles.map((tile) => (
        <div key={tile.label} className="summary-tile">
          <div>
            <p className="summary-tile__label">{tile.label}</p>
            <p className="summary-tile__value report-tile__value">
              {tile.value}
              {tile.extra && <span className="report-tile__extra"> · {tile.extra}</span>}
            </p>
            {tile.notes.filter(Boolean).map((note) => (
              <p key={note} className="report-tile__note">{note}</p>
            ))}
          </div>
          <span className="summary-tile__icon">
            <tile.Icon size={20} aria-hidden="true" />
          </span>
        </div>
      ))}
    </div>
  );
}

export default ReportTiles;
