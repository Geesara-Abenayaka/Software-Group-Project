// The v1 keyword engine. The Course Advisor uses it when the assistant API is unavailable
// (no AI key, server down, rate limited), so the chat keeps answering offline.

// Topics covered by the Department of Computer Science & Engineering programmes.
const COURSE_INTENT_MATCHERS = [
  { label: 'Data Science & AI', keywords: ['data science', 'machine learning', 'deep learning', 'ml', 'ai', 'artificial intelligence', 'big data', 'analytics'] },
  { label: 'Software Architecture', keywords: ['software architecture', 'software engineering', 'software', 'architecture', 'programming'] },
  { label: 'Security', keywords: ['cyber', 'security', 'information security', 'cybersecurity'] },
  { label: 'Cloud Computing', keywords: ['cloud', 'cloud computing', 'distributed systems', 'devops'] },
  { label: 'eGovernance', keywords: ['egovernance', 'e-governance', 'governance', 'government', 'public sector'] },
  { label: 'IT Management', keywords: ['it management', 'mba', 'management', 'business', 'information systems', 'technology leadership'] }
]

const FAQ_KNOWLEDGE = [
  {
    keywords: ['apply', 'application process', 'how to apply', 'application'],
    answer: 'To apply, browse the homepage programs and click any program\'s View Details button. From the program page, choose Apply and follow the instructions with your documents, payment confirmation, and declaration.'
  },
  {
    keywords: ['fee', 'application fee', 'how much is the application fee', 'payment', 'how should i pay', 'how to pay', 'payment method'],
    answer: 'The application fee is Rs. 2,000. Please pay by bank transfer and upload the payment confirmation receipt in the application form before submitting.'
  },
  {
    keywords: ['documents', 'required documents', 'upload', 'attachments'],
    answer: 'The site requires your NIC, degree certificate, transcript, professional membership proof (if any), an employer consent letter (if you claim work experience), and the payment confirmation. Upload each document clearly before submitting the form.'
  },
  {
    keywords: ['eligible', 'eligibility', 'entry requirements', 'requirements', 'qualify'],
    answer: 'Each program\'s entry requirements are on its details page and in its Course Details PDF. Most programs need a relevant bachelor\'s degree, and some also need work experience.'
  },
  {
    keywords: ['deadline', 'last date', 'closing date'],
    answer: 'Deadlines are listed on each program card and the program details page. Make sure you submit the application before the listed deadline to avoid missing the intake.'
  },
  {
    keywords: ['contact', 'email', 'e-mail', 'phone', 'reach', 'office'],
    answer: 'You can contact the Department of Computer Science & Engineering postgraduate office by email at postgrad@cse.mrt.ac.lk.'
  },
  {
    keywords: ['login', 'admin', 'staff', 'access'],
    answer: 'This assistant is for student course discovery and site help. Admin access is available from the Login page at the top of the homepage.'
  },
  {
    keywords: ['program details', 'view details', 'details page', 'programme'],
    answer: 'Click any program card on the homepage to see full details, specializations, deadlines, and application instructions.'
  }
]

// Topic cards for when no program matches by name. They open the matching program when the list is loaded.
const FALLBACK_COURSES = [
  {
    title: 'Data Science & AI',
    shortCode: 'msc-ds-ai',
    description: 'The MSc in Data Science & AI, or the Data Science specialisation of the MSc in Computer Science.',
    tags: ['data', 'science', 'ai']
  },
  {
    title: 'Software Architecture',
    shortCode: 'msc-cs',
    description: 'A specialisation of the MSc in Computer Science, for designing large software systems.',
    tags: ['software', 'architecture']
  },
  {
    title: 'IT Management',
    shortCode: 'mba-it',
    description: 'The MBA in IT combines a general MBA with applying IT in management.',
    tags: ['it', 'management']
  },
  {
    title: 'Security Engineering',
    shortCode: 'msc-cs',
    description: 'A specialisation of the MSc in Computer Science, covering secure systems and networks.',
    tags: ['security']
  },
  {
    title: 'Cloud Computing',
    shortCode: 'msc-cs',
    description: 'A specialisation of the MSc in Computer Science, covering cloud platforms and distributed systems.',
    tags: ['cloud']
  },
  {
    title: 'eGovernance',
    shortCode: 'mba-egov',
    description: 'The MBA in eGovernance covers IT in government and public-sector management.',
    tags: ['egovernance']
  }
]

const FALLBACK_FOLLOW_UPS = ['Find my programme', 'How do I apply?', 'What documents do I need?']

// Words that say nothing about a student's interest; ignored when ranking programs.
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'be', 'i', 'me', 'my', 'we', 'you', 'your', 'it', 'this', 'that', 'these',
  'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'about', 'and', 'or', 'any', 'some', 'there', 'other', 'another',
  'what', 'which', 'who', 'how', 'when', 'where', 'why', 'do', 'does', 'can', 'could', 'would', 'should', 'will',
  'want', 'need', 'like', 'tell', 'show', 'give', 'find', 'please', 'have', 'has', 'get', 'interested',
  'recommend', 'suggest', 'program', 'programs', 'programme', 'programmes', 'course', 'courses',
  'degree', 'degrees', 'study', 'focus', 'area', 'areas'
])

