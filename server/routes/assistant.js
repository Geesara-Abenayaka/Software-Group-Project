import process from 'node:process';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import AssistantFeedback from '../models/AssistantFeedback.js';
import Program from '../models/Program.js';
import { getAssistantFacts } from '../utils/assistantKnowledge.js';

const router = express.Router();

const MAX_MESSAGES = 10;
const MAX_CHARS = 500;
const CACHE_MS = 5 * 60 * 1000;
const AI_TIMEOUT_MS = 15 * 1000;
const STREAM_TIMEOUT_MS = 30 * 1000;

// In streamed replies the model writes the answer first, then this marker and the JSON details.
const META_MARKER = '@@META@@';

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, fallback: true, message: 'Too many questions in a short time. Please wait a minute.' }
});

const feedbackLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many feedback requests. Please wait a minute.' }
});

// Programmes change rarely, so keep them for a few minutes instead of querying on every message.
let cache = { at: 0, programs: [] };

const getPrograms = async () => {
  if (Date.now() - cache.at < CACHE_MS) {
    return cache.programs;
  }

  const programs = await Program.find()
    .select('-_id title shortCode level description detailedDescription specializations deadline deadlines duration mode slqfLevel fee eligibility isProposed')
    .lean();

  cache = { at: Date.now(), programs };
  return programs;
};

// Smaller prompt: specialisations as plain names.
const toPromptProgram = ({ specializations, ...program }) => ({
  ...program,
  specializations: (specializations || []).map((spec) => spec.name)
});

const DETAILS_SHAPE = '"recommendedShortCodes": string[] (0-3 items, only codes from PROGRAMMES), "followUps": string[] (2-3 short follow-up questions the user might ask next), "answered": boolean (false if you had to say you don\'t know)';

const RESPONSE_FORMATS = {
  json: `Return JSON only, in this shape:\n{"reply": string, ${DETAILS_SHAPE}}`,
  stream: `First write your reply to the user as plain text. Then add one last line: ${META_MARKER} followed by JSON in this shape:\n{${DETAILS_SHAPE}}`
};

const buildSystemPrompt = (programs, facts, context, format) => {
  const path = String(context.path || '/').slice(0, 100);
  const programCode = context.programShortCode ? String(context.programShortCode).slice(0, 40) : '';

  return `
You are the Course Advisor for postgraduate admissions at the Department of Computer Science & Engineering, University of Moratuwa.

Rules:
- Answer only questions about these programmes, applying, documents, fees, deadlines and using this website.
- Use only the PROGRAMMES and FACTS below. If something is not there, say you don't know and suggest emailing postgrad@cse.mrt.ac.lk.
- Never invent dates, fees, specialisations or programmes.
- Programmes with "isProposed": true are demo programmes. If you mention one, say it is proposed and not currently offered.
- Reply in the same language as the user's last message (English, Sinhala or Tamil).
- Keep replies under 120 words. Use short paragraphs or "- " bullet lists. Use **bold** for programme names.
- Do not ask for or repeat personal details such as NIC numbers or phone numbers.
- Politely refuse anything unrelated (homework, coding help, general chat).

Today's date: ${new Date().toISOString().slice(0, 10)}
The user is currently on: ${path}${programCode ? ` (programme: ${programCode})` : ''}

${RESPONSE_FORMATS[format]}

FACTS:
${facts}

PROGRAMMES:
${JSON.stringify(programs.map(toPromptProgram))}
`.trim();
};

const toGeminiContents = (messages) => {
  const contents = [];

  for (const message of messages.slice(-MAX_MESSAGES)) {
    const text = String(message?.text || '').trim().slice(0, MAX_CHARS);
    if (!text) {
      continue;
    }

    const role = message.role === 'user' ? 'user' : 'model';
    const last = contents[contents.length - 1];

    // Gemini expects user and model turns to alternate, so join back-to-back messages.
    if (last && last.role === role) {
      last.parts.push({ text });
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  // Gemini expects the conversation to start with a user turn; drop the bot's greeting.
  while (contents.length && contents[0].role !== 'user') {
    contents.shift();
  }

  return contents;
};

// Checks the request; sends the error response and returns null when it can't be answered by the AI.
const readChatRequest = (req, res) => {
  const { messages, context = {} } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ success: false, message: 'messages is required' });
    return null;
  }

  const contents = toGeminiContents(messages);
  if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
    res.status(400).json({ success: false, message: 'The last message must be from the user' });
    return null;
  }

  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_CHAT_MODEL) {
    res.status(503).json({ success: false, fallback: true, message: 'Assistant AI is not configured' });
    return null;
  }

  const question = contents[contents.length - 1].parts.map((part) => part.text).join('\n');
  return { contents, context, question };
};

const getModel = async (context, format) => {
  const [programs, facts] = await Promise.all([getPrograms(), getAssistantFacts()]);
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const generationConfig = { temperature: 0.3, maxOutputTokens: 2048 };
  if (format === 'json') {
    generationConfig.responseMimeType = 'application/json';
  }

  // maxOutputTokens leaves room for models that think before answering; the prompt keeps replies short.
  const model = client.getGenerativeModel(
    { model: process.env.GEMINI_CHAT_MODEL, systemInstruction: buildSystemPrompt(programs, facts, context, format), generationConfig },
    { timeout: format === 'stream' ? STREAM_TIMEOUT_MS : AI_TIMEOUT_MS }
  );

  return { model, programs };
};

// The model can still make up a code; keep only programmes that exist.
const toRecommendations = (codes, programs) => {
  const byCode = new Map(programs.map((program) => [program.shortCode, program]));
  return (Array.isArray(codes) ? codes : [])
    .filter((code) => byCode.has(code))
    .slice(0, 3)
    .map((code) => {
      const program = byCode.get(code);
      return {
        title: program.title,
        shortCode: program.shortCode,
        description: program.description,
        level: program.level,
        duration: program.duration,
        isProposed: Boolean(program.isProposed)
      };
    });
};

