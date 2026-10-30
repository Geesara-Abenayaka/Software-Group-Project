// Keeps the typed answers of the application form in localStorage, one draft per programme.
// Files can't be stored, so documents (and the captcha) are never part of a draft.

const NOT_SAVED_FIELDS = ['program', 'documents', 'captcha'];

const getDraftKey = (program) => `application_draft_${program}`;

// Returns the saved draft for this programme, or null.
export const loadDraft = (program) => {
  if (!program) return null;

  try {
    const draft = JSON.parse(localStorage.getItem(getDraftKey(program)));
    return draft && typeof draft === 'object' ? draft : null;
  } catch {
    return null;
  }
};

export const saveDraft = (formData) => {
  if (!formData.program) return;

  const draft = { ...formData, savedAt: Date.now() };
  NOT_SAVED_FIELDS.forEach((field) => delete draft[field]);

  try {
    localStorage.setItem(getDraftKey(formData.program), JSON.stringify(draft));
  } catch {
    // Storage is full or blocked: the form still works, just without a draft.
  }
};

export const removeDraft = (program) => {
  try {
    localStorage.removeItem(getDraftKey(program));
  } catch {
    // Storage is blocked, so there is no draft to remove.
  }
};

// Puts a draft's answers over the empty form. Rows are merged over an empty row,
// so a draft saved before a field was added still has every field.
export const mergeDraft = (emptyFormData, draft) => {
  if (!draft) return emptyFormData;

  const merged = { ...emptyFormData };
  Object.keys(emptyFormData).forEach((field) => {
    if (NOT_SAVED_FIELDS.includes(field)) return;

    const emptyValue = emptyFormData[field];
    const draftValue = draft[field];

    if (Array.isArray(emptyValue)) {
      if (Array.isArray(draftValue) && draftValue.length > 0) {
        merged[field] = draftValue.map((row) => ({ ...emptyValue[0], ...row }));
      }
    } else if (typeof draftValue === typeof emptyValue) {
      merged[field] = draftValue;
    }
  });
  return merged;
};
