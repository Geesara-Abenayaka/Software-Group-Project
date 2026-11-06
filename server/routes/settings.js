import express from 'express';
import Setting from '../models/Setting.js';
import { ASSISTANT_FACTS, ASSISTANT_FACTS_KEY, clearAssistantFactsCache } from '../utils/assistantKnowledge.js';
import { APPLICATION_DEADLINE_KEY, APPLICATION_PERIOD_KEY, isDateString } from '../utils/applicationWindow.js';
import { requireAdmin } from '../utils/adminAuth.js';

const router = express.Router();

const MAX_FACTS_CHARS = 5000;

// Only these keys can be read or changed. Add new settings here.
const SETTINGS = {
  [ASSISTANT_FACTS_KEY]: {
    defaultValue: ASSISTANT_FACTS,
    toStored: (value) => (typeof value === 'string' ? value.trim() : ''),
    isValid: (value) => value.length > 0 && value.length <= MAX_FACTS_CHARS,
    invalidMessage: `The facts must be between 1 and ${MAX_FACTS_CHARS} characters.`,
    onChange: clearAssistantFactsCache
  },
  [APPLICATION_PERIOD_KEY]: {
    defaultValue: null, // no period: applications are open all year
    toStored: (value) => (
      isDateString(value?.start) && isDateString(value?.end) ? { start: value.start, end: value.end } : null
    ),
    isValid: (value) => value !== null && value.start <= value.end,
    invalidMessage: 'Choose a start date and an end date. The start must be on or before the end.'
  },
  [APPLICATION_DEADLINE_KEY]: {
    defaultValue: null, // no default: only programs with their own deadline close
    toStored: (value) => (isDateString(value) ? value : null),
    isValid: (value) => value !== null,
    invalidMessage: 'Choose a valid deadline date.'
  }
};

const getDefinition = (req, res) => {
  const definition = SETTINGS[req.params.key];
  if (!definition) {
    res.status(404).json({ success: false, message: 'Unknown setting' });
  }
  return definition;
};

const toResponse = (key, definition, stored) => ({
  success: true,
  key,
  value: stored ? stored.value : definition.defaultValue,
  isDefault: !stored,
  updatedAt: stored ? stored.updatedAt : null
});

// Get a setting (its default when it was never saved)
router.get('/:key', async (req, res) => {
  const definition = getDefinition(req, res);
  if (!definition) return;

  try {
    const stored = await Setting.findOne({ key: req.params.key }).lean();
    res.json(toResponse(req.params.key, definition, stored));
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch setting', error: error.message });
  }
});

// Save a setting (admin only)
router.put('/:key', requireAdmin, async (req, res) => {
  const definition = getDefinition(req, res);
  if (!definition) return;

  const value = definition.toStored(req.body?.value);
  if (!definition.isValid(value)) {
    return res.status(400).json({ success: false, message: definition.invalidMessage });
  }

  try {
    const stored = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { $set: { value } },
      { upsert: true, new: true, runValidators: true }
    ).lean();
    definition.onChange?.();
    res.json(toResponse(req.params.key, definition, stored));
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ success: false, message: 'Failed to save setting', error: error.message });
  }
});

// Go back to the default (admin only)
router.delete('/:key', requireAdmin, async (req, res) => {
  const definition = getDefinition(req, res);
  if (!definition) return;

  try {
    await Setting.deleteOne({ key: req.params.key });
    definition.onChange?.();
    res.json(toResponse(req.params.key, definition, null));
  } catch (error) {
    console.error('Error resetting setting:', error);
    res.status(500).json({ success: false, message: 'Failed to reset setting', error: error.message });
  }
});

export default router;
