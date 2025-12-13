import { z } from 'zod';
import type { Task, TaskWithGoals, CreateTaskInput, UpdateTaskInput, GetTasksOptions, EnergyLevel } from '@uptier/shared';
export declare const createTaskSchema: z.ZodObject<{
    list_id: z.ZodString;
    title: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
    due_date: z.ZodOptional<z.ZodString>;
    due_time: z.ZodOptional<z.ZodString>;
    reminder_at: z.ZodOptional<z.ZodString>;
    effort_score: z.ZodOptional<z.ZodNumber>;
    impact_score: z.ZodOptional<z.ZodNumber>;
    urgency_score: z.ZodOptional<z.ZodNumber>;
    importance_score: z.ZodOptional<z.ZodNumber>;
    priority_tier: z.ZodOptional<z.ZodNumber>;
    priority_reasoning: z.ZodOptional<z.ZodString>;
    estimated_minutes: z.ZodOptional<z.ZodNumber>;
    energy_required: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
    context_tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    goal_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    list_id: string;
    priority_tier?: number | undefined;
    notes?: string | undefined;
    due_date?: string | undefined;
    due_time?: string | undefined;
    priority_reasoning?: string | undefined;
    effort_score?: number | undefined;
    impact_score?: number | undefined;
    urgency_score?: number | undefined;
    importance_score?: number | undefined;
    estimated_minutes?: number | undefined;
    energy_required?: "low" | "medium" | "high" | undefined;
    reminder_at?: string | undefined;
    context_tags?: string[] | undefined;
    goal_ids?: string[] | undefined;
}, {
    title: string;
    list_id: string;
    priority_tier?: number | undefined;
    notes?: string | undefined;
    due_date?: string | undefined;
    due_time?: string | undefined;
    priority_reasoning?: string | undefined;
    effort_score?: number | undefined;
    impact_score?: number | undefined;
    urgency_score?: number | undefined;
    importance_score?: number | undefined;
    estimated_minutes?: number | undefined;
    energy_required?: "low" | "medium" | "high" | undefined;
    reminder_at?: string | undefined;
    context_tags?: string[] | undefined;
    goal_ids?: string[] | undefined;
}>;
export declare const updateTaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    due_date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    due_time: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reminder_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    effort_score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    impact_score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    urgency_score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    importance_score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    priority_tier: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    priority_reasoning: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    estimated_minutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    energy_required: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
    context_tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    priority_tier?: number | null | undefined;
    title?: string | undefined;
    notes?: string | null | undefined;
    due_date?: string | null | undefined;
    due_time?: string | null | undefined;
    priority_reasoning?: string | null | undefined;
    effort_score?: number | null | undefined;
    impact_score?: number | null | undefined;
    urgency_score?: number | null | undefined;
    importance_score?: number | null | undefined;
    estimated_minutes?: number | null | undefined;
    energy_required?: "low" | "medium" | "high" | null | undefined;
    reminder_at?: string | null | undefined;
    context_tags?: string[] | null | undefined;
    position?: number | undefined;
}, {
    id: string;
    priority_tier?: number | null | undefined;
    title?: string | undefined;
    notes?: string | null | undefined;
    due_date?: string | null | undefined;
    due_time?: string | null | undefined;
    priority_reasoning?: string | null | undefined;
    effort_score?: number | null | undefined;
    impact_score?: number | null | undefined;
    urgency_score?: number | null | undefined;
    importance_score?: number | null | undefined;
    estimated_minutes?: number | null | undefined;
    energy_required?: "low" | "medium" | "high" | null | undefined;
    reminder_at?: string | null | undefined;
    context_tags?: string[] | null | undefined;
    position?: number | undefined;
}>;
export declare const getTasksSchema: z.ZodObject<{
    list_id: z.ZodOptional<z.ZodString>;
    include_completed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    priority_tier: z.ZodOptional<z.ZodNumber>;
    due_before: z.ZodOptional<z.ZodString>;
    energy_required: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
}, "strip", z.ZodTypeAny, {
    include_completed: boolean;
    priority_tier?: number | undefined;
    energy_required?: "low" | "medium" | "high" | undefined;
    list_id?: string | undefined;
    due_before?: string | undefined;
}, {
    priority_tier?: number | undefined;
    energy_required?: "low" | "medium" | "high" | undefined;
    list_id?: string | undefined;
    include_completed?: boolean | undefined;
    due_before?: string | undefined;
}>;
export declare const deleteTaskSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const completeTaskSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const uncompleteTaskSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const moveTaskSchema: z.ZodObject<{
    id: z.ZodString;
    list_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    list_id: string;
}, {
    id: string;
    list_id: string;
}>;
export declare const bulkCreateTasksSchema: z.ZodObject<{
    list_id: z.ZodString;
    tasks: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        notes: z.ZodOptional<z.ZodString>;
        effort_score: z.ZodOptional<z.ZodNumber>;
        impact_score: z.ZodOptional<z.ZodNumber>;
        urgency_score: z.ZodOptional<z.ZodNumber>;
        importance_score: z.ZodOptional<z.ZodNumber>;
        priority_tier: z.ZodOptional<z.ZodNumber>;
        priority_reasoning: z.ZodOptional<z.ZodString>;
        estimated_minutes: z.ZodOptional<z.ZodNumber>;
        energy_required: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
        due_date: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        priority_tier?: number | undefined;
        notes?: string | undefined;
        due_date?: string | undefined;
        priority_reasoning?: string | undefined;
        effort_score?: number | undefined;
        impact_score?: number | undefined;
        urgency_score?: number | undefined;
        importance_score?: number | undefined;
        estimated_minutes?: number | undefined;
        energy_required?: "low" | "medium" | "high" | undefined;
    }, {
        title: string;
        priority_tier?: number | undefined;
        notes?: string | undefined;
        due_date?: string | undefined;
        priority_reasoning?: string | undefined;
        effort_score?: number | undefined;
        impact_score?: number | undefined;
        urgency_score?: number | undefined;
        importance_score?: number | undefined;
        estimated_minutes?: number | undefined;
        energy_required?: "low" | "medium" | "high" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    tasks: {
        title: string;
        priority_tier?: number | undefined;
        notes?: string | undefined;
        due_date?: string | undefined;
        priority_reasoning?: string | undefined;
        effort_score?: number | undefined;
        impact_score?: number | undefined;
        urgency_score?: number | undefined;
        importance_score?: number | undefined;
        estimated_minutes?: number | undefined;
        energy_required?: "low" | "medium" | "high" | undefined;
    }[];
    list_id: string;
}, {
    tasks: {
        title: string;
        priority_tier?: number | undefined;
        notes?: string | undefined;
        due_date?: string | undefined;
        priority_reasoning?: string | undefined;
        effort_score?: number | undefined;
        impact_score?: number | undefined;
        urgency_score?: number | undefined;
        importance_score?: number | undefined;
        estimated_minutes?: number | undefined;
        energy_required?: "low" | "medium" | "high" | undefined;
    }[];
    list_id: string;
}>;
export declare function createTask(input: CreateTaskInput): Task;
export declare function getTaskById(id: string): Task | null;
export declare function getTasks(options?: GetTasksOptions): TaskWithGoals[];
export declare function updateTask(id: string, input: UpdateTaskInput): Task | null;
export declare function deleteTask(id: string): boolean;
export declare function completeTask(id: string): Task | null;
export declare function uncompleteTask(id: string): Task | null;
export declare function moveTask(id: string, listId: string): Task | null;
export declare function bulkCreateTasks(listId: string, tasks: Array<{
    title: string;
    notes?: string;
    effort_score?: number;
    impact_score?: number;
    urgency_score?: number;
    importance_score?: number;
    priority_tier?: number;
    priority_reasoning?: string;
    estimated_minutes?: number;
    energy_required?: EnergyLevel;
    due_date?: string;
}>): Task[];
export declare const taskTools: {
    create_task: {
        description: string;
        inputSchema: z.ZodObject<{
            list_id: z.ZodString;
            title: z.ZodString;
            notes: z.ZodOptional<z.ZodString>;
            due_date: z.ZodOptional<z.ZodString>;
            due_time: z.ZodOptional<z.ZodString>;
            reminder_at: z.ZodOptional<z.ZodString>;
            effort_score: z.ZodOptional<z.ZodNumber>;
            impact_score: z.ZodOptional<z.ZodNumber>;
            urgency_score: z.ZodOptional<z.ZodNumber>;
            importance_score: z.ZodOptional<z.ZodNumber>;
            priority_tier: z.ZodOptional<z.ZodNumber>;
            priority_reasoning: z.ZodOptional<z.ZodString>;
            estimated_minutes: z.ZodOptional<z.ZodNumber>;
            energy_required: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
            context_tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            goal_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            list_id: string;
            priority_tier?: number | undefined;
            notes?: string | undefined;
            due_date?: string | undefined;
            due_time?: string | undefined;
            priority_reasoning?: string | undefined;
            effort_score?: number | undefined;
            impact_score?: number | undefined;
            urgency_score?: number | undefined;
            importance_score?: number | undefined;
            estimated_minutes?: number | undefined;
            energy_required?: "low" | "medium" | "high" | undefined;
            reminder_at?: string | undefined;
            context_tags?: string[] | undefined;
            goal_ids?: string[] | undefined;
        }, {
            title: string;
            list_id: string;
            priority_tier?: number | undefined;
            notes?: string | undefined;
            due_date?: string | undefined;
            due_time?: string | undefined;
            priority_reasoning?: string | undefined;
            effort_score?: number | undefined;
            impact_score?: number | undefined;
            urgency_score?: number | undefined;
            importance_score?: number | undefined;
            estimated_minutes?: number | undefined;
            energy_required?: "low" | "medium" | "high" | undefined;
            reminder_at?: string | undefined;
            context_tags?: string[] | undefined;
            goal_ids?: string[] | undefined;
        }>;
        handler: (input: z.infer<typeof createTaskSchema>) => {
            success: boolean;
            task: Task;
        };
    };
    get_tasks: {
        description: string;
        inputSchema: z.ZodObject<{
            list_id: z.ZodOptional<z.ZodString>;
            include_completed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
            priority_tier: z.ZodOptional<z.ZodNumber>;
            due_before: z.ZodOptional<z.ZodString>;
            energy_required: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
        }, "strip", z.ZodTypeAny, {
            include_completed: boolean;
            priority_tier?: number | undefined;
            energy_required?: "low" | "medium" | "high" | undefined;
            list_id?: string | undefined;
            due_before?: string | undefined;
        }, {
            priority_tier?: number | undefined;
            energy_required?: "low" | "medium" | "high" | undefined;
            list_id?: string | undefined;
            include_completed?: boolean | undefined;
            due_before?: string | undefined;
        }>;
        handler: (input: z.infer<typeof getTasksSchema>) => {
            success: boolean;
            tasks: TaskWithGoals[];
            count: number;
        };
    };
    update_task: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
            notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            due_date: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            due_time: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            reminder_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            effort_score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            impact_score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            urgency_score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            importance_score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            priority_tier: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            priority_reasoning: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            estimated_minutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
            energy_required: z.ZodOptional<z.ZodNullable<z.ZodEnum<["low", "medium", "high"]>>>;
            context_tags: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString, "many">>>;
            position: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            priority_tier?: number | null | undefined;
            title?: string | undefined;
            notes?: string | null | undefined;
            due_date?: string | null | undefined;
            due_time?: string | null | undefined;
            priority_reasoning?: string | null | undefined;
            effort_score?: number | null | undefined;
            impact_score?: number | null | undefined;
            urgency_score?: number | null | undefined;
            importance_score?: number | null | undefined;
            estimated_minutes?: number | null | undefined;
            energy_required?: "low" | "medium" | "high" | null | undefined;
            reminder_at?: string | null | undefined;
            context_tags?: string[] | null | undefined;
            position?: number | undefined;
        }, {
            id: string;
            priority_tier?: number | null | undefined;
            title?: string | undefined;
            notes?: string | null | undefined;
            due_date?: string | null | undefined;
            due_time?: string | null | undefined;
            priority_reasoning?: string | null | undefined;
            effort_score?: number | null | undefined;
            impact_score?: number | null | undefined;
            urgency_score?: number | null | undefined;
            importance_score?: number | null | undefined;
            estimated_minutes?: number | null | undefined;
            energy_required?: "low" | "medium" | "high" | null | undefined;
            reminder_at?: string | null | undefined;
            context_tags?: string[] | null | undefined;
            position?: number | undefined;
        }>;
        handler: (input: z.infer<typeof updateTaskSchema>) => {
            success: boolean;
            error: string;
            task?: undefined;
        } | {
            success: boolean;
            task: Task;
            error?: undefined;
        };
    };
    delete_task: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        handler: (input: z.infer<typeof deleteTaskSchema>) => {
            success: boolean;
            error: string;
        } | {
            success: boolean;
            error?: undefined;
        };
    };
    complete_task: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        handler: (input: z.infer<typeof completeTaskSchema>) => {
            success: boolean;
            error: string;
            task?: undefined;
        } | {
            success: boolean;
            task: Task;
            error?: undefined;
        };
    };
    uncomplete_task: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        handler: (input: z.infer<typeof uncompleteTaskSchema>) => {
            success: boolean;
            error: string;
            task?: undefined;
        } | {
            success: boolean;
            task: Task;
            error?: undefined;
        };
    };
    move_task: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
            list_id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            list_id: string;
        }, {
            id: string;
            list_id: string;
        }>;
        handler: (input: z.infer<typeof moveTaskSchema>) => {
            success: boolean;
            error: string;
            task?: undefined;
        } | {
            success: boolean;
            task: Task;
            error?: undefined;
        };
    };
    bulk_create_tasks: {
        description: string;
        inputSchema: z.ZodObject<{
            list_id: z.ZodString;
            tasks: z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                notes: z.ZodOptional<z.ZodString>;
                effort_score: z.ZodOptional<z.ZodNumber>;
                impact_score: z.ZodOptional<z.ZodNumber>;
                urgency_score: z.ZodOptional<z.ZodNumber>;
                importance_score: z.ZodOptional<z.ZodNumber>;
                priority_tier: z.ZodOptional<z.ZodNumber>;
                priority_reasoning: z.ZodOptional<z.ZodString>;
                estimated_minutes: z.ZodOptional<z.ZodNumber>;
                energy_required: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
                due_date: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                title: string;
                priority_tier?: number | undefined;
                notes?: string | undefined;
                due_date?: string | undefined;
                priority_reasoning?: string | undefined;
                effort_score?: number | undefined;
                impact_score?: number | undefined;
                urgency_score?: number | undefined;
                importance_score?: number | undefined;
                estimated_minutes?: number | undefined;
                energy_required?: "low" | "medium" | "high" | undefined;
            }, {
                title: string;
                priority_tier?: number | undefined;
                notes?: string | undefined;
                due_date?: string | undefined;
                priority_reasoning?: string | undefined;
                effort_score?: number | undefined;
                impact_score?: number | undefined;
                urgency_score?: number | undefined;
                importance_score?: number | undefined;
                estimated_minutes?: number | undefined;
                energy_required?: "low" | "medium" | "high" | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            tasks: {
                title: string;
                priority_tier?: number | undefined;
                notes?: string | undefined;
                due_date?: string | undefined;
                priority_reasoning?: string | undefined;
                effort_score?: number | undefined;
                impact_score?: number | undefined;
                urgency_score?: number | undefined;
                importance_score?: number | undefined;
                estimated_minutes?: number | undefined;
                energy_required?: "low" | "medium" | "high" | undefined;
            }[];
            list_id: string;
        }, {
            tasks: {
                title: string;
                priority_tier?: number | undefined;
                notes?: string | undefined;
                due_date?: string | undefined;
                priority_reasoning?: string | undefined;
                effort_score?: number | undefined;
                impact_score?: number | undefined;
                urgency_score?: number | undefined;
                importance_score?: number | undefined;
                estimated_minutes?: number | undefined;
                energy_required?: "low" | "medium" | "high" | undefined;
            }[];
            list_id: string;
        }>;
        handler: (input: z.infer<typeof bulkCreateTasksSchema>) => {
            success: boolean;
            tasks: Task[];
            count: number;
        };
    };
};
//# sourceMappingURL=tasks.d.ts.map