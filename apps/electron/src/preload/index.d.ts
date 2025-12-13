import type { ListWithCount, List, Task, TaskWithGoals, Goal, GoalWithProgress, Subtask, Tag, CreateListInput, UpdateListInput, CreateTaskInput, UpdateTaskInput, CreateGoalInput, CreateTagInput, UpdateTagInput, GetTasksOptions } from '@uptier/shared';
interface NotificationSettings {
    enabled: boolean;
    defaultReminderMinutes: number;
    snoozeDurationMinutes: number;
    soundEnabled: boolean;
}
interface AppSettings {
    theme: 'dark' | 'light' | 'system';
    notifications: NotificationSettings;
}
interface UpcomingNotification {
    taskId: string;
    title: string;
    reminderAt: string;
    listId: string;
}
interface ExportData {
    version: string;
    exportedAt: string;
    appVersion: string;
    data: {
        lists: unknown[];
        tasks: unknown[];
        goals: unknown[];
        subtasks: unknown[];
        tags: unknown[];
        task_goals: unknown[];
        task_tags: unknown[];
    };
    metadata: {
        listCount: number;
        taskCount: number;
        goalCount: number;
        subtaskCount: number;
        tagCount: number;
    };
}
interface ImportPreview {
    format: 'uptier' | 'todoist' | 'unknown';
    valid: boolean;
    error?: string;
    counts: {
        lists: number;
        tasks: number;
        goals: number;
        subtasks: number;
        tags: number;
    };
}
interface ImportResult {
    success: boolean;
    error?: string;
    imported: {
        lists: number;
        tasks: number;
        goals: number;
        subtasks: number;
        tags: number;
    };
}
interface DatabaseProfile {
    id: string;
    name: string;
    path: string;
    color: string;
    icon: string;
    createdAt: string;
}
interface CreateProfileInput {
    name: string;
    color?: string;
    icon?: string;
}
interface SwitchDatabaseResult {
    success: boolean;
    error?: string;
}
interface DueDateSuggestion {
    suggestedDate: string;
    confidence: number;
    reasoning: string;
    basedOn: string[];
}
interface SubtaskSuggestion {
    title: string;
    estimatedMinutes?: number;
}
interface BreakdownSuggestion {
    subtasks: SubtaskSuggestion[];
    totalEstimatedMinutes: number;
    reasoning: string;
}
interface TaskSuggestions {
    dueDate?: DueDateSuggestion;
    breakdown?: BreakdownSuggestion;
}
declare const electronAPI: {
    lists: {
        getAll: () => Promise<ListWithCount[]>;
        create: (input: CreateListInput) => Promise<List>;
        update: (id: string, input: UpdateListInput) => Promise<List | null>;
        delete: (id: string) => Promise<boolean>;
    };
    tasks: {
        getByList: (options: GetTasksOptions) => Promise<TaskWithGoals[]>;
        create: (input: CreateTaskInput) => Promise<Task>;
        update: (id: string, input: UpdateTaskInput) => Promise<Task | null>;
        delete: (id: string) => Promise<boolean>;
        complete: (id: string) => Promise<Task | null>;
        uncomplete: (id: string) => Promise<Task | null>;
        reorder: (listId: string, taskIds: string[]) => Promise<void>;
        addTag: (taskId: string, tagId: string) => Promise<boolean>;
        removeTag: (taskId: string, tagId: string) => Promise<boolean>;
        getTags: (taskId: string) => Promise<Tag[]>;
    };
    goals: {
        getAll: () => Promise<Goal[]>;
        create: (input: CreateGoalInput) => Promise<Goal>;
        linkTasks: (goalId: string, taskIds: string[], strength?: number) => Promise<void>;
        getProgress: (goalId: string) => Promise<GoalWithProgress | null>;
    };
    subtasks: {
        getByTask: (taskId: string) => Promise<Subtask[]>;
        add: (taskId: string, title: string) => Promise<Subtask>;
        complete: (id: string) => Promise<Subtask | null>;
        uncomplete: (id: string) => Promise<Subtask | null>;
        delete: (id: string) => Promise<boolean>;
    };
    tags: {
        getAll: () => Promise<Tag[]>;
        create: (input: CreateTagInput) => Promise<Tag>;
        update: (id: string, input: UpdateTagInput) => Promise<Tag | null>;
        delete: (id: string) => Promise<boolean>;
    };
    settings: {
        get: () => Promise<AppSettings>;
        set: (settings: Partial<AppSettings>) => Promise<AppSettings>;
        getEffectiveTheme: () => Promise<"dark" | "light">;
    };
    notifications: {
        getUpcoming: (limit?: number) => Promise<UpcomingNotification[]>;
        snooze: (taskId: string) => Promise<boolean>;
        dismiss: (taskId: string) => Promise<boolean>;
        getPendingCount: () => Promise<number>;
        setReminderFromDueDate: (taskId: string, dueDate: string, dueTime?: string | null) => Promise<boolean>;
    };
    exportImport: {
        exportJson: () => Promise<ExportData>;
        exportCsv: () => Promise<string>;
        exportToFile: (format: "json" | "csv") => Promise<{
            success: boolean;
            filePath?: string;
        }>;
        selectImportFile: () => Promise<string | null>;
        previewImport: (filePath: string) => Promise<ImportPreview>;
        executeImport: (filePath: string, options: {
            mode: "merge" | "replace";
        }) => Promise<ImportResult>;
    };
    database: {
        getProfiles: () => Promise<DatabaseProfile[]>;
        getActiveProfile: () => Promise<DatabaseProfile>;
        create: (input: CreateProfileInput) => Promise<DatabaseProfile>;
        update: (id: string, updates: Partial<Pick<DatabaseProfile, "name" | "color" | "icon">>) => Promise<DatabaseProfile | null>;
        delete: (id: string) => Promise<boolean>;
        switch: (profileId: string) => Promise<SwitchDatabaseResult>;
        getCurrentPath: () => Promise<string>;
    };
    suggestions: {
        getDueDate: (taskId: string) => Promise<DueDateSuggestion | null>;
        getBreakdown: (taskId: string) => Promise<BreakdownSuggestion | null>;
        getAll: (taskId: string) => Promise<TaskSuggestions>;
    };
    log: {
        debug: (message: string, data?: Record<string, unknown>) => void;
        info: (message: string, data?: Record<string, unknown>) => void;
        warn: (message: string, data?: Record<string, unknown>) => void;
        error: (message: string, error?: Error | string, data?: Record<string, unknown>) => void;
    };
    onDatabaseChanged: (callback: () => void) => (() => void);
    onNavigateToTask: (callback: (taskId: string) => void) => (() => void);
};
export type ElectronAPI = typeof electronAPI;
export {};
//# sourceMappingURL=index.d.ts.map