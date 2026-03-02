// ============================================================================
// Enums
// ============================================================================

export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type EnergyLevel = 'low' | 'medium' | 'high';

export type PriorityTier = 1 | 2 | 3;

export type GoalStatus = 'active' | 'completed' | 'abandoned';

export type PrioritizationStrategy =
  | 'balanced'
  | 'urgent_first'
  | 'quick_wins'
  | 'high_impact'
  | 'eisenhower';

export type RecurrenceFrequency = 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
}

// ============================================================================
// Core Entities
// ============================================================================

export interface List {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  position: number;
  is_smart_list: boolean;
  smart_filter: string | null; // JSON string for smart list criteria
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  timeframe: Timeframe;
  target_date: string | null;
  parent_goal_id: string | null;
  status: GoalStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  list_id: string;

  // Basic fields
  title: string;
  notes: string | null;
  due_date: string | null;    // ISO date (YYYY-MM-DD)
  due_time: string | null;    // HH:MM format
  reminder_at: string | null; // ISO datetime

  // Completion
  completed: boolean;
  completed_at: string | null;

  // Ordering
  position: number;

  // Priority scores (1-5 scale, Claude-populated)
  effort_score: number | null;      // 1=trivial, 5=major project
  impact_score: number | null;      // 1=minimal, 5=transformative
  urgency_score: number | null;     // 1=someday, 5=on fire
  importance_score: number | null;  // Eisenhower importance (independent of urgency)

  // Computed priority
  priority_tier: PriorityTier | null; // 1=do now, 2=do soon, 3=backlog
  priority_reasoning: string | null;   // Claude's explanation

  // Context
  estimated_minutes: number | null;
  energy_required: EnergyLevel | null;
  context_tags: string | null; // JSON array: ["deep_work", "quick_win", "waiting_on"]

  // Recurrence
  recurrence_rule: string | null; // JSON: { frequency, interval }
  recurrence_end_date: string | null; // ISO date (YYYY-MM-DD)

  // Metadata
  created_at: string;
  updated_at: string;
  prioritized_at: string | null; // Last time Claude prioritized this
}