const toFollowUps = (followUps) =>
  (Array.isArray(followUps) ? followUps : [])
    .filter((followUp) => typeof followUp === 'string' && followUp.trim())
    .map((followUp) => followUp.trim().slice(0, 80))
    .slice(0, 3);

// Questions the AI couldn't answer from the data are kept for admins to review.
const logUnanswered = (question, reply, context) => {
  AssistantFeedback.create({
    question: question.slice(0, MAX_CHARS),
    reply: reply.slice(0, 2000),
    unanswered: true,
    source: 'ai',
    path: String(context.path || '').slice(0, 100)
  }).catch((error) => console.error('Could not log unanswered question:', error.message));
};

// Splits a streamed reply into the text for the user and the JSON details after the marker.
const splitStreamedReply = (text) => {
  const markerAt = text.indexOf(META_MARKER);
  if (markerAt < 0) {
    return { reply: text.trim(), details: {} };
  }

  const rest = text.slice(markerAt + META_MARKER.length);
  const start = rest.indexOf('{');
  const end = rest.lastIndexOf('}');
  let details = {};
  if (start >= 0 && end > start) {
    try {
      details = JSON.parse(rest.slice(start, end + 1));
    } catch {
      // keep the reply without cards or follow-ups
    }
  }

  return { reply: text.slice(0, markerAt).trim(), details };
};

// Whole reply as JSON
router.post('/chat', chatLimiter, async (req, res) => {
  const request = readChatRequest(req, res);
  if (!request) return;

  try {
    const { model, programs } = await getModel(request.context, 'json');
    const result = await model.generateContent({ contents: request.contents });
    const parsed = JSON.parse(result.response.text());

    if (typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
      throw new Error('Empty reply from model');
    }

    const reply = parsed.reply.trim();
    if (parsed.answered === false) {
      logUnanswered(request.question, reply, request.context);
    }

    return res.json({
      success: true,
      reply,
      recommendations: toRecommendations(parsed.recommendedShortCodes, programs),
      followUps: toFollowUps(parsed.followUps)
    });
  } catch (error) {
    console.error('Assistant chat failed:', error.message);
    return res.status(503).json({ success: false, fallback: true, message: 'Assistant is temporarily unavailable' });
  }
});

// Reply streamed as Server-Sent Events: "delta" events with text as it arrives,
// then "done" with the full reply, cards and follow-ups, or "error".
router.post('/chat/stream', chatLimiter, async (req, res) => {
  const request = readChatRequest(req, res);
  if (!request) return;

  let programs;
  let result;
  try {
    const prepared = await getModel(request.context, 'stream');
    programs = prepared.programs;
    result = await prepared.model.generateContentStream({ contents: request.contents });
  } catch (error) {
    // Nothing sent yet, so the browser can still use its offline answers.
    console.error('Assistant stream failed to start:', error.message);
    return res.status(503).json({ success: false, fallback: true, message: 'Assistant is temporarily unavailable' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no' // stop nginx holding the stream back
  });

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  let clientGone = false;
  res.on('close', () => {
    clientGone = true;
  });

  let text = '';
  let sentUpTo = 0;

  try {
    for await (const chunk of result.stream) {
      if (clientGone) break;
      text += chunk.text();

      // Send only text before the marker; hold back a tail that could be the start of it.
      const markerAt = text.indexOf(META_MARKER);
      const safeEnd = markerAt >= 0 ? markerAt : Math.max(sentUpTo, text.length - META_MARKER.length);
      if (safeEnd > sentUpTo) {
        send('delta', { text: text.slice(sentUpTo, safeEnd) });
        sentUpTo = safeEnd;
      }
    }

    if (clientGone) {
      return res.end();
    }

    const { reply, details } = splitStreamedReply(text);
    if (!reply) {
      throw new Error('Empty reply from model');
    }

    if (details.answered === false) {
      logUnanswered(request.question, reply, request.context);
    }

    send('done', {
      reply,
      recommendations: toRecommendations(details.recommendedShortCodes, programs),
      followUps: toFollowUps(details.followUps)
    });
  } catch (error) {
    console.error('Assistant stream failed:', error.message);
    send('error', { fallback: true });
  }

  return res.end();
});

// Save a helpful / not helpful vote; voting again on the same reply updates it.
router.post('/feedback', feedbackLimiter, async (req, res) => {
  const { messageId, question, reply, helpful, source, path } = req.body || {};

  if (typeof messageId !== 'string' || !messageId.trim() || typeof helpful !== 'boolean' || typeof reply !== 'string' || !reply.trim()) {
    return res.status(400).json({ success: false, message: 'messageId, reply and helpful are required' });
  }

  try {
    await AssistantFeedback.findOneAndUpdate(
      { messageId: messageId.trim().slice(0, 64) },
      {
        $set: {
          question: String(question || '').slice(0, MAX_CHARS),
          reply: reply.slice(0, 2000),
          helpful,
          source: ['ai', 'fallback', 'quiz'].includes(source) ? source : 'ai',
          path: String(path || '').slice(0, 100)
        }
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Error saving assistant feedback:', error);
    return res.status(500).json({ success: false, message: 'Failed to save feedback' });
  }
});

// Latest 100 for admins: ?type=helpful | not-helpful | unanswered
router.get('/feedback', async (req, res) => {
  const filters = {
    helpful: { helpful: true },
    'not-helpful': { helpful: false },
    unanswered: { unanswered: true }
  };

  try {
    const items = await AssistantFeedback.find(filters[req.query.type] || {})
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();
    return res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching assistant feedback:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
  }
});

export default router;
