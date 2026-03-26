import express from 'express';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
]);

const GEMINI_MODEL_NAME = process.env.GEMINI_VISION_MODEL || 'gemini-1.5-flash';

const UNIVERSITY_MAP = {
  uom: 'University of Moratuwa',
  uoc: 'University of Colombo',
  uop: 'University of Peradeniya'
};

const DEGREE_KEYWORDS_MAP = {
  bsc: ['BSC', 'BACHELOR', 'HONOURS', 'HONS'],
  msc: ['MSC', 'MASTER'],
  phd: ['PHD', 'DOCTOR', 'DOCTORATE']
};

const SPECIALIZATION_STOPWORDS = new Set([
  'AND',
  'OF',
  'IN',
  'THE',
  'FOR',
  'ENGINEERING',
  'SCIENCE',
  'TECHNOLOGY',
  'STUDIES',
  'SYSTEMS'
]);

const UNIVERSITY_STOPWORDS = new Set([
  'UNIVERSITY',
  'OF',
  'THE',
  'IN',
  'SRI',
  'LANKA'
]);

const FLEX_MATCH_STOPWORDS = new Set([
  'THE',
  'AND',
  'OF',
  'PVT',
  'PRIVATE',
  'LTD',
  'LIMITED',
  'PLC',
  'INC',
  'CO',
  'COMPANY',
  'CORPORATION'
]);

const REQUIRED_PAYMENT_ACCOUNT_NUMBER = '0043618';
const REQUIRED_PAYMENT_FEE = 2000;

const extractYearFromDate = (value = '') => {
  const match = String(value).match(/(19|20)\d{2}$/);
  return match ? match[0] : '';
};

let ocrWorkerPromise = null;
let geminiModel = null;

const getGeminiModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  if (!geminiModel) {
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = client.getGenerativeModel({ model: GEMINI_MODEL_NAME });
  }

  return geminiModel;
};

const getOcrWorker = async () => {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        // Better for certificate-like blocks of text.
        tessedit_pageseg_mode: '6'
      });
      return worker;
    })();
  }

  return ocrWorkerPromise;
};

const normalizeWhitespace = (value = '') => value.replace(/\s+/g, ' ').trim();

const normalizeForSearch = (value = '') => value.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ');

const tokenizeForSearch = (value = '', minLength = 2) => {
  return normalizeForSearch(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= minLength);
};

const getLevenshteinDistance = (left = '', right = '') => {
  const a = String(left);
  const b = String(right);

  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: b.length + 1 }, () => new Array(a.length + 1).fill(0));

  for (let i = 0; i <= b.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
};

const tokensFuzzyMatch = (queryToken, sourceToken) => {
  if (queryToken === sourceToken) {
    return true;
  }

  if (queryToken.length >= 4 && (queryToken.includes(sourceToken) || sourceToken.includes(queryToken))) {
    return true;
  }

  const distance = getLevenshteinDistance(queryToken, sourceToken);
  const threshold = queryToken.length <= 5 ? 1 : 2;
  return distance <= threshold;
};

const specializationTokenMatch = (queryToken, sourceToken) => {
  if (queryToken === sourceToken) {
    return true;
  }

  // Keep specialization checks strict: only allow very small OCR drift on longer tokens.
  if (queryToken.length >= 6) {
    return getLevenshteinDistance(queryToken, sourceToken) <= 1;
  }

  return false;
};

const fuzzyTokenMatchRatio = (queryText = '', sourceText = '', { ignoreStopwords = false } = {}) => {
  const sourceTokens = tokenizeForSearch(sourceText, 2);
  let queryTokens = tokenizeForSearch(queryText, 2);

  if (ignoreStopwords) {
    queryTokens = queryTokens.filter((token) => !FLEX_MATCH_STOPWORDS.has(token));
  }

  if (queryTokens.length === 0) {
    return 1;
  }

  const matchedCount = queryTokens.filter((queryToken) => {
    return sourceTokens.some((sourceToken) => tokensFuzzyMatch(queryToken, sourceToken));
  }).length;

  return matchedCount / queryTokens.length;
};

const findBestFuzzyCandidate = (queryText = '', candidates = []) => {
  const normalizedCandidates = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (!queryText || normalizedCandidates.length === 0) {
    return { candidate: '', score: 0 };
  }

  let bestCandidate = '';
  let bestScore = 0;

  normalizedCandidates.forEach((candidate) => {
    const score = fuzzyTokenMatchRatio(queryText, candidate, { ignoreStopwords: true });
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  });

  return {
    candidate: bestCandidate,
    score: bestScore
  };
};

const sanitizeNic = (value = '') => value.toUpperCase().replace(/[^0-9V]/g, '');

const decodeBase64ToBuffer = (base64Value = '') => {
  const normalized = String(base64Value).replace(/^data:[^;]+;base64,/, '').trim();
  return Buffer.from(normalized, 'base64');
};

const normalizeBase64Payload = (base64Value = '') => {
  return String(base64Value).replace(/^data:[^;]+;base64,/, '').trim();
};

const extractTextWithGeminiVision = async ({ contentBase64, mimeType }) => {
  const model = getGeminiModel();
  if (!model) {
    return '';
  }

  const payload = normalizeBase64Payload(contentBase64);
  if (!payload) {
    return '';
  }

  const response = await model.generateContent([
    {
      text: 'Extract all readable text from this document image. Return only plain text, preserving lines where possible. Do not summarize.'
    },
    {
      inlineData: {
        mimeType,
        data: payload
      }
    }
  ]);

  return normalizeWhitespace(response?.response?.text?.() || '');
};

