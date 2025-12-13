import { z } from 'zod';
import type { BulkPriorityUpdate, PrioritizationSummary, TaskWithGoals, PrioritizationStrategy } from '@uptier/shared';
export declare const bulkSetPrioritiesSchema: z.ZodObject<{
    updates: z.ZodArray<z.ZodObject<{
        task_id: z.ZodString;
        effort_score: z.ZodOptional<z.ZodNumber>;
        impact_score: z.ZodOptional<z.ZodNumber>;
        urgency_score: z.ZodOptional<z.ZodNumber>;
        importance_score: z.ZodOptional<z.ZodNumber>;
        priority_tier: z.ZodOptional<z.ZodNumber>;
        priority_reasoning: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        task_id: string;
        priority_tier?: number | undefined;
        priority_reasoning?: string | undefined;
        effort_score?: number | undefined;
        impact_score?: number | undefined;
        urgency_score?: number | undefined;
        importance_score?: number | undefined;
    }, {
        task_id: string;
        priority_tier?: number | undefined;
        priority_reasoning?: string | undefined;
        effort_score?: number | undefined;
        impact_score?: number | undefined;
        urgency_score?: number | undefined;
        importance_score?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    updates: {
        task_id: string;
        priority_tier?: number | undefined;
        priority_reasoning?: string | undefined;
        effort_score?: number | undefined;
        impact_score?: number | undefined;
        urgency_score?: number | undefined;
        importance_score?: number | undefined;
    }[];
}, {
    updates: {
        task_id: string;
        priority_tier?: number | undefined;
        priority_reasoning?: string | undefined;
        effort_score?: number | undefined;
        impact_score?: number | undefined;
        urgency_score?: number | undefined;
        importance_score?: number | undefined;
    }[];
}>;
export declare const prioritizeListSchema: z.ZodObject<{
    list_id: z.ZodString;
    strategy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["balanced", "urgent_first", "quick_wins", "high_impact", "eisenhower"]>>>;
    context: z.ZodOptional<z.ZodString>;
    goal_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    strategy: "balanced" | "urgent_first" | "quick_wins" | "high_impact" | "eisenhower";
    list_id: string;
    context?: string | undefined;
    goal_ids?: string[] | undefined;
}, {
    list_id: string;
    context?: string | undefined;
    strategy?: "balanced" | "urgent_first" | "quick_wins" | "high_impact" | "eisenhower" | undefined;
    goal_ids?: string[] | undefined;
}>;
export declare const getPrioritizationSummarySchema: z.ZodObject<{
    list_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    include_completed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    include_completed: boolean;
    list_ids?: string[] | undefined;
}, {
    list_ids?: string[] | undefined;
    include_completed?: boolean | undefined;
}>;
export declare function bulkSetPriorities(updates: BulkPriorityUpdate[]): {
    updated: number;
    failed: string[];
};
export declare function getTasksForPrioritization(listId: string, strategy: PrioritizationStrategy, context?: string, goalIds?: string[]): {
    tasks: TaskWithGoals[];
    strategy_info: {
        name: string;
        description: string;
        prompt_hint: string;
    };
    context?: string;
    focused_goals?: Array<{
        id: string;
        name: string;
    }>;
};
export declare function getPrioritizationSummary(listIds?: string[], includeCompleted?: boolean): PrioritizationSummary;
export declare const priorityTools: {
    bulk_set_priorities: {
        description: string;
        inputSchema: z.ZodObject<{
            updates: z.ZodArray<z.ZodObject<{
                task_id: z.ZodString;
                effort_score: z.ZodOptional<z.ZodNumber>;
                impact_score: z.ZodOptional<z.ZodNumber>;
                urgency_score: z.ZodOptional<z.ZodNumber>;
                importance_score: z.ZodOptional<z.ZodNumber>;
                priority_tier: z.ZodOptional<z.ZodNumber>;
                priority_reasoning: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                task_id: string;
                priority_tier?: number | undefined;
                priority_reasoning?: string | undefined;
                effort_score?: number | undefined;
                impact_score?: number | undefined;
                urgency_score?: number | undefined;
                importance_score?: number | undefined;
            }, {
                task_id: string;
                priority_tier?: number | undefined;
                priority_reasoning?: string | undefined;
                effort_score?: number | undefined;
                impact_score?: number | undefined;
                urgency_score?: number | undefined;
                importance_score?: number | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            updates: {
                task_id: string;
                priority_tier?: number | undefined;
                priority_reasoning?: string | undefined;
                effort_score?: number | undefined;
                impact_score?: number | undefined;
                urgency_score?: number | undefined;
                importance_score?: number | undefined;
            }[];
        }, {
            updates: {
                task_id: string;
                priority_tier?: number | undefined;
                priority_reasoning?: string | undefined;
                effort_score?: number | undefined;
                impact_score?: number | undefined;
                urgency_score?: number | undefined;
                importance_score?: number | undefined;
            }[];
        }>;
        handler: (input: z.infer<typeof bulkSetPrioritiesSchema>) => {
            success: boolean;
            updated: number;
            failed: string[] | undefined;
        };
    };
    prioritize_list: {
        description: string;
        inputSchema: z.ZodObject<{
            list_id: z.ZodString;
            strategy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["balanced", "urgent_first", "quick_wins", "high_impact", "eisenhower"]>>>;
            context: z.ZodOptional<z.ZodString>;
            goal_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            strategy: "balanced" | "urgent_first" | "quick_wins" | "high_impact" | "eisenhower";
            list_id: string;
            context?: string | undefined;
            goal_ids?: string[] | undefined;
        }, {
            list_id: string;
            context?: string | undefined;
            strategy?: "balanced" | "urgent_first" | "quick_wins" | "high_impact" | "eisenhower" | undefined;
            goal_ids?: string[] | undefined;
        }>;
        handler: (input: z.infer<typeof prioritizeListSchema>) => {
            instructions: string;
            tasks: TaskWithGoals[];
            strategy_info: {
                name: string;
                description: string;
                prompt_hint: string;
            };
            context?: string;
            focused_goals?: Array<{
                id: string;
                name: string;
            }>;
            success: boolean;
        };
    };
    get_prioritization_summary: {
        description: string;
        inputSchema: z.ZodObject<{
            list_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            include_completed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        }, "strip", z.ZodTypeAny, {
            include_completed: boolean;
            list_ids?: string[] | undefined;
        }, {
            list_ids?: string[] | undefined;
            include_completed?: boolean | undefined;
        }>;
        handler: (input: z.infer<typeof getPrioritizationSummarySchema>) => {
            success: boolean;
            summary: PrioritizationSummary;
        };
    };
};
//# sourceMappingURL=priorities.d.ts.map