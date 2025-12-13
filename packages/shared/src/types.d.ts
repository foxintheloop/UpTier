export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type PriorityTier = 1 | 2 | 3;
export type GoalStatus = 'active' | 'completed' | 'abandoned';
export type PrioritizationStrategy = 'balanced' | 'urgent_first' | 'quick_wins' | 'high_impact' | 'eisenhower';
export interface List {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    position: number;
    is_smart_list: boolean;
    smart_filter: string | null;
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
    created_at: string;
    updated_at: string;
}
export interface Task {
    id: string;
    list_id: string;
    title: string;
    notes: string | null;
    due_date: string | null;
    due_time: string | null;
    reminder_at: string | null;
    completed: boolean;
    completed_at: string | null;
    position: number;
    effort_score: number | null;
    impact_score: number | null;
    urgency_score: number | null;
    importance_score: number | null;
    priority_tier: PriorityTier | null;
    priority_reasoning: string | null;
    estimated_minutes: number | null;
    energy_required: EnergyLevel | null;
    context_tags: string | null;
    recurrence_rule: string | null;
    created_at: string;
    updated_at: string;
    prioritized_at: string | null;
}
export interface TaskGoal {
    task_id: string;
    goal_id: string;
    alignment_strength: number;
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
    position?: number;
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
        low: number;
        medium: number;
        high: number;
    };
}
export interface SmartListFilter {
    type: 'my_day' | 'important' | 'planned' | 'all';
    criteria?: {
        due_today?: boolean;
        priority_tier?: PriorityTier;
        has_due_date?: boolean;
        is_overdue?: boolean;
    };
}
//# sourceMappingURL=types.d.ts.map