const extractTextFromDocument = async ({ contentBase64, mimeType }) => {
  const buffer = decodeBase64ToBuffer(contentBase64);

  if (mimeType === 'application/pdf') {
    const parsed = await pdfParse(buffer);
    return normalizeWhitespace(parsed.text || '');
  }

  if (mimeType.startsWith('image/')) {
    try {
      const geminiText = await extractTextWithGeminiVision({ contentBase64, mimeType });
      if (geminiText) {
        return geminiText;
      }
    } catch (error) {
      // Fall back to local OCR when Gemini is unavailable or fails.
      console.warn('Gemini vision OCR fallback to Tesseract:', error.message);
    }
  }

  const worker = await getOcrWorker();
  const result = await worker.recognize(buffer);
  return normalizeWhitespace(result?.data?.text || '');
};

const matchNic = (nicFromForm, extractedText) => {
  const normalizedNic = sanitizeNic(nicFromForm);

  if (!normalizedNic) {
    return {
      verified: false,
      reason: 'NIC in the form is empty.'
    };
  }

  const textForSearch = sanitizeNic(extractedText);
  const nicFound = textForSearch.includes(normalizedNic);

  return {
    verified: nicFound,
    reason: nicFound ? 'NIC number matched.' : 'NIC number not found in uploaded NIC document.'
  };
};

