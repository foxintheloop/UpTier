import type {
  ListWithCount,
  List,
  Task,
  TaskWithGoals,
  Goal,
  GoalWithProgress,
  Subtask,
  CreateListInput,
  UpdateListInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateGoalInput,
  GetTasksOptions,
} from '@uptier/shared';

export interface LogAPI {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, error?: Error | string, data?: Record<string, unknown>) => void;
}

export interface ElectronAPI {
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
  log: LogAPI;
  onDatabaseChanged: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
