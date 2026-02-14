import type { PrioritizationStrategy } from './types.js';

// Legacy type for built-in smart list definitions (kept for DEFAULT_SMART_LISTS)
interface BuiltInSmartListFilter {
  type: 'my_day' | 'important' | 'planned' | 'all';
  criteria?: {
    due_today?: boolean;
    priority_tier?: number;
    has_due_date?: boolean;
    is_overdue?: boolean;
  };
}

// ============================================================================
// Database Constants
// ============================================================================

export const DB_FILENAME = 'tasks.db';
export const DB_DIRECTORY = '.uptier';

// ============================================================================
// Priority Scales
// ============================================================================

export const PRIORITY_SCALES = {
  effort: {
    1: { label: 'Trivial', description: 'Under 15 minutes, no thought required' },
    2: { label: 'Easy', description: '15-60 minutes, straightforward' },
    3: { label: 'Moderate', description: '1-4 hours, some complexity' },
    4: { label: 'Substantial', description: 'Half day to full day, significant work' },
    5: { label: 'Major', description: 'Multi-day project, substantial effort' },
  },
  impact: {
    1: { label: 'Minimal', description: 'Nice to have, minimal consequence' },
    2: { label: 'Low', description: 'Helpful, some benefit' },
    3: { label: 'Medium', description: 'Important, clear value' },
    4: { label: 'High', description: 'High value, significant outcomes' },
    5: { label: 'Critical', description: 'Critical, transformative results' },
  },
  urgency: {
    1: { label: 'Someday', description: 'Someday/maybe, no deadline' },
    2: { label: 'This Month', description: 'This month' },
    3: { label: 'This Week', description: 'This week' },
    4: { label: 'Soon', description: 'Next few days' },
    5: { label: 'Urgent', description: 'Today/overdue' },
  },
  importance: {
    1: { label: 'Optional', description: 'Would be fine if never done' },
    2: { label: 'Low Stakes', description: 'Low stakes' },
    3: { label: 'Meaningful', description: 'Matters to goals' },
    4: { label: 'Significant', description: 'Significant to success' },
    5: { label: 'Critical', description: 'Core to mission/values' },
  },
} as const;

export const PRIORITY_TIERS = {
  1: {
    label: 'Do Now',
    description: 'High impact, urgent, or blocking others',
    color: '#ef4444', // red-500
  },
  2: {
    label: 'Do Soon',
    description: 'Important but not urgent, scheduled',
    color: '#f59e0b', // amber-500
  },
  3: {
    label: 'Backlog',
    description: 'Low priority, someday/maybe',
    color: '#6b7280', // gray-500
  },
} as const;

// ============================================================================
// Prioritization Strategies
// ============================================================================

export const PRIORITIZATION_STRATEGIES: Record<
  PrioritizationStrategy,
  {
    label: string;
    description: string;
    prompt_hint: string;
  }
> = {
  balanced: {
    label: 'Balanced',
    description: 'Weighs all factors equally',
    prompt_hint:
      'Balance effort, impact, urgency, and importance equally. Consider goal alignment.',
  },
  urgent_first: {
    label: 'Urgent First',
    description: 'Prioritizes by deadline and urgency',
    prompt_hint:
      'Focus on urgency_score and due dates. Overdue items get Tier 1. Due soon gets Tier 2.',
  },
  quick_wins: {
    label: 'Quick Wins',
    description: 'Low effort, high impact tasks first',
    prompt_hint:
      'Prioritize tasks with low effort (1-2) and high impact (4-5). Great for building momentum.',
  },
  high_impact: {
    label: 'High Impact',
    description: 'Maximum impact regardless of effort',
    prompt_hint:
      'Focus on impact_score above all else. High impact tasks get Tier 1 regardless of effort.',
  },
  eisenhower: {
    label: 'Eisenhower',
    description: 'Classic urgent/important matrix',
    prompt_hint:
      'Use the Eisenhower matrix: Tier 1 = Important+Urgent, Tier 2 = Important+Not Urgent, Tier 3 = Not Important (consider delegating or eliminating urgent but not important tasks).',
  },
};

// ============================================================================
// Smart List Configurations
// ============================================================================

export const DEFAULT_SMART_LISTS: Array<{
  id: string;
  name: string;
  icon: string;
  color: string;
  filter: BuiltInSmartListFilter;
}> = [
  {
    id: 'smart-my-day',
    name: 'My Day',
    icon: 'sun',
    color: '#f59e0b',
    filter: {
      type: 'my_day',
      criteria: {
        due_today: true,
      },
    },
  },
  {
    id: 'smart-important',
    name: 'Important',
    icon: 'star',
    color: '#ef4444',
    filter: {
      type: 'important',
      criteria: {
        priority_tier: 1,
      },
    },
  },
  {
    id: 'smart-planned',
    name: 'Planned',
    icon: 'calendar',
    color: '#3b82f6',
    filter: {
      type: 'planned',
      criteria: {
        has_due_date: true,
      },
    },
  },
  {
    id: 'smart-all',
    name: 'All Tasks',
    icon: 'inbox',
    color: '#6b7280',
    filter: {
      type: 'all',
    },
  },
];

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_LIST_ICON = 'list';
export const DEFAULT_LIST_COLOR = '#3b82f6';
export const DEFAULT_TAG_COLOR = '#6b7280';

// ============================================================================
// Context Tags
// ============================================================================

export const CONTEXT_TAGS = [
  { id: 'deep_work', label: 'Deep Work', description: 'Requires focused, uninterrupted time' },
  { id: 'quick_win', label: 'Quick Win', description: 'Can be done in a few minutes' },
  { id: 'waiting_on', label: 'Waiting On', description: 'Blocked by someone/something else' },
  { id: 'low_energy', label: 'Low Energy', description: 'Can do when tired' },
  { id: 'high_energy', label: 'High Energy', description: 'Needs peak mental state' },
  { id: 'meeting', label: 'Meeting', description: 'Requires scheduling with others' },
  { id: 'research', label: 'Research', description: 'Information gathering' },
  { id: 'creative', label: 'Creative', description: 'Requires creative thinking' },
  { id: 'admin', label: 'Admin', description: 'Administrative/paperwork' },
] as const;

// ============================================================================
// Energy Levels
// ============================================================================

export const ENERGY_LEVELS = {
  low: { label: 'Low Energy', description: 'Can do when tired or distracted' },
  medium: { label: 'Medium Energy', description: 'Normal working state' },
  high: { label: 'High Energy', description: 'Requires peak focus and energy' },
} as const;

// ============================================================================
// Timeframes
// ============================================================================

export const TIMEFRAMES = {
  daily: { label: 'Daily', description: 'Recurring daily goals' },
  weekly: { label: 'Weekly', description: 'Week-by-week objectives' },
  monthly: { label: 'Monthly', description: 'Monthly milestones' },
  quarterly: { label: 'Quarterly', description: '90-day goals' },
  yearly: { label: 'Yearly', description: 'Annual objectives' },
} as const;