const splitNameTokens = (value = '') => {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const matchSingleNameVariant = (nameVariant, extractedText) => {
  const tokens = splitNameTokens(nameVariant);
  if (tokens.length === 0) {
    return { matched: false, score: 0 };
  }

  const textForSearch = normalizeForSearch(extractedText);
  const compactText = textForSearch.replace(/\s+/g, '');
  const normalizedName = tokens.join(' ');

  const surname = tokens[tokens.length - 1];
  const initials = tokens.slice(0, -1).map((token) => token[0]).filter(Boolean);

  const phraseMatched = textForSearch.includes(normalizedName);
  const surnameMatched = surname ? textForSearch.includes(surname) : false;

  const initialsAsWordMatches = initials.filter((initial) => {
    const pattern = new RegExp(`\\b${initial}\\b`);
    return pattern.test(textForSearch);
  }).length;

  const initialsSequence = initials.join('');
  const initialsSequenceMatched = initialsSequence ? compactText.includes(initialsSequence) : false;
  const requiredInitialHits = initials.length > 0 ? Math.max(1, Math.ceil(initials.length * 0.6)) : 0;

  const initialsMatched = initials.length === 0
    ? false
    : initialsSequenceMatched || initialsAsWordMatches >= requiredInitialHits;

  const longTokens = tokens.filter((token) => token.length > 2);
  const longTokenMatchCount = longTokens.filter((token) => textForSearch.includes(token)).length;
  const longTokenRatio = longTokens.length > 0 ? longTokenMatchCount / longTokens.length : 0;

  const matched = phraseMatched || (surnameMatched && initialsMatched) || longTokenRatio >= 0.6;

  const score = phraseMatched
    ? 1
    : surnameMatched && initialsMatched
      ? 0.9
      : longTokenRatio;

  return {
    matched,
    score
  };
};

const matchName = ({ fullName, nameWithInitials, extractedText }) => {
  const candidates = [fullName, nameWithInitials].filter((value) => String(value || '').trim());

  if (candidates.length === 0) {
    return {
      matched: false,
      ratio: 0
    };
  }

  const results = candidates.map((candidate) => matchSingleNameVariant(candidate, extractedText));
  const bestResult = results.sort((a, b) => b.score - a.score)[0];

  return {
    matched: bestResult?.matched || false,
    ratio: bestResult?.score || 0
  };
};

const matchFullNameStrict = ({ fullName, extractedText }) => {
  const textForSearch = normalizeForSearch(extractedText);
  const tokens = splitNameTokens(fullName).filter((token) => token.length > 1);

  // Require at least first name + surname for strict NIC matching.
  if (tokens.length < 2) {
    return { matched: false, ratio: 0 };
  }

  const normalizedFullName = tokens.join(' ');
  const compactText = textForSearch.replace(/\s+/g, ' ');

  // Strict check: all name tokens must appear in the same order as entered.
  const fullPhraseMatched = compactText.includes(normalizedFullName);
  if (fullPhraseMatched) {
    return { matched: true, ratio: 1 };
  }

  return { matched: false, ratio: 0 };
};

const buildDegreeSignals = (qualifications = []) => {
  const keywords = new Set();
  const graduationYears = new Set();
  const specializationTokens = new Set();
  const universityTokens = new Set();

  qualifications.forEach((qualification) => {
    const degreeType = String(qualification?.degree || '').toLowerCase();
    (DEGREE_KEYWORDS_MAP[degreeType] || []).forEach((keyword) => keywords.add(keyword));

    const specializationKeywords = String(qualification?.specialization || '')
      .toUpperCase()
      .split(/\s+/)
      .filter((token) => token.length > 2);
    specializationKeywords.forEach((keyword) => keywords.add(keyword));
    specializationKeywords.forEach((token) => specializationTokens.add(token));

    const universityCode = String(qualification?.university || '').toLowerCase();
    const universityName = UNIVERSITY_MAP[universityCode] || '';
    const universityNameTokens = universityName
      .toUpperCase()
      .split(/\s+/)
      .filter((token) => token.length > 2);

    universityNameTokens.forEach((keyword) => keywords.add(keyword));
    universityNameTokens
      .filter((token) => !UNIVERSITY_STOPWORDS.has(token))
      .forEach((token) => universityTokens.add(token));

    const graduationYear = extractYearFromDate(qualification?.graduationDate || '');
    if (graduationYear) {
      graduationYears.add(graduationYear);
    }
  });

  return {
    keywords: [...keywords],
    graduationYears: [...graduationYears],
    specializationTokens: [...specializationTokens],
    universityTokens: [...universityTokens]
  };
};

const matchDegreeCertificate = ({ qualifications, extractedText }) => {
  const { keywords, graduationYears, specializationTokens, universityTokens } = buildDegreeSignals(qualifications);
  const textForSearch = normalizeForSearch(extractedText);
  const sourceTokens = tokenizeForSearch(extractedText, 2);
  const sourceTokensForSpecialization = tokenizeForSearch(extractedText, 3);
  const coreSpecializationTokens = specializationTokens.filter((token) => !SPECIALIZATION_STOPWORDS.has(token));
  const specializationPhrase = tokenizeForSearch(
    qualifications?.[0]?.specialization || '',
    3
  )
    .join(' ');

  const keywordMatches = keywords.filter((keyword) => textForSearch.includes(keyword));
  const keywordRatio = keywords.length > 0 ? keywordMatches.length / keywords.length : 0;
  const matchedGraduationYears = graduationYears.filter((year) => textForSearch.includes(year));
  const matchedSpecializationTokens = specializationTokens.filter((token) => {
    return sourceTokensForSpecialization.some((sourceToken) => specializationTokenMatch(token, sourceToken));
  });
  const matchedCoreSpecializationTokens = coreSpecializationTokens.filter((token) => {
    return sourceTokensForSpecialization.some((sourceToken) => specializationTokenMatch(token, sourceToken));
  });
  const matchedUniversityTokens = universityTokens.filter((token) => {
    return sourceTokens.some((sourceToken) => tokensFuzzyMatch(token, sourceToken));
  });
  const yearPass = graduationYears.length === 0 ? true : matchedGraduationYears.length > 0;
  const specializationPhraseMatched = specializationPhrase
    ? textForSearch.includes(specializationPhrase)
    : false;
  const coreSpecializationPass = coreSpecializationTokens.length === 0
    ? true
    : matchedCoreSpecializationTokens.length === coreSpecializationTokens.length;
  const specializationPass = specializationTokens.length === 0
    ? true
    : coreSpecializationPass && (specializationPhraseMatched || matchedSpecializationTokens.length === specializationTokens.length);
  const universityPass = universityTokens.length === 0
    ? true
    : matchedUniversityTokens.length === universityTokens.length;
  const specializationRatio = specializationTokens.length === 0
    ? 1
    : matchedSpecializationTokens.length / specializationTokens.length;
  const universityRatio = universityTokens.length === 0
    ? 1
    : matchedUniversityTokens.length / universityTokens.length;

  const keywordPass = keywords.length === 0 ? true : keywordRatio >= 0.3;
  const verified = keywordPass && yearPass && specializationPass && universityPass;

  const failureReasons = [];
  if (!keywordPass) {
    failureReasons.push('qualification fields do not match');
  }
  if (!yearPass) {
    failureReasons.push('graduation year does not match');
  }
  if (!specializationPass) {
    failureReasons.push('specialization does not match');
  }
  if (!universityPass) {
    failureReasons.push('university does not match');
  }

  const matchStrength = (keywordRatio * 0.5)
    + (yearPass ? 0.2 : 0)
    + (specializationRatio * 0.2)
    + (universityRatio * 0.1);

  return {
    verified,
    matchStrength,
    keywordPass,
    yearPass,
    specializationPass,
    universityPass,
    matchedKeywords: keywordMatches,
    matchedGraduationYears,
    matchedSpecializationTokens,
    matchedUniversityTokens,
    reason: verified
      ? 'Degree/Diploma details matched with form data.'
      : `Degree/Diploma document mismatch: ${failureReasons.join(', ')}.`
  };
};

const MEMBERSHIP_ORGANIZATION_PATTERNS = [
  { key: 'IEEE', pattern: /\bIEEE\b/i, label: 'IEEE' },
  { key: 'IET', pattern: /\bIET\b/i, label: 'IET' },
  { key: 'ACM', pattern: /\bACM\b/i, label: 'ACM' },
  { key: 'IESL', pattern: /\bIESL\b|Institution of Engineers\s*,?\s*Sri Lanka/i, label: 'IESL' }
];

const MEMBERSHIP_CATEGORY_PATTERNS = [
  { pattern: /\bStudent Member\b/i, label: 'Student Member' },
  { pattern: /\bGraduate Member\b/i, label: 'Graduate Member' },
  { pattern: /\bAssociate Member\b/i, label: 'Associate Member' },
  { pattern: /\bSenior Member\b/i, label: 'Senior Member' },
  { pattern: /\bMember\b/i, label: 'Member' }
];

const MONTH_NAME_BY_NUMBER = {
  '01': 'JANUARY',
  '02': 'FEBRUARY',
  '03': 'MARCH',
  '04': 'APRIL',
  '05': 'MAY',
  '06': 'JUNE',
  '07': 'JULY',
  '08': 'AUGUST',
  '09': 'SEPTEMBER',
  '10': 'OCTOBER',
  '11': 'NOVEMBER',
  '12': 'DECEMBER'
};

const MONTH_SHORT_NAME_BY_NUMBER = {
  '01': 'JAN',
  '02': 'FEB',
  '03': 'MAR',
  '04': 'APR',
  '05': 'MAY',
  '06': 'JUN',
  '07': 'JUL',
  '08': 'AUG',
  '09': 'SEP',
  '10': 'OCT',
  '11': 'NOV',
  '12': 'DEC'
};

const textContainsFlexible = (sourceText, queryText) => {
  const source = normalizeForSearch(sourceText);
  const query = normalizeForSearch(queryText);

  if (!query) {
    return true;
  }

  if (source.includes(query)) {
    return true;
  }

  // OCR can slightly alter words; use token-level fuzzy ratio for resilient matching.
  return fuzzyTokenMatchRatio(query, source, { ignoreStopwords: true }) >= 0.6;
};

const hasMonthYearMatch = (sourceText, month, year) => {
  const normalizedText = normalizeForSearch(sourceText);
  const normalizedMonth = String(month || '').padStart(2, '0');
  const normalizedYear = String(year || '').trim();

  if (!normalizedMonth || !normalizedYear) {
    return true;
  }

  const monthName = MONTH_NAME_BY_NUMBER[normalizedMonth] || '';
  const monthShortName = MONTH_SHORT_NAME_BY_NUMBER[normalizedMonth] || '';
  const monthNumberVariants = [normalizedMonth, String(Number(normalizedMonth))];

  const monthNameWithYearRegex = monthName
    ? new RegExp(`\\b${monthName}(?:\\s+[0-9]{1,2},?)?\\s+${normalizedYear}\\b`, 'i')
    : null;
  const monthShortWithYearRegex = monthShortName
    ? new RegExp(`\\b${monthShortName}(?:\\s+[0-9]{1,2},?)?\\s+${normalizedYear}\\b`, 'i')
    : null;
  const monthNameWithYear = monthNameWithYearRegex ? monthNameWithYearRegex.test(normalizedText) : false;
  const monthShortWithYear = monthShortWithYearRegex ? monthShortWithYearRegex.test(normalizedText) : false;
  const numericWithSlash = monthNumberVariants.some((variant) => normalizedText.includes(`${variant}/${normalizedYear}`));
  const numericWithDash = monthNumberVariants.some((variant) => normalizedText.includes(`${variant}-${normalizedYear}`));
  const numericWithSpace = monthNumberVariants.some((variant) => normalizedText.includes(`${variant} ${normalizedYear}`));
  const yearMonthSlash = monthNumberVariants.some((variant) => normalizedText.includes(`${normalizedYear}/${variant}`));
  const yearMonthDash = monthNumberVariants.some((variant) => normalizedText.includes(`${normalizedYear}-${variant}`));
  const yearMonthSpace = monthNumberVariants.some((variant) => normalizedText.includes(`${normalizedYear} ${variant}`));

  const hasOpenEndedIndicator = ['PRESENT', 'CURRENT', 'TO DATE', 'UP TO DATE', 'ONGOING']
    .some((term) => normalizedText.includes(term));
  const currentYear = String(new Date().getFullYear());
  const openEndedMatch = hasOpenEndedIndicator && normalizedYear >= currentYear;

  return monthNameWithYear
    || monthShortWithYear
    || numericWithSlash
    || numericWithDash
    || numericWithSpace
    || yearMonthSlash
    || yearMonthDash
    || yearMonthSpace
    || openEndedMatch;
};

const normalizeExperiences = (experiences = []) => {
  if (!Array.isArray(experiences)) {
    return [];
  }

  return experiences
    .map((experience) => ({
      fromMonth: String(experience?.fromMonth || '').trim(),
      fromYear: String(experience?.fromYear || '').trim(),
      toMonth: String(experience?.toMonth || '').trim(),
      toYear: String(experience?.toYear || '').trim(),
      company: String(experience?.company || '').trim(),
      position: String(experience?.position || '').trim()
    }))
    .filter((experience) => (
      experience.fromMonth
      || experience.fromYear
      || experience.toMonth
      || experience.toYear
      || experience.company
      || experience.position
    ));
};

const extractWorkExperienceDetailsFromText = (text = '') => {
  const raw = String(text || '');
  const normalized = normalizeWhitespace(raw);

  const companyCandidates = new Set();
  const positionCandidates = new Set();
  const dateRangeCandidates = [];

  const companyPatterns = [
    /(?:EMPLOYED\s+AT|WORKING\s+AT|AT|WITH|FOR)\s+([A-Z][A-Z0-9&.,\-()\s]{3,80}?)(?=\s+(?:AS|FROM|DURING|BETWEEN|SINCE|TO|UNTIL|ON|IN)\b|[,.]|$)/gi,
    /(?:COMPANY|ORGANIZATION|EMPLOYER)\s*[:\-]\s*([A-Z][A-Z0-9&.,\-()\s]{3,80}?)(?=\s+(?:AS|FROM|DURING|BETWEEN|SINCE|TO|UNTIL|ON|IN)\b|[,.]|$)/gi,
    /(?:EMPLOYEE\s+OF|EMPLOYED\s+BY)\s+([A-Z][A-Z0-9&.,\-()\s]{3,80}?)(?=\.|,|$)/gi
  ];

  const positionPatterns = [
    /(?:AS|POSITION\s+OF|DESIGNATION\s*[:\-])\s+([A-Z][A-Z0-9&.,\-()\s]{2,60}?)(?=\s+(?:AT|WITH|FROM|DURING|BETWEEN|SINCE|TO|UNTIL|ON|IN)\b|[,.]|$)/gi,
    /(?:ROLE|POST)\s*[:\-]\s*([A-Z][A-Z0-9&.,\-()\s]{2,60}?)(?=\s+(?:AT|WITH|FROM|DURING|BETWEEN|SINCE|TO|UNTIL|ON|IN)\b|[,.]|$)/gi,
    /(?:IS\s+A|IS\s+AN)\s+([A-Z][A-Z0-9&.,\-()\s]{2,60}?)(?=\s+(?:AND|AT|WITH|FROM|DURING|BETWEEN|SINCE|TO|UNTIL|ON|IN)\b|[,.]|$)/gi
  ];

  const monthPattern = '(?:JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)';
  const numericMonthYearPattern = '(?:0?[1-9]|1[0-2])[\\/-](?:19|20)\\d{2}|(?:19|20)\\d{2}[\\/-](?:0?[1-9]|1[0-2])';
  const monthYearPattern = `(?:${monthPattern})\\s+(?:19|20)\\d{2}|${numericMonthYearPattern}`;
  const dateRangeRegex = new RegExp(`(${monthYearPattern})\\s*(?:TO|UNTIL|TILL|THROUGH|-)\\s*(${monthYearPattern}|PRESENT|CURRENT|TO\\s+DATE)`, 'gi');

  const cleanCandidate = (value = '') => normalizeWhitespace(String(value).replace(/[.,;:]$/, ''));

  for (const pattern of companyPatterns) {
    const matches = normalized.matchAll(pattern);
    for (const match of matches) {
      const candidate = cleanCandidate(match[1]);
      if (candidate.length >= 3) {
        companyCandidates.add(candidate);
      }
    }
  }

  for (const pattern of positionPatterns) {
    const matches = normalized.matchAll(pattern);
    for (const match of matches) {
      const candidate = cleanCandidate(match[1]);
      if (candidate.length >= 2) {
        positionCandidates.add(candidate);
      }
    }
  }

  const dateRangeMatches = normalized.matchAll(dateRangeRegex);
  for (const match of dateRangeMatches) {
    const fromValue = cleanCandidate(match[1]);
    const toValue = cleanCandidate(match[2]);
    dateRangeCandidates.push({
      from: fromValue,
      to: toValue
    });
  }

  return {
    companies: [...companyCandidates],
    positions: [...positionCandidates],
    dateRanges: dateRangeCandidates
  };
};

const hasMonthYearInValue = (value = '', month, year) => {
  return hasMonthYearMatch(value, month, year);
};

const extractJoinedDate = (text = '') => {
  const mmDdYyyy = text.match(/\b(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d{2}\b/);
  if (mmDdYyyy) {
    return mmDdYyyy[0];
  }

  const yyyyMmDd = text.match(/\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])\b/);
  if (yyyyMmDd) {
    const [year, month, day] = yyyyMmDd[0].split('-');
    return `${month}/${day}/${year}`;
  }

  const monthNameDate = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-9]{1,2}),\s*((?:19|20)\d{2})\b/i);
  if (monthNameDate) {
    const monthMap = {
      january: '01',
      february: '02',
      march: '03',
      april: '04',
      may: '05',
      june: '06',
      july: '07',
      august: '08',
      september: '09',
      october: '10',
      november: '11',
      december: '12'
    };

    const month = monthMap[String(monthNameDate[1]).toLowerCase()] || '';
    const day = String(monthNameDate[2]).padStart(2, '0');
    const year = monthNameDate[3];

    if (month) {
      return `${month}/${day}/${year}`;
    }
  }

  return '';
};

