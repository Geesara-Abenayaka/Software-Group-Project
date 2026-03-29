import { useMemo, useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/AdmissionChatbot.css';

const CHAT_KNOWLEDGE = [
  {
    intent: 'application fee',
    topic: 'Payments',
    keywords: ['fee', 'payment', 'processing fee', 'amount', 'rs', '2000'],
    answer: 'The application processing fee is Rs. 2,000. Upload the payment confirmation in the required documents section before final submit.',
    followUps: ['What is the account number?', 'What if payment verification fails?']
  },
  {
    intent: 'account number',
    topic: 'Payments',
    keywords: ['account', 'account number', 'bank', 'deposit', '0043618'],
    answer: 'Use account number 0043618 for the application fee payment as shown in the form instructions.',
    followUps: ['How much is the application fee?', 'What documents are required?']
  },
  {
    intent: 'required documents',
    topic: 'Documents',
    keywords: ['documents', 'required files', 'upload', 'what to upload', 'attachments'],
    answer: 'Required uploads: NIC, degree certificate, membership proofs, employer letter, transcript, and payment confirmation.',
    followUps: ['Why did verification fail?', 'Can I apply twice with same NIC?']
  },
  {
    intent: 'duplicate nic',
    topic: 'Policy',
    keywords: ['same nic', 'duplicate', 'apply twice', 'submit again', 'already submitted'],
    answer: 'A NIC can submit only one application per program. If already submitted for the same program, another submission is blocked.',
    followUps: ['How can I fix wrong details after submit?', 'What documents are required?']
  },
  {
    intent: 'captcha',
    topic: 'Form Issues',
    keywords: ['captcha', 'captcha incorrect', 'code', 'security text'],
    answer: 'Enter captcha exactly as shown, including letter case. If needed, use Refresh Captcha and try again.',
    followUps: ['Why did verification fail?', 'How do I submit successfully?']
  },
  {
    intent: 'verification failed',
    topic: 'Form Issues',
    keywords: ['verification', 'name mismatch', 'degree mismatch', 'membership mismatch', 'work experience'],
    answer: 'Verification compares form entries with uploaded files. Make sure names, dates, and organization details exactly match the document text.',
    followUps: ['What documents are required?', 'How do I submit successfully?']
  },
  {
    intent: 'application status',
    topic: 'After Submission',
    keywords: ['status', 'track', 'check application', 'pending', 'approved', 'rejected'],
    answer: 'After submission, your application enters admin review. For status updates, contact the department office.',
    followUps: ['Can I apply twice with same NIC?', 'How do I submit successfully?']
  },
  {
    intent: 'submission checklist',
    topic: 'Checklist',
    keywords: ['checklist', 'submit successfully', 'before submit', 'final submit'],
    answer: 'Submission checklist: complete all required personal fields, upload every required document, pass verification checks, complete declaration, and solve captcha correctly.',
    followUps: ['What documents are required?', 'Why did verification fail?']
  }
];

const DEFAULT_QUICK_QUESTIONS = [
  'What documents are required?',
  'Can I apply twice with same NIC?',
  'How much is the application fee?',
  'Why did verification fail?'
];

const SYSTEM_QUICK_QUESTIONS = [
  '/help',
  '/topics',
  '/clear'
];

const HISTORY_KEY = 'admission_chatbot_history_v2';

const normalize = (value) => String(value || '').toLowerCase().trim();

const tokenize = (value) => normalize(value)
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter(Boolean);

const getTimestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const createMessage = (role, text, meta = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  timestamp: getTimestamp(),
  ...meta
});

const getProgramCodeFromPath = (pathname) => {
  const segments = String(pathname || '').split('/').filter(Boolean);
  const programIndex = segments.findIndex((seg) => seg === 'programs');
  if (programIndex === -1) {
    return '';
  }
  return segments[programIndex + 1] || '';
};

const scoreIntent = (query, intentEntry, contextIntent) => {
  const queryNormalized = normalize(query);
  const queryTokens = tokenize(query);
  let score = 0;

  for (const keyword of intentEntry.keywords) {
    const keyNorm = normalize(keyword);
    if (!keyNorm) {
      continue;
    }

    if (queryNormalized.includes(keyNorm)) {
      score += 3;
    }

    const keywordTokens = tokenize(keyNorm);
    const overlap = keywordTokens.filter((token) => queryTokens.includes(token)).length;
    if (keywordTokens.length > 0) {
      score += (overlap / keywordTokens.length) * 1.8;
    }
  }

  if (contextIntent && intentEntry.intent === contextIntent) {
    score += 0.8;
  }

  return score;
};

const detectBestAnswer = ({ message, contextIntent, pathname }) => {
  const query = normalize(message);
  if (!query) {
    return {
      answer: 'Please type your question and I will help you with the application process.',
      confidence: 0,
      intent: null,
      suggestions: DEFAULT_QUICK_QUESTIONS
    };
  }

  const scored = CHAT_KNOWLEDGE.map((item) => {
    const score = scoreIntent(query, item, contextIntent);
    return { ...item, score };
  });

  const ranked = scored.sort((a, b) => b.score - a.score);
  const best = ranked[0];

  if (!best || best.score < 1.1) {
    const topSuggestions = ranked.slice(0, 3).map((entry) => {
      return `Ask about ${entry.intent}`;
    });
    return {
      answer: 'I am not fully confident about that yet. Try a more specific question about documents, verification, fee, or submission policy.',
      confidence: 0.2,
      intent: null,
      suggestions: [...topSuggestions, ...DEFAULT_QUICK_QUESTIONS].slice(0, 4)
    };
  }

  const programCode = getProgramCodeFromPath(pathname);
  const routeContext = programCode
    ? `\n\nContext: You are currently viewing program ${programCode.toUpperCase()}.`
    : '';

  const confidence = Math.min(0.99, best.score / 7);

  return {
    answer: `${best.answer}${routeContext}`,
    confidence,
    intent: best.intent,
    suggestions: best.followUps || DEFAULT_QUICK_QUESTIONS,
    topic: best.topic
  };
};

