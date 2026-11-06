// Periods for the admin Reports page. Days are Sri Lanka days written yyyy-mm-dd, the same as the server
// (server/utils/reportRules.js), so a report for "1 November" means 1 November in Sri Lanka.

const TIME_ZONE = 'Asia/Colombo';
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const todayInSriLanka = () => new Date().toLocaleDateString('en-CA', { timeZone: TIME_ZONE });

// A real calendar day such as 2026-11-05 (not 2026-02-30).
export const isDay = (value) => {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const addDays = (day, count) => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
};

export const daysBetween = (from, to) => Math.round(
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000
);

// "5 November 2026" for a yyyy-mm-dd day. Read as UTC so the day never moves with the computer's time zone.
export const formatDay = (day, options) => (
  day
    ? new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
      ...(options || { day: 'numeric', month: 'long', year: 'numeric' }),
      timeZone: 'UTC'
    })
    : ''
);

export const PERIODS = [
  { key: 'application', label: 'Application period' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom dates' }
];

export const PERIOD_KEYS = PERIODS.map((period) => period.key);

// { from, to } for a period ('' = no limit). `applicationPeriod` is { start, end } from Settings, or null.
export const resolvePeriod = (key, { applicationPeriod, from = '', to = '', today = todayInSriLanka() }) => {
  switch (key) {
    case 'application':
      return applicationPeriod ? { from: applicationPeriod.start, to: applicationPeriod.end } : { from: '', to: '' };
    case '7d':
      return { from: addDays(today, -6), to: today };
    case '30d':
      return { from: addDays(today, -29), to: today };
    case 'year':
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case 'custom':
      return { from, to };
    default:
      return { from: '', to: '' };
  }
};

// The message to show for a custom range the server would refuse, or ''.
export const checkRange = ({ from, to }) => {
  if ((from && !isDay(from)) || (to && !isDay(to))) return 'Enter real dates.';
  if (from && to && from > to) return 'The start date must be on or before the end date.';
  return '';
};

// "1 October – 30 November 2026", "From 1 October 2026", "All time"
export const describeRange = ({ from, to }) => {
  if (from && to) {
    if (from === to) return formatDay(from);
    const sameYear = from.slice(0, 4) === to.slice(0, 4);
    return `${formatDay(from, sameYear ? { day: 'numeric', month: 'long' } : undefined)} – ${formatDay(to)}`;
  }
  if (from) return `From ${formatDay(from)}`;
  if (to) return `Up to ${formatDay(to)}`;
  return 'All time';
};

// Monday of the week a day is in.
const mondayOf = (day) => addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));

/**
 * Applications per day, per week (periods over 62 days) or per month (over 400 days), with empty days filled in.
 * byDay: [{ date, applications }] from the server. The chart runs from the start of the period (or the first
 * application, for "All time") to the end of the period or today, whichever comes first.
 */
export const bucketApplications = (byDay, { from, to }, today = todayInSriLanka()) => {
  const counts = new Map(byDay.map((row) => [row.date, row.applications]));
  const start = from || byDay[0]?.date;
  const end = to && to < today ? to : today;
  if (!start || start > end) return { unit: 'day', buckets: [] };

  const length = daysBetween(start, end) + 1;
  const unit = length <= 62 ? 'day' : length <= 400 ? 'week' : 'month';

  const buckets = new Map();
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const key = unit === 'day' ? day : unit === 'week' ? mondayOf(day) : day.slice(0, 7);
    if (!buckets.has(key)) {
      const first = unit === 'month' ? `${key}-01` : key;
      buckets.set(key, {
        key,
        count: 0,
        label: unit === 'month'
          ? formatDay(first, { month: 'short', year: 'numeric' })
          : formatDay(first, { day: 'numeric', month: 'short' }),
        fullLabel: unit === 'day'
          ? formatDay(first)
          : unit === 'week'
            ? `Week of ${formatDay(first)}`
            : formatDay(first, { month: 'long', year: 'numeric' })
      });
    }
    buckets.get(key).count += counts.get(day) || 0;
  }

  return { unit, buckets: [...buckets.values()] };
};