const extractMembershipDetailsFromText = (text = '') => {
  const organizationMatch = MEMBERSHIP_ORGANIZATION_PATTERNS.find((item) => item.pattern.test(text));
  const categoryMatch = MEMBERSHIP_CATEGORY_PATTERNS.find((item) => item.pattern.test(text));
  const dateJoined = extractJoinedDate(text);

  return {
    organization: organizationMatch?.label || '',
    category: categoryMatch?.label || '',
    dateJoined
  };
};

const normalizeQualifications = (qualifications = []) => {
  if (!Array.isArray(qualifications)) {
    return [];
  }

  return qualifications
    .map((qualification) => ({
      university: String(qualification?.university || '').trim(),
      degree: String(qualification?.degree || '').trim(),
      specialization: String(qualification?.specialization || '').trim(),
      graduationDate: String(qualification?.graduationDate || '').trim()
    }))
    .filter((qualification) => (
      qualification.university
      || qualification.degree
      || qualification.specialization
      || qualification.graduationDate
    ));
};

const normalizeNumberLikeText = (value = '') => {
  return String(value).toUpperCase().replace(/O/g, '0');
};

const normalizeDigitsOnly = (value = '') => {
  return normalizeNumberLikeText(value).replace(/\D/g, '');
};

const parseAmountValue = (token = '') => {
  const normalized = normalizeNumberLikeText(String(token)).replace(/,/g, '');
  const numeric = normalized.replace(/[^0-9.]/g, '');
  if (!numeric) {
    return null;
  }

  const value = Number.parseFloat(numeric);
  if (!Number.isFinite(value)) {
    return null;
  }

  // Receipt stores cents as .00; compare in rupees.
  return Math.round(value);
};