const getCommandResponse = (command) => {
  const normalized = normalize(command);

  if (normalized === '/help') {
    return 'Commands: /help, /topics, /clear. You can also ask normal questions like "why verification failed" or "required documents".';
  }

  if (normalized === '/topics') {
    const topics = [...new Set(CHAT_KNOWLEDGE.map((item) => item.topic))].join(', ');
    return `Available topics: ${topics}.`;
  }

  return null;
};

function AdmissionChatbot() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => {
    const persisted = localStorage.getItem(HISTORY_KEY);
    if (persisted) {
      try {
        const parsed = JSON.parse(persisted);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (error) {
        console.error('Failed to parse chatbot history:', error);
      }
    }

    return [
      createMessage('bot', 'Hi! I am your LMS assistant. I can help with admissions, fees, required documents, and submission troubleshooting.', {
        topic: 'Welcome',
        confidence: 1
      })
    ];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [lastIntent, setLastIntent] = useState('');
  const [quickSuggestions, setQuickSuggestions] = useState(DEFAULT_QUICK_QUESTIONS);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)));
  }, [messages]);

  const quickQuestions = useMemo(() => {
    return [...quickSuggestions, ...SYSTEM_QUICK_QUESTIONS].slice(0, 6);
  }, [quickSuggestions]);

  const handleClearHistory = () => {
    const welcome = createMessage('bot', 'Chat history cleared. Ask a question to continue.', {
      topic: 'System',
      confidence: 1
    });
    setMessages([welcome]);
    setLastIntent('');
    setQuickSuggestions(DEFAULT_QUICK_QUESTIONS);
    localStorage.removeItem(HISTORY_KEY);
  };

  const addUserAndBotMessages = async (question) => {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }

    if (normalize(trimmed) === '/clear') {
      handleClearHistory();
      setInput('');
      return;
    }

    const commandReply = getCommandResponse(trimmed);
    if (commandReply) {
      setMessages((prev) => [
        ...prev,
        createMessage('user', trimmed),
        createMessage('bot', commandReply, { topic: 'System', confidence: 1 })
      ]);
      setInput('');
      return;
    }

    setMessages((prev) => [...prev, createMessage('user', trimmed)]);
    setInput('');
    setIsTyping(true);

    const thinkingMs = Math.min(900, 220 + trimmed.length * 8);
    await new Promise((resolve) => setTimeout(resolve, thinkingMs));

    const result = detectBestAnswer({
      message: trimmed,
      contextIntent: lastIntent,
      pathname: location.pathname
    });

    const confidenceLabel = result.confidence >= 0.7
      ? 'high confidence'
      : result.confidence >= 0.45
        ? 'medium confidence'
        : 'low confidence';

    const botText = `${result.answer}\n\nAssistant confidence: ${confidenceLabel}.`;

    setIsTyping(false);
    setMessages((prev) => [
      ...prev,
      createMessage('bot', botText, {
        confidence: Number(result.confidence?.toFixed(2) || 0),
        topic: result.topic || 'General'
      })
    ]);

    setLastIntent(result.intent || '');
    setQuickSuggestions(result.suggestions || DEFAULT_QUICK_QUESTIONS);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addUserAndBotMessages(input);
  };

  return (
    <div className="admission-chatbot-wrapper" aria-live="polite">
      {isOpen && (
        <section className="admission-chatbot-panel" aria-label="Admissions chatbot">
          <header className="admission-chatbot-header">
            <div>
              <h3>Admissions Assistant</h3>
              <p>Context-aware support for applications and submission issues</p>
            </div>
            <div className="admission-chatbot-header-actions">
              <button
                type="button"
                className="admission-chatbot-clear"
                onClick={handleClearHistory}
                aria-label="Clear chat history"
              >
                Clear
              </button>
              <button
                type="button"
                className="admission-chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot"
              >
                x
              </button>
            </div>
          </header>

          <div className="admission-chatbot-messages">
            {messages.map((message) => {
              return (
                <article key={message.id} className={`chat-message ${message.role}`}>
                  <p>{message.text}</p>
                  <div className="chat-message-meta">
                    <span>{message.timestamp}</span>
                    {message.topic && message.role === 'bot' && <span>{message.topic}</span>}
                  </div>
                </article>
              );
            })}

            {isTyping && (
              <div className="chat-message bot typing-bubble" aria-label="Assistant typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}

            <div ref={endRef} />
          </div>

          <div className="admission-chatbot-quick-questions">
            {quickQuestions.map((question) => (
              <button
                key={question}
                type="button"
                className="chat-quick-question"
                onClick={() => {
                  addUserAndBotMessages(question);
                }}
              >
                {question}
              </button>
            ))}
          </div>

          <form className="admission-chatbot-input-row" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question"
              aria-label="Chat message"
            />
            <button type="submit" disabled={isTyping}>Send</button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="admission-chatbot-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Minimize chatbot' : 'Open chatbot'}
      >
        {isOpen ? 'Hide Chat' : 'Need Help? Chat'}
      </button>
    </div>
  );
}

export default AdmissionChatbot;
