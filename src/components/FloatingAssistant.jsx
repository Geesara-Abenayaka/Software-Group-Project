import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import API_BASE_URL from '../utils/apiConfig'
import { getFallbackResponse, normalize, toRecommendation } from '../utils/assistantFallback'
import { generateCourseDetailsPDF } from '../utils/pdfGenerator'
import { QUIZ_QUESTIONS, scorePrograms } from '../utils/programQuiz'
import '../styles/FloatingAssistant.css'

const PROGRAMS_KEY = 'floating_assistant_programs_v1'
const HISTORY_KEY = 'floating_assistant_history_v2'

const FIND_PROGRAMME = 'Find my programme'
const CANCEL_QUIZ = 'Cancel quiz'

const GENERAL_SUGGESTIONS = [FIND_PROGRAMME, 'What documents do I need?', 'How do I apply?', 'Compare MSc in CS and Master of CS']
const DEFAULT_FOLLOW_UPS = [FIND_PROGRAMME, 'How do I apply?', 'What documents do I need?']

const GREETING = 'Hi there! I am your course advisor assistant. I can recommend programs based on your interests and answer questions about the site.'

const createMessage = (role, text, meta = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  ...meta
})

// The chat is kept for the browser session. Storage can be blocked, so failures are ignored.
const loadHistory = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(HISTORY_KEY))
    if (Array.isArray(saved) && saved.length > 0) {
      return saved
    }
  } catch {
    // start a new chat
  }
  return [createMessage('bot', GREETING)]
}

const saveHistory = (messages) => {
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages))
  } catch {
    // the chat just won't survive a reload
  }
}

const loadCachedPrograms = () => {
  try {
    return JSON.parse(sessionStorage.getItem(PROGRAMS_KEY)) || []
  } catch {
    return []
  }
}

// "/programs/msc-cs" -> "msc-cs"
const getProgramCode = (pathname) => {
  const match = pathname.match(/^\/programs\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

const getPageSuggestions = (program) =>
  program ? [`Tell me about ${program.title}`, 'Am I eligible?', 'When is the deadline?'] : GENERAL_SUGGESTIONS

// Bot replies use **bold** and "- " lists. Rendered as elements, never as HTML.
const renderInline = (text) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  )

function FormattedText({ text }) {
  const lines = text.split('\n').filter((line) => line.trim() !== '')
  const blocks = []

  lines.forEach((line, i) => {
    if (line.trim().startsWith('- ')) {
      const item = <li key={i}>{renderInline(line.trim().slice(2))}</li>
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'ul') {
        last.items.push(item)
      } else {
        blocks.push({ type: 'ul', items: [item] })
      }
    } else {
      blocks.push({ type: 'p', content: <p key={i}>{renderInline(line)}</p> })
    }
  })

  return blocks.map((block, i) => (block.type === 'ul' ? <ul key={`ul-${i}`}>{block.items}</ul> : block.content))
}

