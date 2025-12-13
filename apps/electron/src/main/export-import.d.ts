import type { List, Task, Goal, Subtask, Tag } from '@uptier/shared';
interface TaskGoalRelation {
    task_id: string;
    goal_id: string;
    alignment_strength: number;
}
interface TaskTagRelation {
    task_id: string;
    tag_id: string;
}
export interface UpTierExport {
    version: string;
    exportedAt: string;
    appVersion: string;
    data: {
        lists: List[];
        tasks: Task[];
        goals: Goal[];
        subtasks: Subtask[];
        tags: Tag[];
        task_goals: TaskGoalRelation[];
        task_tags: TaskTagRelation[];
    };
    metadata: {
        listCount: number;
        taskCount: number;
        goalCount: number;
        subtaskCount: number;
        tagCount: number;
    };
}
export interface ImportPreview {
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
export interface ImportResult {
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
/**
 * Export all data to JSON format
 */
export declare function exportToJson(): UpTierExport;
/**
 * Export tasks to CSV format (flattened)
 */
export declare function exportToCsv(): string;
/**
 * Export to file with save dialog
 */
export declare function exportToFile(format: 'json' | 'csv'): Promise<{
    success: boolean;
    filePath?: string;
}>;
/**
 * Preview import file before committing
 */
export declare function previewImport(filePath: string): Promise<ImportPreview>;
/**
 * Execute import
 */
export declare function executeImport(filePath: string, options?: {
    mode: 'merge' | 'replace';
}): Promise<ImportResult>;
/**
 * Show open dialog for import
 */
export declare function selectImportFile(): Promise<string | null>;
export {};
//# sourceMappingURL=export-import.d.ts.map