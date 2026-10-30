// "Find my programme" quiz: fixed questions and a simple score, so it works without the AI.

export const QUIZ_QUESTIONS = [
  {
    id: 'background',
    text: "What's your first degree?",
    options: [
      { value: 'computing', label: 'Computing / IT' },
      { value: 'engineering', label: 'Engineering' },
      { value: 'science', label: 'Science / Maths' },
      { value: 'business', label: 'Business / Other' }
    ]
  },
  {
    id: 'focus',
    text: 'What do you want to focus on?',
    options: [
      { value: 'software', label: 'Software & architecture' },
      { value: 'security', label: 'Security' },
      { value: 'cloud', label: 'Cloud & networks' },
      { value: 'data', label: 'Data science & AI' },
      { value: 'management', label: 'Management & business' },
      { value: 'government', label: 'Government & public sector' }
    ]
  },
  {
    id: 'time',
    text: 'How much time can you give?',
    options: [
      { value: '1', label: '1 year' },
      { value: '2', label: '2 years' },
      { value: 'any', label: 'Not sure' }
    ]
  },
  {
    id: 'goal',
    text: 'What do you want to get?',
    options: [
      { value: 'msc', label: 'A research-based MSc' },
      { value: 'master', label: "A coursework master's" },
      { value: 'mba', label: 'An MBA' }
    ]
  }
];

// focus -> programme codes that fit, best first
const FOCUS_MATCH = {
  software: ['msc-cs', 'mcs'],
  security: ['msc-cs', 'mcs'],
  cloud: ['msc-cs', 'mcs'],
  data: ['msc-ds-ai', 'master-ds-ai', 'msc-cs'],
  management: ['mba-it'],
  government: ['mba-egov']
};

const GOAL_LEVELS = { msc: ['MSc'], master: ['Master', 'PG Diploma'], mba: ['MBA'] };

export const scorePrograms = (answers, programs) =>
  programs
    .map((program) => {
      const reasons = [];
      let score = 0;

      const focusRank = (FOCUS_MATCH[answers.focus] || []).indexOf(program.shortCode);
      if (focusRank >= 0) {
        score += 3 - focusRank;
        reasons.push('Matches your focus');
      }

      if (answers.time !== 'any' && program.duration?.startsWith(answers.time)) {
        score += 1;
        reasons.push(program.duration);
      }

      if ((GOAL_LEVELS[answers.goal] || []).includes(program.level)) {
        score += 2;
        reasons.push(program.level);
      }

      if (answers.background === 'business' && program.level === 'MBA') {
        score += 1;
      }

      return { program, score, reason: reasons.join(' · ') };
    })
    .filter((entry) => entry.score > 0 && !entry.program.isProposed)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
