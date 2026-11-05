// Application deadlines are saved as midnight UTC on the day (from yyyy-mm-dd), and that day is
// still open. Days are counted in Sri Lanka time, the same way the server decides when applications close.

// Today in Sri Lanka as yyyy-mm-dd.
export const getToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

// Whole days from `today` to the deadline: 0 on the day itself, negative once it has passed,
// null when there is no deadline date.
export const getDaysLeft = (applicationDeadline, today) => {
  if (!applicationDeadline) return null;

  const deadlineDay = new Date(applicationDeadline).toISOString().slice(0, 10);
  return Math.round((Date.parse(deadlineDay) - Date.parse(today)) / 86400000);
};
