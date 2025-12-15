import { contextBridge, ipcRenderer } from 'electron';
import type {
  ListWithCount,
  List,
  Task,
  TaskWithGoals,
  Goal,
  GoalWithProgress,
  Subtask,
  Tag,
  CreateListInput,
  UpdateListInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateGoalInput,
  UpdateGoalInput,
  CreateTagInput,
  UpdateTagInput,
  GetTasksOptions,
} from '@uptier/shared';

// Types for settings and notifications
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

// Export/Import types
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

// Database profile types
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

// AI Suggestions types
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

// Log preload initialization
console.log('[preload] Preload script initializing...');
const startTime = performance.now();

// Define the API exposed to the renderer
const electronAPI = {
  // Lists
  lists: {
    getAll: (): Promise<ListWithCount[]> => ipcRenderer.invoke('lists:getAll'),
    create: (input: CreateListInput): Promise<List> => ipcRenderer.invoke('lists:create', input),
    update: (id: string, input: UpdateListInput): Promise<List | null> => ipcRenderer.invoke('lists:update', id, input),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('lists:delete', id),
  },

  // Tasks
  tasks: {
    getByList: (options: GetTasksOptions): Promise<TaskWithGoals[]> => ipcRenderer.invoke('tasks:getByList', options),
    create: (input: CreateTaskInput): Promise<Task> => ipcRenderer.invoke('tasks:create', input),
    update: (id: string, input: UpdateTaskInput): Promise<Task | null> => ipcRenderer.invoke('tasks:update', id, input),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('tasks:delete', id),
    complete: (id: string): Promise<Task | null> => ipcRenderer.invoke('tasks:complete', id),
    uncomplete: (id: string): Promise<Task | null> => ipcRenderer.invoke('tasks:uncomplete', id),
    reorder: (listId: string, taskIds: string[]): Promise<void> => ipcRenderer.invoke('tasks:reorder', listId, taskIds),
    addTag: (taskId: string, tagId: string): Promise<boolean> => ipcRenderer.invoke('tasks:addTag', taskId, tagId),
    removeTag: (taskId: string, tagId: string): Promise<boolean> => ipcRenderer.invoke('tasks:removeTag', taskId, tagId),
    getTags: (taskId: string): Promise<Tag[]> => ipcRenderer.invoke('tasks:getTags', taskId),
    addGoal: (taskId: string, goalId: string, strength?: number): Promise<boolean> =>
      ipcRenderer.invoke('tasks:addGoal', taskId, goalId, strength),
    removeGoal: (taskId: string, goalId: string): Promise<boolean> =>
      ipcRenderer.invoke('tasks:removeGoal', taskId, goalId),
  },

  // Goals
  goals: {
    getAll: (): Promise<Goal[]> => ipcRenderer.invoke('goals:getAll'),
    getAllWithProgress: (): Promise<GoalWithProgress[]> => ipcRenderer.invoke('goals:getAllWithProgress'),
    create: (input: CreateGoalInput): Promise<Goal> => ipcRenderer.invoke('goals:create', input),
    update: (id: string, input: UpdateGoalInput): Promise<Goal | null> =>
      ipcRenderer.invoke('goals:update', id, input),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('goals:delete', id),
    linkTasks: (goalId: string, taskIds: string[], strength?: number): Promise<void> =>
      ipcRenderer.invoke('goals:linkTasks', goalId, taskIds, strength ?? 3),
    getProgress: (goalId: string): Promise<GoalWithProgress | null> => ipcRenderer.invoke('goals:getProgress', goalId),
    getTasks: (goalId: string): Promise<TaskWithGoals[]> => ipcRenderer.invoke('goals:getTasks', goalId),
  },

  // Subtasks
  subtasks: {
    getByTask: (taskId: string): Promise<Subtask[]> => ipcRenderer.invoke('subtasks:getByTask', taskId),
    add: (taskId: string, title: string): Promise<Subtask> => ipcRenderer.invoke('subtasks:add', taskId, title),
    complete: (id: string): Promise<Subtask | null> => ipcRenderer.invoke('subtasks:complete', id),
    uncomplete: (id: string): Promise<Subtask | null> => ipcRenderer.invoke('subtasks:uncomplete', id),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('subtasks:delete', id),
  },

  // Tags
  tags: {
    getAll: (): Promise<Tag[]> => ipcRenderer.invoke('tags:getAll'),
    create: (input: CreateTagInput): Promise<Tag> => ipcRenderer.invoke('tags:create', input),
    update: (id: string, input: UpdateTagInput): Promise<Tag | null> => ipcRenderer.invoke('tags:update', id, input),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('tags:delete', id),
  },

  // Settings
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    set: (settings: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:set', settings),
    getEffectiveTheme: (): Promise<'dark' | 'light'> => ipcRenderer.invoke('settings:getEffectiveTheme'),
  },

  // Notifications
  notifications: {
    getUpcoming: (limit?: number): Promise<UpcomingNotification[]> =>
      ipcRenderer.invoke('notifications:getUpcoming', limit),
    snooze: (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('notifications:snooze', taskId),
    dismiss: (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('notifications:dismiss', taskId),
    getPendingCount: (): Promise<number> =>
      ipcRenderer.invoke('notifications:getPendingCount'),
    setReminderFromDueDate: (taskId: string, dueDate: string, dueTime?: string | null): Promise<boolean> =>
      ipcRenderer.invoke('notifications:setReminderFromDueDate', taskId, dueDate, dueTime),
  },

  // Export/Import
  exportImport: {
    exportJson: (): Promise<ExportData> =>
      ipcRenderer.invoke('export:json'),
    exportCsv: (): Promise<string> =>
      ipcRenderer.invoke('export:csv'),
    exportToFile: (format: 'json' | 'csv'): Promise<{ success: boolean; filePath?: string }> =>
      ipcRenderer.invoke('export:toFile', format),
    selectImportFile: (): Promise<string | null> =>
      ipcRenderer.invoke('import:selectFile'),
    previewImport: (filePath: string): Promise<ImportPreview> =>
      ipcRenderer.invoke('import:preview', filePath),
    executeImport: (filePath: string, options: { mode: 'merge' | 'replace' }): Promise<ImportResult> =>
      ipcRenderer.invoke('import:execute', filePath, options),
  },

  // Database Profiles
  database: {
    getProfiles: (): Promise<DatabaseProfile[]> =>
      ipcRenderer.invoke('database:getProfiles'),
    getActiveProfile: (): Promise<DatabaseProfile> =>
      ipcRenderer.invoke('database:getActiveProfile'),
    create: (input: CreateProfileInput): Promise<DatabaseProfile> =>
      ipcRenderer.invoke('database:create', input),
    update: (id: string, updates: Partial<Pick<DatabaseProfile, 'name' | 'color' | 'icon'>>): Promise<DatabaseProfile | null> =>
      ipcRenderer.invoke('database:update', id, updates),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('database:delete', id),
    switch: (profileId: string): Promise<SwitchDatabaseResult> =>
      ipcRenderer.invoke('database:switch', profileId),
    getCurrentPath: (): Promise<string> =>
      ipcRenderer.invoke('database:getCurrentPath'),
  },

  // AI Suggestions
  suggestions: {
    getDueDate: (taskId: string): Promise<DueDateSuggestion | null> =>
      ipcRenderer.invoke('suggestions:getDueDate', taskId),
    getBreakdown: (taskId: string): Promise<BreakdownSuggestion | null> =>
      ipcRenderer.invoke('suggestions:getBreakdown', taskId),
    getAll: (taskId: string): Promise<TaskSuggestions> =>
      ipcRenderer.invoke('suggestions:getAll', taskId),
  },

  // Logging API for renderer
  log: {
    debug: (message: string, data?: Record<string, unknown>) =>
      ipcRenderer.send('log:renderer', 'debug', message, data),
    info: (message: string, data?: Record<string, unknown>) =>
      ipcRenderer.send('log:renderer', 'info', message, data),
    warn: (message: string, data?: Record<string, unknown>) =>
      ipcRenderer.send('log:renderer', 'warn', message, data),
    error: (message: string, error?: Error | string, data?: Record<string, unknown>) => {
      const errorData =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error
            ? { message: error }
            : {};
      ipcRenderer.send('log:renderer', 'error', message, { ...errorData, ...data });
    },
  },

  // Database change listener
  onDatabaseChanged: (callback: () => void): (() => void) => {
    const handler = () => {
      console.log('[preload] Database changed event received');
      callback();
    };
    ipcRenderer.on('database-changed', handler);
    return () => {
      ipcRenderer.removeListener('database-changed', handler);
    };
  },

  // Navigate to task listener (from notification clicks)
  onNavigateToTask: (callback: (taskId: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, taskId: string) => {
      console.log('[preload] Navigate to task event received', { taskId });
      callback(taskId);
    };
    ipcRenderer.on('navigate-to-task', handler);
    return () => {
      ipcRenderer.removeListener('navigate-to-task', handler);
    };
  },
};

// Expose to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

const duration = (performance.now() - startTime).toFixed(2);
console.log(`[preload] Preload script initialized in ${duration}ms`);

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI;