export const normalize = (value) => String(value || '').toLowerCase().trim()

const tokenize = (value) =>
  normalize(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

// Treats "programs" and "program" as the same word.
const singularize = (word) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word)

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Whole-word match (plural allowed), so short keywords like "ai" don't match inside "email".
const containsPhrase = (text, phrase) =>
  new RegExp(`\\b${escapeRegExp(normalize(phrase))}(s|es)?\\b`).test(normalize(text))

// The card shape shared by the assistant API, this fallback and the quiz.
export const toRecommendation = (program) => ({
  title: program.title,
  shortCode: program.shortCode,
  description: program.description || 'Open the program page for more details.',
  level: program.level,
  duration: program.duration,
  isProposed: Boolean(program.isProposed)
})

const findFAQAnswer = (query) => {
  for (const item of FAQ_KNOWLEDGE) {
    if (item.keywords.some((keyword) => containsPhrase(query, keyword))) {
      return item.answer
    }
  }
  return null
}

const isCourseRelatedQuery = (query) => {
  const normalized = normalize(query)
  return /\b(recommend\w*|suggest\w*|programs?|programmes?|courses?|degrees?|speciali[sz]ations?|study|data science|software architecture|software engineering|cloud|cyber ?security|security|machine learning|ai|artificial intelligence|mba|it management|e-?governance)\b/.test(normalized)
}

const matchCourseIntent = (query) => {
  for (const intent of COURSE_INTENT_MATCHERS) {
    for (const keyword of intent.keywords) {
      if (containsPhrase(query, keyword)) {
        return intent.label
      }
    }
  }
  return null
}

// Whole words only, ignoring filler words, so "what is the email?" doesn't match every program.
const toKeywords = (value) => {
  const words = tokenize(value)
    .filter((word) => !STOP_WORDS.has(word))
    .map(singularize)
  // Also join neighbouring words, so "cyber security" matches "Cybersecurity"
  const joinedWords = words.slice(1).map((word, index) => `${words[index]}${word}`)
  return [...words, ...joinedWords]
}

const rankPrograms = (query, programs = []) => {
  const queryTokens = toKeywords(query)
  if (queryTokens.length === 0) {
    return []
  }

  return programs
    .map((program) => {
      const specializations = (program.specializations || []).map((spec) => spec.name).join(' ')
      const programWords = new Set(
        toKeywords(`${program.title} ${program.description || ''} ${program.shortCode || ''} ${specializations}`)
      )
      const score = queryTokens.reduce((sum, token) => (programWords.has(token) ? sum + 1 : sum), 0)
      return { ...program, score }
    })
    .filter((program) => program.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

// Topic cards become program cards when the program is loaded; one card per program.
const toFallbackCards = (courses, programs) => {
  const seen = new Set()
  return courses
    .map((course) => {
      const program = programs.find((item) => item.shortCode === course.shortCode)
      return program ? toRecommendation(program) : { title: course.title, description: course.description, shortCode: null }
    })
    .filter((card) => {
      if (!card.shortCode) {
        return true
      }
      if (seen.has(card.shortCode)) {
        return false
      }
      seen.add(card.shortCode)
      return true
    })
    .slice(0, 3)
}

const getCourseSuggestions = (query, programs = []) => {
  const intent = matchCourseIntent(query)
  const recommendations = rankPrograms(query, programs)

  if (recommendations.length > 0) {
    return {
      message: `I found ${recommendations.length} relevant program${recommendations.length > 1 ? 's' : ''} based on your interest.`,
      list: recommendations.map(toRecommendation)
    }
  }

  if (intent) {
    const fallback = FALLBACK_COURSES.filter((course) => course.tags.some((tag) => containsPhrase(intent, tag)))
    return {
      message: `Here are recommended program types for ${intent.toLowerCase()} interests:`,
      list: toFallbackCards(fallback.length > 0 ? fallback : FALLBACK_COURSES, programs)
    }
  }

  return {
    message: 'I can recommend programs based on your interests or answer general site questions. Try asking about software architecture, data science, or application help.',
    list: toFallbackCards(FALLBACK_COURSES, programs)
  }
}

// Same shape as the assistant API: { reply, recommendations, followUps }.
export const getFallbackResponse = (question, programs = []) => {
  const faqAnswer = findFAQAnswer(question)
  const courses = !faqAnswer || isCourseRelatedQuery(question) ? getCourseSuggestions(question, programs) : null

  const reply = faqAnswer
    ? courses
      ? `${faqAnswer}\n\n${courses.message}`
      : faqAnswer
    : courses.message

  return {
    reply,
    recommendations: courses ? courses.list : [],
    followUps: FALLBACK_FOLLOW_UPS
  }
}
