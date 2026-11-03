import Setting from '../models/Setting.js';

// The application period and the default deadline are saved on the Settings page.
// Dates are kept as yyyy-mm-dd strings, and every date given is still open (inclusive).

export const APPLICATION_PERIOD_KEY = 'application-period';
export const APPLICATION_DEADLINE_KEY = 'application-deadline';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// True for a real calendar date such as 2026-11-05 (not 2026-02-30).
export const isDateString = (value) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// Today in Sri Lanka, so applications open and close at local midnight wherever the server runs.
const getToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

// Program deadlines are saved from yyyy-mm-dd, so they are midnight UTC on that day.
const toDateString = (date) => (date ? new Date(date).toISOString().slice(0, 10) : null);

// Whether a program takes applications today. The period applies to every program;
// a program's own deadline wins over the default deadline from Settings.
export const getApplicationWindow = async (program) => {
  const settings = await Setting.find({
    key: { $in: [APPLICATION_PERIOD_KEY, APPLICATION_DEADLINE_KEY] }
  }).lean();
  const valueOf = (key) => settings.find((setting) => setting.key === key)?.value || null;

  const period = valueOf(APPLICATION_PERIOD_KEY);
  const deadline = toDateString(program?.applicationDeadline) || valueOf(APPLICATION_DEADLINE_KEY);
  const today = getToday();

  let message = '';
  if (period && today < period.start) {
    message = `Applications open on ${period.start}.`;
  } else if (period && today > period.end) {
    message = `Applications closed on ${period.end}.`;
  } else if (deadline && today > deadline) {
    message = `The application deadline for this program was ${deadline}. Applications are closed.`;
  }

  return { open: !message, message, period, deadline };
};
