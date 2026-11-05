// One date format for the whole UI, the same as the programme pages and the deadlines in the data:
// "5 November 2026", and "5 November 2026, 3:15 pm" when the time matters (submissions, saves).

export const formatDate = (value) => (
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
);

export const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const time = date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${formatDate(date)}, ${time}`;
};
