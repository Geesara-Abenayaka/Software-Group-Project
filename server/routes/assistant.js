import process from 'node:process';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Program from '../models/Program.js';
import { ASSISTANT_FACTS } from '../utils/assistantKnowledge.js';

const router = express.Router();

const MAX_MESSAGES = 10;
const MAX_CHARS = 500;
const CACHE_MS = 5 * 60 * 1000;
const AI_TIMEOUT_MS = 15 * 1000;

router.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, fallback: true, message: 'Too many questions in a short time. Please wait a minute.' }
}));

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

const buildSystemPrompt = (programs, context) => {
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

Return JSON only, in this shape:
{"reply": string, "recommendedShortCodes": string[] (0-3 items, only codes from PROGRAMMES), "followUps": string[] (2-3 short follow-up questions the user might ask next)}

FACTS:
${ASSISTANT_FACTS}

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

router.post('/chat', async (req, res) => {
  const { messages, context = {} } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, message: 'messages is required' });
  }

  const contents = toGeminiContents(messages);
  if (contents.length === 0 || contents[contents.length - 1].role !== 'user') {
    return res.status(400).json({ success: false, message: 'The last message must be from the user' });
  }

  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_CHAT_MODEL) {
    return res.status(503).json({ success: false, fallback: true, message: 'Assistant AI is not configured' });
  }

  try {
    const programs = await getPrograms();
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = client.getGenerativeModel(
      {
        model: process.env.GEMINI_CHAT_MODEL,
        systemInstruction: buildSystemPrompt(programs, context),
        // Room for models that think before answering; the prompt keeps replies short.
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 2048 }
      },
      { timeout: AI_TIMEOUT_MS }
    );

    const result = await model.generateContent({ contents });
    const parsed = JSON.parse(result.response.text());

    if (typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
      throw new Error('Empty reply from model');
    }

    // The model can still make up a code; keep only programmes that exist.
    const byCode = new Map(programs.map((program) => [program.shortCode, program]));
    const recommendations = (Array.isArray(parsed.recommendedShortCodes) ? parsed.recommendedShortCodes : [])
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

    const followUps = (Array.isArray(parsed.followUps) ? parsed.followUps : [])
      .filter((followUp) => typeof followUp === 'string' && followUp.trim())
      .map((followUp) => followUp.trim().slice(0, 80))
      .slice(0, 3);

    return res.json({ success: true, reply: parsed.reply.trim(), recommendations, followUps });
  } catch (error) {
    console.error('Assistant chat failed:', error.message);
    return res.status(503).json({ success: false, fallback: true, message: 'Assistant is temporarily unavailable' });
  }
});

export default router;