function FloatingAssistant() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(loadHistory)
  const [programs, setPrograms] = useState(loadCachedPrograms)
  const [isTyping, setIsTyping] = useState(false)
  const [quickSuggestions, setQuickSuggestions] = useState(DEFAULT_FOLLOW_UPS)
  const [recommendationCards, setRecommendationCards] = useState([])
  const [quizStep, setQuizStep] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const endRef = useRef(null)

  const currentProgramCode = getProgramCode(location.pathname)
  const currentProgram = programs.find((program) => program.shortCode === currentProgramCode)
  const quizQuestion = quizStep === null ? null : QUIZ_QUESTIONS[quizStep]
  const hasConversation = messages.some((message) => message.role === 'user')

  // Quiz options while in the quiz; page-based suggestions until the first question; then the reply's follow-ups.
  const suggestions = quizQuestion
    ? [...quizQuestion.options.map((option) => option.label), CANCEL_QUIZ]
    : hasConversation
      ? quickSuggestions
      : getPageSuggestions(currentProgram)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  useEffect(() => {
    localStorage.removeItem('floating_assistant_history_v1')
  }, [])

  useEffect(() => {
    saveHistory(messages)
  }, [messages])

  useEffect(() => {
    // Use cached programs straight away, but refresh them so new programs appear.
    const fetchPrograms = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/programs`)
        const data = await response.json()
        if (data?.success && Array.isArray(data.data)) {
          setPrograms(data.data)
          sessionStorage.setItem(PROGRAMS_KEY, JSON.stringify(data.data))
        }
      } catch {
        // keep the cached programs
      }
    }
    fetchPrograms()
  }, [])

  const addMessages = (...newMessages) => {
    setMessages((prev) => [...prev, ...newMessages])
  }

  // Ask the server's AI assistant; if it is unavailable, answer with the offline keyword engine.
  const askAssistant = async (history) => {
    try {
      const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(({ role, text }) => ({ role, text })),
          context: { path: location.pathname, programShortCode: currentProgramCode }
        })
      })
      const data = await response.json()
      if (data.success) {
        return { ...data, source: 'ai' }
      }
    } catch {
      // fall through to the local engine
    }

    return { ...getFallbackResponse(history[history.length - 1].text, programs), source: 'fallback' }
  }

  const askQuizQuestion = (step) =>
    createMessage('bot', QUIZ_QUESTIONS[step].text, {
      kind: 'quiz',
      topic: `Question ${step + 1} of ${QUIZ_QUESTIONS.length}`
    })

  const startQuiz = () => {
    setInput('')
    setRecommendationCards([])
    setQuizAnswers({})
    setQuizStep(0)
    addMessages(createMessage('user', FIND_PROGRAMME, { kind: 'quiz' }), askQuizQuestion(0))
  }

  const cancelQuiz = () => {
    setQuizStep(null)
    setQuizAnswers({})
    addMessages(createMessage('bot', 'Quiz cancelled. Ask me anything about the programmes.'))
  }

  const answerQuiz = (option) => {
    const answers = { ...quizAnswers, [quizQuestion.id]: option.value }
    const nextStep = quizStep + 1
    const answer = createMessage('user', option.label, { kind: 'quiz' })

    if (nextStep < QUIZ_QUESTIONS.length) {
      setQuizAnswers(answers)
      setQuizStep(nextStep)
      addMessages(answer, askQuizQuestion(nextStep))
      return
    }

    setQuizStep(null)
    setQuizAnswers({})
    setQuickSuggestions(DEFAULT_FOLLOW_UPS)

    const results = scorePrograms(answers, programs)
    if (results.length > 0) {
      addMessages(answer, createMessage('bot', 'Here are the programmes that fit you best:', { source: 'quiz' }))
      setRecommendationCards(results.map(({ program, reason }) => ({ ...toRecommendation(program), reason })))
      return
    }

    const offered = programs.filter((program) => !program.isProposed)
    const reply = offered.length > 0
      ? 'No programme matched all your answers. These are the programmes we offer; ask me a question about any of them.'
      : 'I couldn\'t load the programmes just now. Please try again in a moment.'
    addMessages(answer, createMessage('bot', reply, { source: 'quiz' }))
    setRecommendationCards(offered.map(toRecommendation))
  }

  const sendQuestion = async (question) => {
    const trimmed = question.trim()
    if (!trimmed || isTyping) {
      return
    }

    if (normalize(trimmed) === '/clear') {
      setMessages([createMessage('bot', 'Chat cleared. Ask me for course recommendations or site help.')])
      setRecommendationCards([])
      setQuizStep(null)
      setQuizAnswers({})
      setInput('')
      return
    }

    if (normalize(trimmed) === normalize(FIND_PROGRAMME)) {
      startQuiz()
      return
    }

    // Typing a question during the quiz ends the quiz.
    setQuizStep(null)
    setQuizAnswers({})

    const history = [...messages, createMessage('user', trimmed)]
    setMessages(history)
    setInput('')
    setIsTyping(true)

    const answer = await askAssistant(history)

    setIsTyping(false)
    addMessages(createMessage('bot', answer.reply, {
      topic: answer.recommendations?.length ? 'Course Recommendation' : 'Site Help',
      source: answer.source
    }))
    setRecommendationCards(answer.recommendations || [])
    setQuickSuggestions(answer.followUps?.length ? answer.followUps : DEFAULT_FOLLOW_UPS)
  }

  const handleSuggestion = (label) => {
    if (quizQuestion) {
      if (label === CANCEL_QUIZ) {
        cancelQuiz()
        return
      }
      const option = quizQuestion.options.find((item) => item.label === label)
      if (option) {
        answerQuiz(option)
        return
      }
    }
    sendQuestion(label)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await sendQuestion(input)
  }

  const handleRecommendationClick = (course) => {
    if (course.shortCode) {
      navigate(`/programs/${course.shortCode}`)
      setIsOpen(false)
    }
  }

  const handleApply = (course) => {
    // The form sends people home when state.program is missing, so always pass it.
    navigate('/apply', { state: { program: course.shortCode, programName: course.title } })
    setIsOpen(false)
  }

  const handleDownloadDetails = async (course) => {
    // The programs list leaves out deadlines and the detailed description, so load the full program.
    try {
      const response = await fetch(`${API_BASE_URL}/programs/${course.shortCode}`)
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.message)
      }
      generateCourseDetailsPDF(data.data)
    } catch {
      addMessages(createMessage('bot', 'Sorry, I couldn\'t load that programme\'s details.'))
    }
  }

  const handleFeedback = (messageId, helpful) => {
    setMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, helpful } : message)))
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
                  {message.role === 'bot' ? <FormattedText text={message.text} /> : <p>{message.text}</p>}
                  <div className="assistant-message-meta">
                    <span>{message.timestamp}</span>
                    {message.topic && message.role === 'bot' && <span>{message.topic}</span>}
                    {message.source && (
                      <span className="assistant-feedback">
                        <button
                          type="button"
                          aria-pressed={message.helpful === true}
                          onClick={() => handleFeedback(message.id, true)}
                        >
                          Helpful
                        </button>
                        <button
                          type="button"
                          aria-pressed={message.helpful === false}
                          onClick={() => handleFeedback(message.id, false)}
                        >
                          Not helpful
                        </button>
                      </span>
                    )}
                  </div>
                </article>
              ))}

              {recommendationCards.length > 0 && (
                <div className="assistant-recommendations">
                  <h4>Top program suggestions</h4>
                  {recommendationCards.map((course) => (
                    <div key={`${course.title}-${course.shortCode || course.description}`} className="recommendation-item">
                      <button
                        type="button"
                        className="recommendation-card"
                        onClick={() => handleRecommendationClick(course)}
                      >
                        <div>
                          <strong>{course.title}</strong>
                          <p>{course.description}</p>
                          {course.reason && <p className="recommendation-reason">{course.reason}</p>}
                        </div>
                        {course.shortCode && <span>View</span>}
                      </button>
                      {course.shortCode && (
                        <div className="recommendation-actions">
                          <button type="button" className="assistant-quick-btn" onClick={() => handleApply(course)}>
                            Apply
                          </button>
                          <button type="button" className="assistant-quick-btn" onClick={() => handleDownloadDetails(course)}>
                            Course details PDF
                          </button>
                        </div>
                      )}
                    </div>
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
            {suggestions.map((question) => (
              <button
                key={question}
                type="button"
                className="assistant-quick-btn"
                onClick={() => handleSuggestion(question)}
                disabled={isTyping}
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
