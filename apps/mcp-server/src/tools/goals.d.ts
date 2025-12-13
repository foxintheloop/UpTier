import { z } from 'zod';
import type { Goal, GoalWithProgress, GoalWithChildren, CreateGoalInput, UpdateGoalInput } from '@uptier/shared';
export declare const createGoalSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    timeframe: z.ZodEnum<["daily", "weekly", "monthly", "quarterly", "yearly"]>;
    target_date: z.ZodOptional<z.ZodString>;
    parent_goal_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    timeframe: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
    description?: string | undefined;
    target_date?: string | undefined;
    parent_goal_id?: string | undefined;
}, {
    name: string;
    timeframe: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
    description?: string | undefined;
    target_date?: string | undefined;
    parent_goal_id?: string | undefined;
}>;
export declare const updateGoalSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timeframe: z.ZodOptional<z.ZodEnum<["daily", "weekly", "monthly", "quarterly", "yearly"]>>;
    target_date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    parent_goal_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<["active", "completed", "abandoned"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name?: string | undefined;
    timeframe?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | undefined;
    status?: "completed" | "active" | "abandoned" | undefined;
    description?: string | null | undefined;
    target_date?: string | null | undefined;
    parent_goal_id?: string | null | undefined;
}, {
    id: string;
    name?: string | undefined;
    timeframe?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | undefined;
    status?: "completed" | "active" | "abandoned" | undefined;
    description?: string | null | undefined;
    target_date?: string | null | undefined;
    parent_goal_id?: string | null | undefined;
}>;
export declare const deleteGoalSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const getGoalsSchema: z.ZodObject<{
    include_completed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    parent_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    include_completed: boolean;
    parent_id?: string | undefined;
}, {
    include_completed?: boolean | undefined;
    parent_id?: string | undefined;
}>;
export declare const linkTasksToGoalSchema: z.ZodObject<{
    goal_id: z.ZodString;
    task_ids: z.ZodArray<z.ZodString, "many">;
    alignment_strength: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    goal_id: string;
    task_ids: string[];
    alignment_strength: number;
}, {
    goal_id: string;
    task_ids: string[];
    alignment_strength?: number | undefined;
}>;
export declare const unlinkTasksFromGoalSchema: z.ZodObject<{
    goal_id: z.ZodString;
    task_ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    goal_id: string;
    task_ids: string[];
}, {
    goal_id: string;
    task_ids: string[];
}>;
export declare const getGoalProgressSchema: z.ZodObject<{
    goal_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    goal_id: string;
}, {
    goal_id: string;
}>;
export declare function createGoal(input: CreateGoalInput): Goal;
export declare function getGoalById(id: string): Goal | null;
export declare function getGoals(includeCompleted?: boolean, parentId?: string): Goal[];
export declare function getGoalsWithHierarchy(includeCompleted?: boolean): GoalWithChildren[];
export declare function updateGoal(id: string, input: UpdateGoalInput): Goal | null;
export declare function deleteGoal(id: string): boolean;
export declare function linkTasksToGoal(goalId: string, taskIds: string[], alignmentStrength?: number): {
    linked: number;
};
export declare function unlinkTasksFromGoal(goalId: string, taskIds: string[]): {
    unlinked: number;
};
export declare function getGoalProgress(goalId: string): GoalWithProgress | null;
export declare const goalTools: {
    create_goal: {
        description: string;
        inputSchema: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            timeframe: z.ZodEnum<["daily", "weekly", "monthly", "quarterly", "yearly"]>;
            target_date: z.ZodOptional<z.ZodString>;
            parent_goal_id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            timeframe: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
            description?: string | undefined;
            target_date?: string | undefined;
            parent_goal_id?: string | undefined;
        }, {
            name: string;
            timeframe: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
            description?: string | undefined;
            target_date?: string | undefined;
            parent_goal_id?: string | undefined;
        }>;
        handler: (input: z.infer<typeof createGoalSchema>) => {
            success: boolean;
            goal: Goal;
        };
    };
    get_goals: {
        description: string;
        inputSchema: z.ZodObject<{
            include_completed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            parent_id: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            include_completed: boolean;
            parent_id?: string | undefined;
        }, {
            include_completed?: boolean | undefined;
            parent_id?: string | undefined;
        }>;
        handler: (input: z.infer<typeof getGoalsSchema>) => {
            success: boolean;
            goals: Goal[];
        };
    };
    update_goal: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            timeframe: z.ZodOptional<z.ZodEnum<["daily", "weekly", "monthly", "quarterly", "yearly"]>>;
            target_date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            parent_goal_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            status: z.ZodOptional<z.ZodEnum<["active", "completed", "abandoned"]>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name?: string | undefined;
            timeframe?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | undefined;
            status?: "completed" | "active" | "abandoned" | undefined;
            description?: string | null | undefined;
            target_date?: string | null | undefined;
            parent_goal_id?: string | null | undefined;
        }, {
            id: string;
            name?: string | undefined;
            timeframe?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | undefined;
            status?: "completed" | "active" | "abandoned" | undefined;
            description?: string | null | undefined;
            target_date?: string | null | undefined;
            parent_goal_id?: string | null | undefined;
        }>;
        handler: (input: z.infer<typeof updateGoalSchema>) => {
            success: boolean;
            error: string;
            goal?: undefined;
        } | {
            success: boolean;
            goal: Goal;
            error?: undefined;
        };
    };
    delete_goal: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        handler: (input: z.infer<typeof deleteGoalSchema>) => {
            success: boolean;
            error: string;
        } | {
            success: boolean;
            error?: undefined;
        };
    };
    link_tasks_to_goal: {
        description: string;
        inputSchema: z.ZodObject<{
            goal_id: z.ZodString;
            task_ids: z.ZodArray<z.ZodString, "many">;
            alignment_strength: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            goal_id: string;
            task_ids: string[];
            alignment_strength: number;
        }, {
            goal_id: string;
            task_ids: string[];
            alignment_strength?: number | undefined;
        }>;
        handler: (input: z.infer<typeof linkTasksToGoalSchema>) => {
            linked: number;
            success: boolean;
        };
    };
    unlink_tasks_from_goal: {
        description: string;
        inputSchema: z.ZodObject<{
            goal_id: z.ZodString;
            task_ids: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            goal_id: string;
            task_ids: string[];
        }, {
            goal_id: string;
            task_ids: string[];
        }>;
        handler: (input: z.infer<typeof unlinkTasksFromGoalSchema>) => {
            unlinked: number;
            success: boolean;
        };
    };
    get_goal_progress: {
        description: string;
        inputSchema: z.ZodObject<{
            goal_id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            goal_id: string;
        }, {
            goal_id: string;
        }>;
        handler: (input: z.infer<typeof getGoalProgressSchema>) => {
            success: boolean;
            error: string;
            progress?: undefined;
        } | {
            success: boolean;
            progress: GoalWithProgress;
            error?: undefined;
        };
    };
};
//# sourceMappingURL=goals.d.ts.map