const extractPaymentAccountCandidates = (text = '') => {
  const candidates = new Set();
  const source = String(text || '');
  const labelPattern = /(?:ACCOUNT\s*NUMBER|ACC(?:OUNT)?\s*(?:NO|NUMBER)?|A\/C\s*(?:NO|NUMBER)?)\s*[:#-]?\s*([0-9O\s-]{6,24})/gi;
  const matches = source.matchAll(labelPattern);

  for (const match of matches) {
    const digits = normalizeDigitsOnly(match[1]);
    if (digits.length >= 6 && digits.length <= 12) {
      candidates.add(digits);
    }
  }

  // Useful fallback when OCR misses the label but still captures the account number text.
  const requiredDigits = normalizeDigitsOnly(REQUIRED_PAYMENT_ACCOUNT_NUMBER);
  const normalizedSourceDigits = normalizeDigitsOnly(source);
  if (requiredDigits && normalizedSourceDigits.includes(requiredDigits)) {
    candidates.add(requiredDigits);
  }

  return [...candidates];
};

const extractPaymentAmountCandidates = (text = '') => {
  const candidates = new Set();
  const source = normalizeNumberLikeText(String(text || ''));
  const amountTokenPattern = /[0-9][0-9,]*(?:\.[0-9]{2})?/g;
  const matches = source.matchAll(amountTokenPattern);
  const amountContextPattern = /RS\.?|LKR|AMOUNT|TOTAL|FEE|DENOMINATION|DETAILS OF PAYMENT/i;

  for (const match of matches) {
    const token = match[0];
    const value = parseAmountValue(token);
    if (!Number.isFinite(value)) {
      continue;
    }

    const index = match.index || 0;
    const contextStart = Math.max(0, index - 24);
    const contextEnd = Math.min(source.length, index + token.length + 24);
    const context = source.slice(contextStart, contextEnd);
    const isAmountContext = amountContextPattern.test(context);

    // Keep realistic rupee values only when their surrounding text suggests payment amounts.
    if (isAmountContext && value >= 500 && value <= 500000) {
      candidates.add(value);
    }
  }

  return [...candidates].sort((a, b) => a - b);
};

const verifyPaymentReceiptText = (text = '') => {
  const normalizedText = normalizeForSearch(text);
  const extractedAccountNumbers = extractPaymentAccountCandidates(text);
  const extractedAmounts = extractPaymentAmountCandidates(text);

  const requiredAccountDigits = normalizeDigitsOnly(REQUIRED_PAYMENT_ACCOUNT_NUMBER);
  const accountMatched = extractedAccountNumbers.some((candidate) => (
    candidate === requiredAccountDigits || candidate.endsWith(requiredAccountDigits)
  ));

  const feeMatched = extractedAmounts.some((amount) => amount === REQUIRED_PAYMENT_FEE);
  const universityMentioned = /UNIVERSITY OF MORATUWA|MORATUWA/.test(normalizedText);

  const reasons = [];
  if (!accountMatched) reasons.push('account number does not match');
  if (!feeMatched) reasons.push('processing fee must be exactly Rs. 2,000');

  const verified = accountMatched && feeMatched;

  return {
    verified,
    reason: verified
      ? 'Payment receipt matched required account number and fee.'
      : `Payment receipt mismatch: ${reasons.join(', ')}.`,
    extracted: {
      accountNumbers: extractedAccountNumbers,
      amounts: extractedAmounts,
      universityMentioned,
      requiredAccountNumber: REQUIRED_PAYMENT_ACCOUNT_NUMBER,
      requiredFee: REQUIRED_PAYMENT_FEE
    }
  };
};

router.post('/verify-payment-receipt', async (req, res) => {
  try {
    const { paymentDocument } = req.body || {};

    if (!paymentDocument) {
      return res.status(400).json({
        success: false,
        message: 'paymentDocument is required.'
      });
    }

    const mimeType = String(paymentDocument?.mimeType || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return res.status(400).json({
        success: false,
        message: 'Payment document has unsupported file type.'
      });
    }

    if (!paymentDocument?.contentBase64) {
      return res.status(400).json({
        success: false,
        message: 'Payment document is missing contentBase64.'
      });
    }

    const extractedText = await extractTextFromDocument(paymentDocument);
    const verification = verifyPaymentReceiptText(extractedText);

    return res.json({
      success: true,
      data: {
        verified: verification.verified,
        reason: verification.reason,
        extracted: {
          ...verification.extracted,
          textPreview: extractedText.slice(0, 400)
        }
      }
    });
  } catch (error) {
    console.error('Error verifying payment receipt:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment receipt verification failed. Please upload a clearer receipt.',
      error: error.message
    });
  }
});