export interface TaskGoal {
  task_id: string;
  goal_id: string;
  alignment_strength: number; // 1-5 scale
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TaskTag {
  task_id: string;
  tag_id: string;
}

// ============================================================================
// Input Types (for creating/updating)
// ============================================================================

export interface CreateListInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface UpdateListInput {
  name?: string;
  description?: string | null;
  icon?: string;
  color?: string;
  position?: number;
}

export interface CreateGoalInput {
  name: string;
  description?: string;
  timeframe: Timeframe;
  target_date?: string;
  parent_goal_id?: string;
}

export interface UpdateGoalInput {
  name?: string;
  description?: string | null;
  timeframe?: Timeframe;
  target_date?: string | null;
  parent_goal_id?: string | null;
  status?: GoalStatus;
  position?: number;
}

export interface CreateTaskInput {
  list_id: string;
  title: string;
  notes?: string;
  due_date?: string;
  due_time?: string;
  reminder_at?: string;
  effort_score?: number;
  impact_score?: number;
  urgency_score?: number;
  importance_score?: number;
  priority_tier?: PriorityTier;
  priority_reasoning?: string;
  estimated_minutes?: number;
  energy_required?: EnergyLevel;
  context_tags?: string[];
  recurrence_rule?: string;
  recurrence_end_date?: string;
  goal_ids?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  reminder_at?: string | null;
  effort_score?: number | null;
  impact_score?: number | null;
  urgency_score?: number | null;
  importance_score?: number | null;
  priority_tier?: PriorityTier | null;
  priority_reasoning?: string | null;
  estimated_minutes?: number | null;
  energy_required?: EnergyLevel | null;
  context_tags?: string[] | null;
  recurrence_rule?: string | null;
  recurrence_end_date?: string | null;
  position?: number;
  list_id?: string;
}

export interface BulkPriorityUpdate {
  task_id: string;
  effort_score?: number;
  impact_score?: number;
  urgency_score?: number;
  importance_score?: number;
  priority_tier?: PriorityTier;
  priority_reasoning?: string;
}

export interface CreateSubtaskInput {
  task_id: string;
  title: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

// ============================================================================
// Query Types
// ============================================================================

export interface GetTasksOptions {
  list_id?: string;
  include_completed?: boolean;
  priority_tier?: PriorityTier;
  due_before?: string;
  energy_required?: EnergyLevel;
}

export interface PrioritizeListOptions {
  list_id: string;
  strategy?: PrioritizationStrategy;
  context?: string;
  goal_ids?: string[];
}

// ============================================================================
// Response Types
// ============================================================================

export interface ListWithCount extends List {
  task_count: number;
  incomplete_count: number;
}

export interface TaskWithGoals extends Task {
  goals: Array<{
    goal_id: string;
    goal_name: string;
    alignment_strength: number;
  }>;
  tags: Tag[];
}

export interface TaskWithSubtasks extends Task {
  subtasks: Subtask[];
}

export interface GoalWithProgress extends Goal {
  total_tasks: number;
  completed_tasks: number;
  progress_percentage: number;
}

export interface GoalWithChildren extends Goal {
  children: GoalWithChildren[];
}

export interface PrioritizationSummary {
  tier_1_count: number;
  tier_2_count: number;
  tier_3_count: number;
  unprioritized_count: number;
  overdue_count: number;
  due_today_count: number;
  quick_wins: Array<{
    task_id: string;
    title: string;
    effort_score: number;
    impact_score: number;
  }>;
  high_impact_tasks: Array<{
    task_id: string;
    title: string;
    impact_score: number;
    effort_score: number;
  }>;
  effort_distribution: {
    low: number;    // effort 1-2
    medium: number; // effort 3
    high: number;   // effort 4-5
  };
}

// ============================================================================
// Smart List Filter Types
// ============================================================================

export type SmartFilterField = 'due_date' | 'priority_tier' | 'tags' | 'energy_required' | 'list_id' | 'estimated_minutes' | 'completed';

export type SmartFilterOperator = 'equals' | 'not_equals' | 'in' | 'not_in' | 'is_set' | 'is_not_set' | 'today' | 'this_week' | 'overdue' | 'gte' | 'lte';

export interface SmartFilterRule {
  field: SmartFilterField;
  operator: SmartFilterOperator;
  value?: string | number | string[] | boolean;
}

export interface SmartFilterCriteria {
  rules: SmartFilterRule[];
}

export interface CreateSmartListInput {
  name: string;
  icon?: string;
  color?: string;
  filter: SmartFilterCriteria;
}

export interface UpdateSmartListInput {
  name?: string;
  icon?: string;
  color?: string;
  filter?: SmartFilterCriteria;
}

// ============================================================================
// Focus Session Types
// ============================================================================

export interface FocusSession {
  id: string;
  task_id: string;
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  completed: boolean;
  created_at: string;
}

export interface StartFocusSessionInput {
  task_id: string;
  duration_minutes: number;
}

export interface EndFocusSessionInput {
  completed: boolean;
}

export interface FocusSessionWithTask extends FocusSession {
  task_title: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface TodaySummary {
  completedCount: number;
  plannedCount: number;
  completionRate: number;
  focusMinutes: number;
  tierBreakdown: { tier1: number; tier2: number; tier3: number; unset: number };
}

export interface WeeklyTrend {
  days: Array<{ date: string; dayLabel: string; completedCount: number }>;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
  milestoneReached: number | null;
}

export interface FocusGoalProgress {
  dailyGoalMinutes: number;
  todayMinutes: number;
  progressPercent: number;
}

export interface DashboardData {
  todaySummary: TodaySummary;
  weeklyTrend: WeeklyTrend;
  streak: StreakInfo;
  focusGoal: FocusGoalProgress;
}
