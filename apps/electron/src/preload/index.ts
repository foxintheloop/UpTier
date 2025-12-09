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
  CreateTagInput,
  UpdateTagInput,
  GetTasksOptions,
} from '@uptier/shared';

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
  },

  // Goals
  goals: {
    getAll: (): Promise<Goal[]> => ipcRenderer.invoke('goals:getAll'),
    create: (input: CreateGoalInput): Promise<Goal> => ipcRenderer.invoke('goals:create', input),
    linkTasks: (goalId: string, taskIds: string[], strength?: number): Promise<void> =>
      ipcRenderer.invoke('goals:linkTasks', goalId, taskIds, strength ?? 3),
    getProgress: (goalId: string): Promise<GoalWithProgress | null> => ipcRenderer.invoke('goals:getProgress', goalId),
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
};

// Expose to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

const duration = (performance.now() - startTime).toFixed(2);
console.log(`[preload] Preload script initialized in ${duration}ms`);

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI;