router.post('/extract-memberships', async (req, res) => {
  try {
    const { membershipDocuments } = req.body || {};

    if (!Array.isArray(membershipDocuments) || membershipDocuments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'membershipDocuments must be a non-empty array.'
      });
    }

    for (const [index, document] of membershipDocuments.entries()) {
      const mimeType = String(document?.mimeType || '').toLowerCase();
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return res.status(400).json({
          success: false,
          message: `membershipDocuments[${index}] has unsupported file type.`
        });
      }

      if (!document?.contentBase64) {
        return res.status(400).json({
          success: false,
          message: `membershipDocuments[${index}] is missing contentBase64.`
        });
      }
    }

    const extractedTexts = await Promise.all(
      membershipDocuments.map((document) => extractTextFromDocument(document))
    );

    const extractedMemberships = extractedTexts
      .map((text) => extractMembershipDetailsFromText(text))
      .filter((membership) => membership.organization || membership.category || membership.dateJoined);

    return res.json({
      success: true,
      data: {
        memberships: extractedMemberships
      }
    });
  } catch (error) {
    console.error('Error extracting membership details:', error);
    return res.status(500).json({
      success: false,
      message: 'Membership extraction failed. Please use clear image/PDF files.',
      error: error.message
    });
  }
});

router.post('/extract-work-experience', async (req, res) => {
  try {
    const { employerDocument, employerDocuments, experiences } = req.body || {};
    const normalizedEmployerDocuments = Array.isArray(employerDocuments) && employerDocuments.length > 0
      ? employerDocuments
      : employerDocument
        ? [employerDocument]
        : [];

    if (normalizedEmployerDocuments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one employer document is required.'
      });
    }

    for (const [index, document] of normalizedEmployerDocuments.entries()) {
      const mimeType = String(document?.mimeType || '').toLowerCase();
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return res.status(400).json({
          success: false,
          message: `employerDocuments[${index}] has unsupported file type.`
        });
      }

      if (!document?.contentBase64) {
        return res.status(400).json({
          success: false,
          message: `employerDocuments[${index}] is missing contentBase64.`
        });
      }
    }

    const normalizedExperiences = normalizeExperiences(experiences);
    if (normalizedExperiences.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one filled work experience record is required.'
      });
    }

    const extractedTexts = await Promise.all(
      normalizedEmployerDocuments.map((document) => extractTextFromDocument(document))
    );
    const combinedExtractedText = extractedTexts.join(' ');
    const extractedDetailsByDocument = extractedTexts.map((text) => extractWorkExperienceDetailsFromText(text));
    const extractedDetails = {
      companies: [...new Set(extractedDetailsByDocument.flatMap((detail) => detail.companies))],
      positions: [...new Set(extractedDetailsByDocument.flatMap((detail) => detail.positions))],
      dateRanges: extractedDetailsByDocument.flatMap((detail) => detail.dateRanges)
    };

    const rowResults = normalizedExperiences.map((experience, index) => {
      const companyInText = experience.company ? textContainsFlexible(combinedExtractedText, experience.company) : true;
      const companyInExtracted = experience.company
        ? extractedDetails.companies.some((companyCandidate) => textContainsFlexible(companyCandidate, experience.company))
        : true;
      const bestCompanyCandidate = findBestFuzzyCandidate(experience.company, extractedDetails.companies);
      const hasExtractedCompanyCandidates = extractedDetails.companies.length > 0;
      const companyMatch = experience.company
        ? (hasExtractedCompanyCandidates ? companyInExtracted : companyInText)
        : true;

      const positionInText = experience.position ? textContainsFlexible(combinedExtractedText, experience.position) : true;
      const positionInExtracted = experience.position
        ? extractedDetails.positions.some((positionCandidate) => textContainsFlexible(positionCandidate, experience.position))
        : true;
      const bestPositionCandidate = findBestFuzzyCandidate(experience.position, extractedDetails.positions);
      const hasExtractedPositionCandidates = extractedDetails.positions.length > 0;
      const positionMatch = experience.position
        ? (hasExtractedPositionCandidates ? positionInExtracted : positionInText)
        : true;

      const fromInText = hasMonthYearMatch(combinedExtractedText, experience.fromMonth, experience.fromYear);
      const toInText = hasMonthYearMatch(combinedExtractedText, experience.toMonth, experience.toYear);
      const fromInExtractedRange = extractedDetails.dateRanges.some((range) => hasMonthYearInValue(range.from, experience.fromMonth, experience.fromYear));
      const toInExtractedRange = extractedDetails.dateRanges.some((range) => {
        const toYear = String(experience.toYear || '').trim();
        const currentYear = String(new Date().getFullYear());
        if (toYear && Number(toYear) >= Number(currentYear) && /(PRESENT|CURRENT|TO DATE)/i.test(String(range.to || ''))) {
          return true;
        }
        return hasMonthYearInValue(range.to, experience.toMonth, experience.toYear);
      });

      const fromMatch = fromInText || fromInExtractedRange;
      const toMatch = toInText || toInExtractedRange;

      const verified = companyMatch && positionMatch && fromMatch && toMatch;
      const reasons = [];

      if (!companyMatch) reasons.push('company does not match');
      if (!positionMatch) reasons.push('position does not match');
      if (!fromMatch) reasons.push('from month/year does not match');
      if (!toMatch) reasons.push('to month/year does not match');

      return {
        index,
        verified,
        reason: verified ? 'Matched' : reasons.join(', '),
        matchedDocumentNames: normalizedEmployerDocuments.map((document) => document?.name || 'employer-document'),
        matchedCompany: companyMatch ? (bestCompanyCandidate.candidate || (companyInText ? experience.company : '')) : '',
        matchedPosition: positionMatch ? (bestPositionCandidate.candidate || (positionInText ? experience.position : '')) : '',
        checks: {
          companyMatch,
          positionMatch,
          fromMatch,
          toMatch
        }
      };
    });

    const unmatchedRows = rowResults.filter((row) => !row.verified);
    const verified = unmatchedRows.length === 0;

    return res.json({
      success: true,
      data: {
        verified,
        reason: verified
          ? `Work experience details matched with ${normalizedEmployerDocuments.length} employer document(s).`
          : `${unmatchedRows.length} work experience record(s) do not match extracted employer letter details.`,
        rows: rowResults,
        extracted: {
          companies: extractedDetails.companies,
          positions: extractedDetails.positions,
          dateRanges: extractedDetails.dateRanges,
          textPreview: combinedExtractedText.slice(0, 400),
          files: normalizedEmployerDocuments.map((document) => document?.name || 'employer-document')
        }
      }
    });
  } catch (error) {
    console.error('Error extracting work experience details:', error);
    return res.status(500).json({
      success: false,
      message: 'Work experience extraction failed. Please upload a clearer employer letter.',
      error: error.message
    });
  }
});

