// Applicant categories are decided by the best GPA across all academic qualifications,
// the same way for every program. They are derived when applications are read, so
// existing applications are categorised without a migration.

export const NO_GPA_CATEGORY = 'No GPA';

export const MAX_GPA = 4;

// Returns null for an empty value, NaN for a value that is not a number.
export const parseGpa = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const gpa = Number(value);
  return Number.isFinite(gpa) ? gpa : NaN;
};

export const isValidGpa = (gpa) => gpa === null || (Number.isFinite(gpa) && gpa >= 0 && gpa <= MAX_GPA);

export const getBestGpa = (qualifications) => {
  if (!Array.isArray(qualifications)) {
    return null;
  }

  const gpas = qualifications
    .map((qualification) => parseGpa(qualification?.gpa))
    .filter((gpa) => gpa !== null && isValidGpa(gpa));

  return gpas.length > 0 ? Math.max(...gpas) : null;
};

export const getCategoryFromGpa = (gpa) => {
  if (gpa === null) {
    return NO_GPA_CATEGORY;
  }

  if (gpa >= 3.7) {
    return 'Category 1'; // First Class
  }

  if (gpa >= 3.3) {
    return 'Category 2'; // Second Upper
  }

  return 'Category 3';
};

// Adds bestGpa and category to a lean application. List endpoints only load
// qualifications.gpa for this, so they drop the partial qualifications afterwards.
export const withGpaCategory = (application, { keepQualifications = true } = {}) => {
  const bestGpa = getBestGpa(application.qualifications);
  const result = {
    ...application,
    bestGpa,
    category: getCategoryFromGpa(bestGpa)
  };

  if (!keepQualifications) {
    delete result.qualifications;
  }

  return result;
};
