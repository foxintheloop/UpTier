import {
  addDays,
  addWeeks,
  addMonths,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  format,
  isValid,
  startOfDay,
} from 'date-fns';
import type { PriorityTier } from '@uptier/shared';

// ============================================================================
// Types
// ============================================================================

export interface ParsedToken {
  type: 'date' | 'time' | 'priority' | 'tag' | 'duration';
  raw: string;       // original text matched
  value: string;     // display-friendly value
  startIndex: number;
  endIndex: number;
}

export interface ParsedTask {
  cleanTitle: string;
  dueDate?: string;        // ISO date string (YYYY-MM-DD)
  dueTime?: string;        // HH:mm format
  priorityTier?: PriorityTier;
  tags: string[];
  estimatedMinutes?: number;
  tokens: ParsedToken[];
}

// ============================================================================
// Token matchers — order matters, process from specific to general
// ============================================================================

interface TokenMatch {
  type: ParsedToken['type'];
  regex: RegExp;
  extract: (match: RegExpExecArray, now: Date) => {
    value: string;
    dueDate?: string;
    dueTime?: string;
    priorityTier?: PriorityTier;
    tag?: string;
    estimatedMinutes?: number;
  };
}

const DAY_NAMES: Record<string, (date: Date) => Date> = {
  monday: nextMonday,
  tuesday: nextTuesday,
  wednesday: nextWednesday,
  thursday: nextThursday,
  friday: nextFriday,
  saturday: nextSaturday,
  sunday: nextSunday,
  mon: nextMonday,
  tue: nextTuesday,
  wed: nextWednesday,
  thu: nextThursday,
  fri: nextFriday,
  sat: nextSaturday,
  sun: nextSunday,
};

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function formatDateDisplay(date: Date): string {
  return format(date, 'MMM d');
}

