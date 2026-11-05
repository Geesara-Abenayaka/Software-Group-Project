import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FileDown, GraduationCap, SendHorizontal, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import API_BASE_URL from '../utils/apiConfig'
import { getFallbackResponse, normalize, toRecommendation } from '../utils/assistantFallback'
import { QUIZ_QUESTIONS, scorePrograms } from '../utils/programQuiz'
import '../styles/FloatingAssistant.css'

const PROGRAMS_KEY = 'floating_assistant_programs_v1'
const HISTORY_KEY = 'floating_assistant_history_v2'

const FIND_PROGRAMME = 'Find my program'
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

// Reads Server-Sent Events from a fetch response and calls onEvent(name, data) for each one.
const readEvents = async (response, onEvent) => {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      return
    }

    buffer += decoder.decode(value, { stream: true })
    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const event = block.match(/^event: (.*)$/m)?.[1]
      const data = block.match(/^data: (.*)$/m)?.[1]
      if (event && data) {
        onEvent(event, JSON.parse(data))
      }
      boundary = buffer.indexOf('\n\n')
    }
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
  const [isStreaming, setIsStreaming] = useState(false)
  const [quickSuggestions, setQuickSuggestions] = useState(DEFAULT_FOLLOW_UPS)
  const [recommendationCards, setRecommendationCards] = useState([])
  const [quizStep, setQuizStep] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  // The reply being streamed is hidden from screen readers until it is complete, so it is read once.
  const [streamingMessageId, setStreamingMessageId] = useState(null)
  // Quiz answer just chosen: shown solid maroon for a moment before the next question
  const [pickedOption, setPickedOption] = useState(null)
  // "Thanks" next to the feedback buttons for 2 s
  const [thanksFor, setThanksFor] = useState(null)
  // Full screen and modal on phones; a non-modal panel elsewhere
  const [isPhone, setIsPhone] = useState(() => window.matchMedia('(max-width: 480px)').matches)
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const toggleRef = useRef(null)
  const panelRef = useRef(null)

  const currentProgramCode = getProgramCode(location.pathname)
  const currentProgram = programs.find((program) => program.shortCode === currentProgramCode)
  const quizQuestion = quizStep === null ? null : QUIZ_QUESTIONS[quizStep]
  const hasConversation = messages.some((message) => message.role === 'user')

  // During the quiz its options sit under the question instead; page-based suggestions until the first
  // question; then the reply's follow-ups.
  const suggestions = quizQuestion
    ? []
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
    const query = window.matchMedia('(max-width: 480px)')
    const update = () => setIsPhone(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  // Opening the panel puts the cursor in the question box
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!thanksFor) return undefined
    const timer = setTimeout(() => setThanksFor(null), 2000)
    return () => clearTimeout(timer)
  }, [thanksFor])

  // Closing hands focus back to the round button
  const closePanel = () => {
    setIsOpen(false)
    toggleRef.current?.focus()
  }

  // Esc closes; on phones the full-screen panel is modal, so Tab stays inside it.
  const handlePanelKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closePanel()
      return
    }
    if (event.key !== 'Tab' || !isPhone || !panelRef.current) return
    const focusable = [...panelRef.current.querySelectorAll('button:not([disabled]), input, a[href]')]
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

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

  // Ask the server's AI assistant, passing its text to onText as it streams in.
  // If it is unavailable, answer with the offline keyword engine.
  const askAssistant = async (history, onText) => {
    let streamed = ''

    try {
      const response = await fetch(`${API_BASE_URL}/assistant/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(({ role, text }) => ({ role, text })),
          context: { path: location.pathname, programShortCode: currentProgramCode }
        })
      })

      if (response.ok && response.body) {
        let result = null
        await readEvents(response, (event, data) => {
          if (event === 'delta') {
            streamed += data.text
            onText(streamed)
          } else if (event === 'done') {
            result = data
          }
        })
        if (result) {
          return { ...result, source: 'ai' }
        }
      }
    } catch {
      // fall through to the local engine
    }

    if (streamed) {
      return { reply: `${streamed.trim()}\n\nThe answer was cut off. Please ask again.`, recommendations: [], followUps: [], source: 'ai' }
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
    addMessages(createMessage('bot', 'Quiz cancelled. Ask me anything about the programs.'))
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
      addMessages(answer, createMessage('bot', 'Here are the programs that fit you best:', { source: 'quiz' }))
      setRecommendationCards(results.map(({ program, reason }) => ({ ...toRecommendation(program), reason })))
      return
    }

    const offered = programs.filter((program) => !program.isProposed)
    const reply = offered.length > 0
      ? 'No program matched all your answers. These are the programs we offer; ask me a question about any of them.'
      : 'I couldn\'t load the programs just now. Please try again in a moment.'
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

    if (normalize(trimmed) === normalize(FIND_PROGRAMME) || normalize(trimmed) === normalize('Find my programme')) {
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

    // The reply bubble appears with the first streamed text and grows as more arrives.
    let streamingId = null
    const answer = await askAssistant(history, (text) => {
      if (streamingId) {
        setMessages((prev) => prev.map((message) => (message.id === streamingId ? { ...message, text } : message)))
        return
      }
      const message = createMessage('bot', text)
      streamingId = message.id
      setIsStreaming(true)
      setStreamingMessageId(message.id)
      addMessages(message)
    })

    const details = {
      topic: answer.recommendations?.length ? 'Course Recommendation' : 'Site Help',
      source: answer.source
    }
    if (streamingId) {
      setMessages((prev) => prev.map((message) => (message.id === streamingId ? { ...message, text: answer.reply, ...details } : message)))
    } else {
      addMessages(createMessage('bot', answer.reply, details))
    }
    setIsTyping(false)
    setIsStreaming(false)
    setStreamingMessageId(null)
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

  // The chosen answer turns solid maroon for a moment, then the next question appears.
  const pickQuizOption = (option) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setPickedOption(option.value)
    setTimeout(() => {
      setPickedOption(null)
      answerQuiz(option)
    }, reduceMotion ? 0 : 250)
  }

  const giveFeedback = (messageId, helpful) => {
    handleFeedback(messageId, helpful)
    setThanksFor(messageId)
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
      // jsPDF is downloaded only when a PDF is asked for
      const { generateCourseDetailsPDF } = await import('../utils/pdfGenerator')
      generateCourseDetailsPDF(data.data)
    } catch {
      addMessages(createMessage('bot', 'Sorry, I couldn\'t load that program\'s details.'))
    }
  }

  const handleFeedback = (messageId, helpful) => {
    const index = messages.findIndex((message) => message.id === messageId)
    if (index < 0) {
      return
    }

    const message = messages[index]
    const question = message.source === 'quiz'
      ? FIND_PROGRAMME
      : messages.slice(0, index).reverse().find((item) => item.role === 'user')?.text || ''

    setMessages((prev) => prev.map((item) => (item.id === messageId ? { ...item, helpful } : item)))

    // Saved for admins to review in Settings; the chat works the same if this fails.
    fetch(`${API_BASE_URL}/assistant/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, question, reply: message.text, helpful, source: message.source, path: location.pathname })
    }).catch(() => {})
  }

  return (
    <div className={`floating-assistant-wrapper${isOpen ? ' is-open' : ''}`}>
      {isOpen && (
        <section
          id="course-advisor-panel"
          className="floating-assistant-panel"
          role="dialog"
          aria-label="Course Advisor"
          aria-modal={isPhone ? 'true' : undefined}
          ref={panelRef}
          onKeyDown={handlePanelKeyDown}
        >
          <header className="floating-assistant-header">
            <span className="assistant-avatar assistant-avatar--header" aria-hidden="true">
              <GraduationCap size={20} />
            </span>
            <div className="floating-assistant-heading">
              <h2>Course Advisor</h2>
              <p>CSE postgraduate admissions</p>
            </div>
            <button
              type="button"
              className="floating-assistant-close"
              onClick={closePanel}
              aria-label="Close assistant"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className="assistant-content">
            {/* The one live region: only new messages are read out, not the buttons around them */}
            <div className="floating-assistant-messages" role="log" aria-live="polite" aria-label="Conversation">
              {messages.map((message, index) => {
                const isBot = message.role === 'bot'
                const isQuizQuestion = isBot && message.kind === 'quiz'
                const isCurrentQuestion = isQuizQuestion && Boolean(quizQuestion) && index === messages.length - 1
                const showAvatar = isBot && messages[index - 1]?.role !== 'bot'

                return (
                  <div
                    key={message.id}
                    className={`assistant-row ${message.role}`}
                    aria-hidden={message.id === streamingMessageId ? 'true' : undefined}
                  >
                    {isBot && (
                      <span className={`assistant-avatar${showAvatar ? '' : ' is-spacer'}`} aria-hidden="true">
                        {showAvatar && <GraduationCap size={14} />}
                      </span>
                    )}
                    <div className="assistant-bubble-column">
                      {isQuizQuestion && message.topic && <p className="assistant-quiz-step">{message.topic}</p>}
                      <article className={`assistant-message ${message.role}`}>
                        {isBot ? <FormattedText text={message.text} /> : <p>{message.text}</p>}
                      </article>
                      <div className="assistant-message-meta">
                        <span>{message.timestamp}</span>
                        {message.source === 'fallback' && <span className="assistant-offline-tag">Offline mode</span>}
                        {message.source && (
                          <span className={`assistant-feedback${message.helpful === undefined ? '' : ' has-choice'}`}>
                            <button
                              type="button"
                              className={message.helpful === true ? 'is-selected' : ''}
                              aria-pressed={message.helpful === true}
                              aria-label="Helpful"
                              onClick={() => giveFeedback(message.id, true)}
                            >
                              <ThumbsUp size={15} fill={message.helpful === true ? 'currentColor' : 'none'} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={message.helpful === false ? 'is-selected' : ''}
                              aria-pressed={message.helpful === false}
                              aria-label="Not helpful"
                              onClick={() => giveFeedback(message.id, false)}
                            >
                              <ThumbsDown size={15} fill={message.helpful === false ? 'currentColor' : 'none'} aria-hidden="true" />
                            </button>
                            {thanksFor === message.id && <span className="assistant-thanks">Thanks</span>}
                          </span>
                        )}
                      </div>

                      {isCurrentQuestion && (
                        <>
                          <div className="assistant-quiz-options" role="group" aria-label={`Answers to question ${quizStep + 1}`}>
                            {quizQuestion.options.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                className={`assistant-quiz-option${pickedOption === option.value ? ' is-picked' : ''}`}
                                onClick={() => pickQuizOption(option)}
                                disabled={pickedOption !== null}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                          <button type="button" className="assistant-quiz-cancel" onClick={cancelQuiz}>
                            Cancel quiz
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              {recommendationCards.length > 0 && (
                <div className="assistant-recommendations">
                  <h3 className="assistant-recommendations__title">Top program suggestions</h3>
                  {recommendationCards.map((course) => (
                    <article key={`${course.title}-${course.shortCode || course.description}`} className="recommendation-card">
                      <h4 className="recommendation-card__title">
                        {course.title}
                        {course.isProposed && <span className="badge badge--proposed">Proposed</span>}
                      </h4>
                      {(course.level || course.duration) && (
                        <p className="recommendation-card__meta">{[course.level, course.duration].filter(Boolean).join(' · ')}</p>
                      )}
                      <p className="recommendation-card__description">{course.description}</p>
                      {course.reason && <p className="recommendation-card__reason">{course.reason}</p>}
                      {course.shortCode && (
                        <div className="recommendation-card__actions">
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => handleRecommendationClick(course)}
                            aria-label={`View ${course.title}`}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={() => handleApply(course)}
                            aria-label={`Apply for ${course.title}`}
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            className="recommendation-card__pdf"
                            onClick={() => handleDownloadDetails(course)}
                            aria-label={`Download course details for ${course.title}`}
                          >
                            <FileDown size={18} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {isTyping && !isStreaming && (
                <div className="assistant-row bot">
                  <span className="assistant-avatar" aria-hidden="true">
                    <GraduationCap size={14} />
                  </span>
                  <div className="assistant-message bot typing-indicator">
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                    <span className="sr-only">Course Advisor is typing</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          {suggestions.length > 0 && (
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
          )}

          <form className="assistant-input-row" onSubmit={handleSubmit}>
            <div className="assistant-input-line">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about programs, deadlines, documents…"
                aria-label="Your question"
                aria-describedby="assistant-privacy"
              />
              <button type="submit" className="assistant-send" disabled={isTyping || !input.trim()} aria-label="Send">
                <SendHorizontal size={18} aria-hidden="true" />
              </button>
            </div>
            <p id="assistant-privacy" className="assistant-privacy">
              Please don&apos;t share your NIC or phone number here.
            </p>
          </form>
        </section>
      )}

      <button
        ref={toggleRef}
        type="button"
        className={`floating-assistant-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => (isOpen ? closePanel() : setIsOpen(true))}
        aria-label={isOpen ? 'Close course advisor' : 'Open course advisor'}
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'course-advisor-panel' : undefined}
      >
        <span className="assistant-icon" aria-hidden="true">
          {isOpen ? (
            <X size={22} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3C7.03 3 3 6.69 3 11.12c0 2.75 1.69 5.16 4.18 6.6L6 21l4.6-1.86c.86.2 1.78.31 2.73.31 4.97 0 9-3.69 9-8.12S16.97 3 12 3Z" fill="#ffffff" opacity="0.95" />
              <path d="M8.5 9.5H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M8.5 12.5H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M8.5 15.5H12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <span className="assistant-label" aria-hidden="true">Advisor</span>
      </button>
    </div>
  )
}

export default FloatingAssistant
