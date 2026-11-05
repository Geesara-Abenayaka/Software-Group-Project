import { getDaysLeft } from '../utils/deadline';

// "Closing in 3 days" / "Closes today" in the last two weeks, "Closed" after the deadline.
// `today` comes from getToday(), worked out once by the page.
function DeadlineBadge({ date, today }) {
  const daysLeft = getDaysLeft(date, today);

  if (daysLeft === null || daysLeft > 14) return null;
  if (daysLeft < 0) return <span className="badge badge--closed">Closed</span>;
  if (daysLeft === 0) return <span className="badge badge--soon">Closes today</span>;
  return <span className="badge badge--soon">Closing in {daysLeft} day{daysLeft === 1 ? '' : 's'}</span>;
}

export default DeadlineBadge;
