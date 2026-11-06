import { useId, useState } from 'react';
import { CheckCircle2, Clock, RotateCcw, XCircle } from 'lucide-react';
import ReceiptMatches from './reports/ReceiptMatches';
import { ButtonSpinner } from './Loaders';
import API_BASE_URL from '../utils/apiConfig';
import { formatDate } from '../utils/formatDate';
import { errorMessage, readJson } from '../utils/readJson';
import { toast } from '../utils/toast';

const signedInEmail = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.email || '';
  } catch {
    return '';
  }
};

const STATES = {
  waiting: { Icon: Clock, text: () => 'Not checked yet' },
  confirmed: {
    Icon: CheckCircle2,
    text: (payment) => `Confirmed${payment.reviewedBy ? ` by ${payment.reviewedBy}` : ''}${payment.reviewedAt ? ` on ${formatDate(payment.reviewedAt)}` : ''}`
  },
  rejected: {
    Icon: XCircle,
    text: (payment) => `Rejected${payment.reviewedBy ? ` by ${payment.reviewedBy}` : ''}${payment.reviewedAt ? ` on ${formatDate(payment.reviewedAt)}` : ''}`
  }
};

/**
 * An admin's check of an uploaded bank receipt against the bank statement: confirm it (the fee counts as
 * collected), reject it (the application counts as not paid), or undo either. Both can be undone, so there is
 * no "are you sure"; rejecting asks for an optional reason.
 * payment: the application's payment (null until checked); matches: other applications with the same receipt.
 * compact: the smaller version used in the Reports payment list (no state line or warnings, they are shown there).
 */
function ReceiptReview({ applicationId, payment, matches, onChange, compact = false }) {
  const [busy, setBusy] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const noteId = useId();

  const state = payment?.method === 'bank' ? payment.status : 'waiting';
  const { Icon, text } = STATES[state] || STATES.waiting;

  const send = async (action) => {
    setBusy(action);
    try {
      const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: action === 'reject' ? note.trim() : '', reviewedBy: signedInEmail() })
      });
      const body = await readJson(response, "Couldn't save the receipt check.");
      toast.success(body.message);
      setRejecting(false);
      setNote('');
      onChange?.(body.data.payment);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't save the receipt check. Please try again."));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className={`receipt-review${compact ? ' receipt-review--compact' : ''}`}>
      {!compact && (
        <>
          <p className={`receipt-review__state receipt-review__state--${state}`}>
            <Icon size={16} aria-hidden="true" />
            <span>
              <span className="receipt-review__label">Payment check: </span>
              {text(payment)}
            </span>
          </p>
          {state === 'rejected' && payment.note && <p className="receipt-review__note">Reason: {payment.note}</p>}
          <ReceiptMatches matches={matches} />
        </>
      )}

      {rejecting ? (
        <div className="receipt-review__reject">
          <label htmlFor={noteId}>Why is it rejected? (optional)</label>
          <textarea
            id={noteId}
            rows={2}
            maxLength={500}
            value={note}
            placeholder="For example: amount not on the bank statement"
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="receipt-review__actions">
            <button type="button" className="btn btn--danger btn--sm" onClick={() => send('reject')} disabled={Boolean(busy)}>
              {busy === 'reject' && <ButtonSpinner />}
              Reject receipt
            </button>
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => setRejecting(false)} disabled={Boolean(busy)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="receipt-review__actions">
          {state === 'waiting' ? (
            <>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => send('confirm')} disabled={Boolean(busy)}>
                {busy === 'confirm' ? <ButtonSpinner /> : <CheckCircle2 size={16} aria-hidden="true" />}
                Confirm payment
              </button>
              <button type="button" className="btn btn--quiet btn--sm" onClick={() => setRejecting(true)} disabled={Boolean(busy)}>
                <XCircle size={16} aria-hidden="true" />
                Reject
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => send('reset')} disabled={Boolean(busy)}>
              {busy === 'reset' ? <ButtonSpinner /> : <RotateCcw size={16} aria-hidden="true" />}
              {state === 'confirmed' ? 'Undo confirmation' : 'Undo rejection'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ReceiptReview;
