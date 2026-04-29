import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../styles/FloatingAssistant.css'

const PROGRAMS_KEY = 'floating_assistant_programs_v1'

const QUICK_QUESTIONS = [
  'Recommend a course for business analytics',
  'What documents do I need?',
  'How do I apply?',
  'Show me programs with data or AI focus'
]

const COURSE_INTENT_MATCHERS = [
  { label: 'Business Analytics', keywords: ['business analytics', 'analytics', 'data analytics', 'analysis'] },
  { label: 'Data Science', keywords: ['data science', 'machine learning', 'ml', 'ai', 'artificial intelligence', 'big data'] },
  { label: 'Information Systems', keywords: ['information systems', 'it management', 'systems management', 'technology leadership'] },
  { label: 'Project Management', keywords: ['project management', 'project lead', 'pmp', 'projects'] },
  { label: 'Human Resources', keywords: ['human resources', 'hr', 'talent', 'people management'] },
  { label: 'Marketing', keywords: ['marketing', 'digital marketing', 'brand', 'sales'] },
  { label: 'Finance', keywords: ['finance', 'financial', 'accounting', 'investment'] },
  { label: 'Cyber Security', keywords: ['cyber', 'security', 'information security', 'cybersecurity'] }
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
    answer: 'The site requires your NIC, degree certificate, membership proof, transcript, and payment confirmation. Upload each document clearly before submitting the form.'
  },
  {
    keywords: ['deadline', 'last date', 'closing date'],
    answer: 'Deadlines are listed on each program card and the program details page. Make sure you submit the application before the listed deadline to avoid missing the intake.'
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

const FALLBACK_COURSES = [
  {
    title: 'MSc in Business Analytics',
    description: 'Ideal for students who want business insight from data and analytics.',
    tags: ['analytics', 'business', 'data']
  },
  {
    title: 'MSc in Data Science',
    description: 'Best for careers in machine learning, AI, and data engineering.',
    tags: ['data', 'science', 'ai']
  },
  {
    title: 'MSc in Information Systems',
    description: 'Designed for leaders in enterprise IT, systems strategy and governance.',
    tags: ['systems', 'information', 'it']
  },
  {
    title: 'MSc in Project Management',
    description: 'Recommended for professionals managing projects, teams and delivery.',
    tags: ['project', 'management', 'leadership']
  }
]

const normalize = (value) => String(value || '').toLowerCase().trim()

const tokenize = (value) =>
  normalize(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

const createMessage = (role, text, meta = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  ...meta
})

const findFAQAnswer = (query) => {
  const normalized = normalize(query)
  for (const item of FAQ_KNOWLEDGE) {
    if (item.keywords.some((keyword) => normalized.includes(normalize(keyword)))) {
      return item.answer
    }
  }
  return null
}

const isCourseRelatedQuery = (query) => {
  const normalized = normalize(query)
  return /recommend|suggest|programs?|course|degree|specialization|study|data science|business analytics|information systems|project management|finance|marketing|cyber security|machine learning|ai|artificial intelligence/.test(normalized)
}

const matchCourseIntent = (query) => {
  const normalized = normalize(query)
  for (const intent of COURSE_INTENT_MATCHERS) {
    for (const keyword of intent.keywords) {
      if (normalized.includes(keyword)) {
        return intent.label
      }
    }
  }
  return null
}

const rankPrograms = (query, programs = []) => {
  const queryTokens = tokenize(query)
  return programs
    .map((program) => {
      const content = normalize(`${program.title} ${program.description || ''} ${program.shortCode || ''}`)
      const score = queryTokens.reduce((sum, token) => (content.includes(token) ? sum + 1 : sum), 0)
      return { ...program, score }
    })
    .filter((program) => program.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

const getCourseSuggestions = (query, programs = []) => {
  const intent = matchCourseIntent(query)
  const recommendations = rankPrograms(query, programs)

  if (recommendations.length > 0) {
    return {
      message: `I found ${recommendations.length} relevant program${recommendations.length > 1 ? 's' : ''} based on your interest.`,
      list: recommendations.map((program) => ({
        title: program.title,
        description: program.description || 'Open the program page for more details.',
        shortCode: program.shortCode
      }))
    }
  }

  if (intent) {
    const fallback = FALLBACK_COURSES.filter((course) => course.tags.some((tag) => intent.toLowerCase().includes(tag)))
    const fallbackList = fallback.length > 0 ? fallback : FALLBACK_COURSES
    return {
      message: `Here are recommended program types for ${intent.toLowerCase()} interests:`,
      list: fallbackList.slice(0, 3).map((course) => ({
        title: course.title,
        description: course.description,
        shortCode: null
      }))
    }
  }

  return {
    message: 'I can recommend programs based on your interests or answer general site questions. Try asking about business analytics, data science, or application help.',
    list: FALLBACK_COURSES.slice(0, 3).map((course) => ({
      title: course.title,
      description: course.description,
      shortCode: null
    }))
  }
}

function FloatingAssistant() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    createMessage(
      'bot',
      'Hi there! I am your course advisor assistant. I can recommend programs based on your interests and answer questions about the site.'
    )
  ])
  const [programs, setPrograms] = useState(() => {
    const cached = sessionStorage.getItem(PROGRAMS_KEY)
    if (!cached) return []
    try {
      return JSON.parse(cached)
    } catch {
      return []
    }
  })
  const [isTyping, setIsTyping] = useState(false)
  const [quickSuggestions, setQuickSuggestions] = useState(QUICK_QUESTIONS)
  const [recommendationCards, setRecommendationCards] = useState([])
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  useEffect(() => {
    localStorage.removeItem('floating_assistant_history_v1')
  }, [])

  useEffect(() => {
    if (programs.length === 0) {
      const fetchPrograms = async () => {
        try {
          const response = await fetch('http://localhost:5000/api/programs')
          const data = await response.json()
          if (data?.success && Array.isArray(data.data)) {
            setPrograms(data.data)
            sessionStorage.setItem(PROGRAMS_KEY, JSON.stringify(data.data))
          }
        } catch {
          // keep fallback data only
        }
      }
      fetchPrograms()
    }
  }, [programs.length])

  const loadRecommendations = (query) => {
    const matches = getCourseSuggestions(query, programs)
    setRecommendationCards(matches.list)
    return matches
  }

  const addBotResponse = async (question) => {
    const trimmed = question.trim()
    if (!trimmed) {
      return
    }

    if (normalize(trimmed) === '/clear') {
      const cleared = createMessage('bot', 'Chat cleared. Ask me for course recommendations or site help.')
      setMessages([cleared])
      setRecommendationCards([])
      setInput('')
      return
    }

    setMessages((prev) => [...prev, createMessage('user', trimmed)])
    setInput('')
    setIsTyping(true)

    await new Promise((resolve) => setTimeout(resolve, 350 + Math.min(650, trimmed.length * 10)))

    const faqAnswer = findFAQAnswer(trimmed)
    const shouldShowCourses = isCourseRelatedQuery(trimmed)
    let courseResponse = null

    if (faqAnswer && shouldShowCourses) {
      courseResponse = loadRecommendations(trimmed)
    } else if (!faqAnswer) {
      courseResponse = loadRecommendations(trimmed)
    } else {
      setRecommendationCards([])
    }

    const botText = faqAnswer
      ? courseResponse
        ? `${faqAnswer}\n\n${courseResponse.message}`
        : faqAnswer
      : courseResponse.message

    setIsTyping(false)
    setMessages((prev) => [
      ...prev,
      createMessage('bot', botText, {
        topic: faqAnswer ? 'Site Help' : 'Course Recommendation'
      })
    ])
    setQuickSuggestions([
      'Recommend another course',
      'How do I apply?',
      'Is there a deadline?',
      'Tell me about admissions'
    ])
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await addBotResponse(input)
  }

  const handleRecommendationClick = (course) => {
    if (course.shortCode) {
      navigate(`/programs/${course.shortCode}`)
      setIsOpen(false)
    }
  }

  return (
    <div className="floating-assistant-wrapper" aria-live="polite">
      {isOpen && (
        <section className="floating-assistant-panel" aria-label="Course recommendation assistant">
          <header className="floating-assistant-header">
            <div>
              <h3>Course Advisor</h3>
              <p>Ask for program recommendations or site guidance.</p>
            </div>
            <button
              type="button"
              className="floating-assistant-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
            >
              ×
            </button>
          </header>

          <div className="assistant-content">
            <div className="floating-assistant-messages">
              {messages.map((message) => (
                <article key={message.id} className={`assistant-message ${message.role}`}>
                  <p>{message.text}</p>
                  <div className="assistant-message-meta">
                    <span>{message.timestamp}</span>
                    {message.topic && message.role === 'bot' && <span>{message.topic}</span>}
                  </div>
                </article>
              ))}

              {recommendationCards.length > 0 && (
                <div className="assistant-recommendations">
                  <h4>Top program suggestions</h4>
                  {recommendationCards.map((course) => (
                    <button
                      key={`${course.title}-${course.shortCode || course.description}`}
                      type="button"
                      className="recommendation-card"
                      onClick={() => handleRecommendationClick(course)}
                    >
                      <div>
                        <strong>{course.title}</strong>
                        <p>{course.description}</p>
                      </div>
                      {course.shortCode && <span>View</span>}
                    </button>
                  ))}
                </div>
              )}

              {isTyping && (
                <div className="assistant-message bot typing-indicator" aria-label="Assistant typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          <div className="assistant-quick-actions">
            {quickSuggestions.map((question) => (
              <button
                key={question}
                type="button"
                className="assistant-quick-btn"
                onClick={() => addBotResponse(question)}
              >
                {question}
              </button>
            ))}
          </div>

          <form className="assistant-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a course question"
              aria-label="Assistant question"
            />
            <button type="submit" disabled={isTyping || !input.trim()}>
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`floating-assistant-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Minimize assistant' : 'Open course advisor'}
      >
        <span className="assistant-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3C7.03 3 3 6.69 3 11.12c0 2.75 1.69 5.16 4.18 6.6L6 21l4.6-1.86c.86.2 1.78.31 2.73.31 4.97 0 9-3.69 9-8.12S16.97 3 12 3Z" fill="#ffffff" opacity="0.95" />
            <path d="M8.5 9.5H15.5" stroke="#8b1a1a" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M8.5 12.5H15.5" stroke="#8b1a1a" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M8.5 15.5H12.5" stroke="#8b1a1a" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="assistant-label">Advisor</span>
      </button>
    </div>
  )
}

export default FloatingAssistant