router.post('/verify-documents', async (req, res) => {
  try {
    const {
      fullName,
      nameWithInitials,
      nicNo,
      qualifications,
      nicDocument,
      degreeDocument,
      degreeDocuments
    } = req.body || {};

    const normalizedDegreeDocuments = Array.isArray(degreeDocuments) && degreeDocuments.length > 0
      ? degreeDocuments
      : degreeDocument
        ? [degreeDocument]
        : [];

    if (!nicDocument || normalizedDegreeDocuments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'nicDocument and at least one degree document are required.'
      });
    }

    const documents = [
      { label: 'nicDocument', value: nicDocument },
      ...normalizedDegreeDocuments.map((document, index) => ({
        label: `degreeDocument[${index}]`,
        value: document
      }))
    ];

    for (const document of documents) {
      const mimeType = String(document.value?.mimeType || '').toLowerCase();
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        return res.status(400).json({
          success: false,
          message: `${document.label} has unsupported file type.`
        });
      }

      if (!document.value?.contentBase64) {
        return res.status(400).json({
          success: false,
          message: `${document.label} is missing contentBase64.`
        });
      }
    }

    const [nicExtractedText, ...degreeExtractedTexts] = await Promise.all([
      extractTextFromDocument(nicDocument),
      ...normalizedDegreeDocuments.map((document) => extractTextFromDocument(document))
    ]);

    const normalizedQualifications = normalizeQualifications(qualifications);
    if (normalizedQualifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one academic qualification is required for degree verification.'
      });
    }

    const nicResult = matchNic(nicNo, nicExtractedText);
    const nicNameResult = matchFullNameStrict({ fullName, extractedText: nicExtractedText });

    const nameVerification = {
      verified: Boolean(nicNameResult.matched),
      matchedFileName: nicDocument?.name || null,
      reason: nicNameResult.matched
        ? 'Full Name matched with NIC document.'
        : 'Full Name mismatch: name in NIC document does not match the entered Full Name.'
    };

    const qualificationResults = normalizedQualifications.map((qualification, qualificationIndex) => {
      const resultsForQualification = degreeExtractedTexts.map((text, fileIndex) => {
        const result = matchDegreeCertificate({
          qualifications: [qualification],
          extractedText: text
        });

        return {
          ...result,
          fileName: normalizedDegreeDocuments[fileIndex]?.name || `degree-file-${fileIndex + 1}`
        };
      });

      const matchedResult = resultsForQualification.find((result) => result.verified);
      const bestResult = [...resultsForQualification].sort((a, b) => b.matchStrength - a.matchStrength)[0];

      return {
        index: qualificationIndex,
        qualification,
        verified: Boolean(matchedResult),
        matchedResult: matchedResult || null,
        bestResult: bestResult || null
      };
    });

    const unmatchedQualifications = qualificationResults.filter((result) => !result.verified);
    const degreeVerified = unmatchedQualifications.length === 0;

    const matchedFiles = qualificationResults
      .map((result) => result.matchedResult?.fileName)
      .filter(Boolean);

    const unmatchedReasons = unmatchedQualifications.map((result) => {
      const specializationLabel = result.qualification.specialization || 'unspecified specialization';
      const reason = result.bestResult?.reason || 'no matching degree document found';
      return `qualification ${result.index + 1} (${specializationLabel}): ${reason}`;
    });

    const degreeReason = degreeVerified
      ? `Degree/Diploma details verified for all qualifications. Matched files: ${[...new Set(matchedFiles)].join(', ')}.`
      : `Degree/Diploma verification failed for ${unmatchedQualifications.length} qualification(s): ${unmatchedReasons.join(' | ')}`;

    return res.json({
      success: true,
      data: {
        nic: {
          verified: nicResult.verified,
          reason: nicResult.reason
        },
        degreeCertificate: {
          verified: degreeVerified,
          reason: degreeReason,
          qualificationResults: qualificationResults.map((result) => ({
            index: result.index,
            specialization: result.qualification.specialization,
            verified: result.verified,
            matchedFileName: result.matchedResult?.fileName || null,
            reason: result.verified
              ? result.matchedResult?.reason || 'Matched'
              : result.bestResult?.reason || 'No matching degree document found.'
          }))
        },
        name: nameVerification

      }
    });
  } catch (error) {
    console.error('Error verifying uploaded documents:', error);
    return res.status(500).json({
      success: false,
      message: 'Document verification failed. Please try with clearer documents.',
      error: error.message
    });
  }
});

export default router;
