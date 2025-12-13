import { z } from 'zod';
import type { Subtask } from '@uptier/shared';
export declare const addSubtaskSchema: z.ZodObject<{
    task_id: z.ZodString;
    title: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    task_id: string;
}, {
    title: string;
    task_id: string;
}>;
export declare const updateSubtaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title?: string | undefined;
}, {
    id: string;
    title?: string | undefined;
}>;
export declare const deleteSubtaskSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const completeSubtaskSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const uncompleteSubtaskSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export declare const reorderSubtasksSchema: z.ZodObject<{
    task_id: z.ZodString;
    subtask_ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    task_id: string;
    subtask_ids: string[];
}, {
    task_id: string;
    subtask_ids: string[];
}>;
export declare const getSubtasksSchema: z.ZodObject<{
    task_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    task_id: string;
}, {
    task_id: string;
}>;
export declare function addSubtask(taskId: string, title: string): Subtask;
export declare function getSubtaskById(id: string): Subtask | null;
export declare function getSubtasksByTaskId(taskId: string): Subtask[];
export declare function updateSubtask(id: string, title: string): Subtask | null;
export declare function deleteSubtask(id: string): boolean;
export declare function completeSubtask(id: string): Subtask | null;
export declare function uncompleteSubtask(id: string): Subtask | null;
export declare function reorderSubtasks(taskId: string, subtaskIds: string[]): void;
export declare const subtaskTools: {
    add_subtask: {
        description: string;
        inputSchema: z.ZodObject<{
            task_id: z.ZodString;
            title: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            title: string;
            task_id: string;
        }, {
            title: string;
            task_id: string;
        }>;
        handler: (input: z.infer<typeof addSubtaskSchema>) => {
            success: boolean;
            subtask: Subtask;
        };
    };
    get_subtasks: {
        description: string;
        inputSchema: z.ZodObject<{
            task_id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            task_id: string;
        }, {
            task_id: string;
        }>;
        handler: (input: z.infer<typeof getSubtasksSchema>) => {
            success: boolean;
            subtasks: Subtask[];
        };
    };
    update_subtask: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
            title: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            title?: string | undefined;
        }, {
            id: string;
            title?: string | undefined;
        }>;
        handler: (input: z.infer<typeof updateSubtaskSchema>) => {
            success: boolean;
            error: string;
            subtask?: undefined;
        } | {
            success: boolean;
            subtask: Subtask;
            error?: undefined;
        };
    };
    delete_subtask: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        handler: (input: z.infer<typeof deleteSubtaskSchema>) => {
            success: boolean;
            error: string;
        } | {
            success: boolean;
            error?: undefined;
        };
    };
    complete_subtask: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        handler: (input: z.infer<typeof completeSubtaskSchema>) => {
            success: boolean;
            error: string;
            subtask?: undefined;
        } | {
            success: boolean;
            subtask: Subtask;
            error?: undefined;
        };
    };
    uncomplete_subtask: {
        description: string;
        inputSchema: z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>;
        handler: (input: z.infer<typeof uncompleteSubtaskSchema>) => {
            success: boolean;
            error: string;
            subtask?: undefined;
        } | {
            success: boolean;
            subtask: Subtask;
            error?: undefined;
        };
    };
    reorder_subtasks: {
        description: string;
        inputSchema: z.ZodObject<{
            task_id: z.ZodString;
            subtask_ids: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            task_id: string;
            subtask_ids: string[];
        }, {
            task_id: string;
            subtask_ids: string[];
        }>;
        handler: (input: z.infer<typeof reorderSubtasksSchema>) => {
            success: boolean;
        };
    };
};
//# sourceMappingURL=subtasks.d.ts.map