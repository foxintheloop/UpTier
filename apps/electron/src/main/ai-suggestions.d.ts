export interface DueDateSuggestion {
    suggestedDate: string;
    confidence: number;
    reasoning: string;
    basedOn: string[];
}
export interface SubtaskSuggestion {
    title: string;
    estimatedMinutes?: number;
}
export interface BreakdownSuggestion {
    subtasks: SubtaskSuggestion[];
    totalEstimatedMinutes: number;
    reasoning: string;
}
/**
 * Suggest a due date based on similar completed tasks
 */
export declare function suggestDueDate(taskId: string): DueDateSuggestion | null;
/**
 * Suggest a breakdown of subtasks for a complex task
 */
export declare function suggestBreakdown(taskId: string): BreakdownSuggestion | null;
/**
 * Get smart suggestions based on task context
 */
export interface TaskSuggestions {
    dueDate?: DueDateSuggestion;
    breakdown?: BreakdownSuggestion;
}
export declare function getTaskSuggestions(taskId: string): TaskSuggestions;
//# sourceMappingURL=ai-suggestions.d.ts.map