const TOKEN_MATCHERS: TokenMatch[] = [
  // Duration: ~30m, ~2h, ~1h30m, ~90min
  {
    type: 'duration',
    regex: /~(\d+)\s*h\s*(\d+)\s*m(?:in)?(?:\b|$)/gi,
    extract: (match) => {
      const hours = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      const total = hours * 60 + mins;
      return { value: `${hours}h ${mins}m`, estimatedMinutes: total };
    },
  },
  {
    type: 'duration',
    regex: /~(\d+)\s*h(?:r|rs|ours?)?(?:\b|$)/gi,
    extract: (match) => {
      const hours = parseInt(match[1], 10);
      return { value: `${hours}h`, estimatedMinutes: hours * 60 };
    },
  },
  {
    type: 'duration',
    regex: /~(\d+)\s*m(?:in|ins|inutes?)?(?:\b|$)/gi,
    extract: (match) => {
      const mins = parseInt(match[1], 10);
      return { value: `${mins}m`, estimatedMinutes: mins };
    },
  },

  // Priority: !1, !2, !3, !now, !soon, !backlog
  {
    type: 'priority',
    regex: /!([123])\b/g,
    extract: (match) => {
      const tier = parseInt(match[1], 10) as PriorityTier;
      const labels = { 1: 'Do Now', 2: 'Do Soon', 3: 'Backlog' };
      return { value: labels[tier], priorityTier: tier };
    },
  },
  {
    type: 'priority',
    regex: /!(now|soon|backlog)\b/gi,
    extract: (match) => {
      const map: Record<string, PriorityTier> = { now: 1, soon: 2, backlog: 3 };
      const labels: Record<string, string> = { now: 'Do Now', soon: 'Do Soon', backlog: 'Backlog' };
      const key = match[1].toLowerCase();
      return { value: labels[key], priorityTier: map[key] };
    },
  },

  // Tags: #tagname (alphanumeric, hyphens, underscores)
  {
    type: 'tag',
    regex: /#([a-zA-Z][\w-]*)\b/g,
    extract: (match) => {
      return { value: `#${match[1]}`, tag: match[1] };
    },
  },

  // Time: at 3pm, at 14:00, at noon, at midnight
  {
    type: 'time',
    regex: /\bat\s+(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi,
    extract: (match) => {
      let hours = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      const ampm = match[3]?.toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      const time = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      return { value: time, dueTime: time };
    },
  },
  {
    type: 'time',
    regex: /\bat\s+(\d{1,2})\s*(am|pm)\b/gi,
    extract: (match) => {
      let hours = parseInt(match[1], 10);
      const ampm = match[2].toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      const time = `${String(hours).padStart(2, '0')}:00`;
      return { value: time, dueTime: time };
    },
  },
  {
    type: 'time',
    regex: /\bat\s+(noon)\b/gi,
    extract: () => ({ value: '12:00', dueTime: '12:00' }),
  },
  {
    type: 'time',
    regex: /\bat\s+(midnight)\b/gi,
    extract: () => ({ value: '00:00', dueTime: '00:00' }),
  },

  // Date: today, tomorrow, yesterday
  {
    type: 'date',
    regex: /\b(today)\b/gi,
    extract: (_match, now) => {
      const date = startOfDay(now);
      return { value: 'Today', dueDate: formatDate(date) };
    },
  },
  {
    type: 'date',
    regex: /\b(tomorrow)\b/gi,
    extract: (_match, now) => {
      const date = addDays(startOfDay(now), 1);
      return { value: 'Tomorrow', dueDate: formatDate(date) };
    },
  },

  // Date: next monday, next tuesday, etc.
  {
    type: 'date',
    regex: /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi,
    extract: (match, now) => {
      const dayName = match[1].toLowerCase();
      const nextFn = DAY_NAMES[dayName];
      if (!nextFn) return { value: match[0] };
      const date = nextFn(now);
      return { value: formatDateDisplay(date), dueDate: formatDate(date) };
    },
  },

  // Date: next week, next month
  {
    type: 'date',
    regex: /\bnext\s+week\b/gi,
    extract: (_match, now) => {
      const date = addWeeks(startOfDay(now), 1);
      return { value: formatDateDisplay(date), dueDate: formatDate(date) };
    },
  },
  {
    type: 'date',
    regex: /\bnext\s+month\b/gi,
    extract: (_match, now) => {
      const date = addMonths(startOfDay(now), 1);
      return { value: formatDateDisplay(date), dueDate: formatDate(date) };
    },
  },

  // Date: in N days/weeks/months
  {
    type: 'date',
    regex: /\bin\s+(\d+)\s+(days?|weeks?|months?)\b/gi,
    extract: (match, now) => {
      const n = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();
      let date: Date;
      if (unit.startsWith('day')) date = addDays(startOfDay(now), n);
      else if (unit.startsWith('week')) date = addWeeks(startOfDay(now), n);
      else date = addMonths(startOfDay(now), n);
      return { value: formatDateDisplay(date), dueDate: formatDate(date) };
    },
  },

  // Date: Jan 15, December 25, etc.
  {
    type: 'date',
    regex: /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi,
    extract: (match, now) => {
      const monthName = match[1].toLowerCase();
      const month = MONTH_NAMES[monthName];
      const day = parseInt(match[2], 10);
      if (month === undefined || day < 1 || day > 31) return { value: match[0] };
      let year = now.getFullYear();
      const date = new Date(year, month, day);
      // If the date is in the past, use next year
      if (date < startOfDay(now)) {
        year++;
      }
      const finalDate = new Date(year, month, day);
      if (!isValid(finalDate)) return { value: match[0] };
      return { value: formatDateDisplay(finalDate), dueDate: formatDate(finalDate) };
    },
  },

  // Date: MM/DD or MM-DD
  {
    type: 'date',
    regex: /\b(\d{1,2})[/-](\d{1,2})\b/g,
    extract: (match, now) => {
      const month = parseInt(match[1], 10) - 1;
      const day = parseInt(match[2], 10);
      if (month < 0 || month > 11 || day < 1 || day > 31) return { value: match[0] };
      let year = now.getFullYear();
      const date = new Date(year, month, day);
      if (date < startOfDay(now)) year++;
      const finalDate = new Date(year, month, day);
      if (!isValid(finalDate)) return { value: match[0] };
      return { value: formatDateDisplay(finalDate), dueDate: formatDate(finalDate) };
    },
  },
];

// ============================================================================
// Parser
// ============================================================================

export function parseTaskInput(input: string, now: Date = new Date()): ParsedTask {
  const tokens: ParsedToken[] = [];
  const result: ParsedTask = {
    cleanTitle: input,
    tags: [],
    tokens: [],
  };

  // Collect all matches from all matchers
  for (const matcher of TOKEN_MATCHERS) {
    // Reset regex state
    matcher.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = matcher.regex.exec(input)) !== null) {
      const startIndex = match.index;
      const endIndex = match.index + match[0].length;

      // Check for overlapping tokens
      const overlaps = tokens.some(
        (t) => startIndex < t.endIndex && endIndex > t.startIndex
      );
      if (overlaps) continue;

      const extracted = matcher.extract(match, now);

      const token: ParsedToken = {
        type: matcher.type,
        raw: match[0],
        value: extracted.value,
        startIndex,
        endIndex,
      };

      tokens.push(token);

      // Apply extracted values to result
      if (extracted.dueDate && !result.dueDate) result.dueDate = extracted.dueDate;
      if (extracted.dueTime && !result.dueTime) result.dueTime = extracted.dueTime;
      if (extracted.priorityTier && !result.priorityTier) result.priorityTier = extracted.priorityTier;
      if (extracted.estimatedMinutes && !result.estimatedMinutes) result.estimatedMinutes = extracted.estimatedMinutes;
      if (extracted.tag) result.tags.push(extracted.tag);
    }
  }

  // Sort tokens by position (right-to-left for removal)
  tokens.sort((a, b) => b.startIndex - a.startIndex);

  // Build clean title by removing tokens
  let cleanTitle = input;
  for (const token of tokens) {
    cleanTitle = cleanTitle.slice(0, token.startIndex) + cleanTitle.slice(token.endIndex);
  }

  // Normalize whitespace
  result.cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();

  // Sort tokens by position for display (left-to-right)
  result.tokens = [...tokens].sort((a, b) => a.startIndex - b.startIndex);

  return result;
}
