import { z } from 'zod';
import { getDb, generateId, nowISO } from '../database.js';
import type {
  Task,
  TaskWithGoals,
  CreateTaskInput,
  UpdateTaskInput,
  GetTasksOptions,
  EnergyLevel,
  Tag,
} from '@uptier/shared';

// ============================================================================
// Schemas
// ============================================================================

export const createTaskSchema = z.object({
  list_id: z.string().describe('ID of the list to add the task to'),
  title: z.string().min(1).describe('Task title'),
  notes: z.string().optional().describe('Additional notes'),
  due_date: z.string().optional().describe('Due date (YYYY-MM-DD)'),
  due_time: z.string().optional().describe('Due time (HH:MM)'),
  reminder_at: z.string().optional().describe('Reminder datetime (ISO format)'),
  effort_score: z.number().min(1).max(5).optional().describe('Effort score (1-5)'),
  impact_score: z.number().min(1).max(5).optional().describe('Impact score (1-5)'),
  urgency_score: z.number().min(1).max(5).optional().describe('Urgency score (1-5)'),
  importance_score: z.number().min(1).max(5).optional().describe('Importance score (1-5)'),
  priority_tier: z.number().min(1).max(3).optional().describe('Priority tier (1=Do Now, 2=Do Soon, 3=Backlog)'),
  priority_reasoning: z.string().optional().describe('Explanation for priority'),
  estimated_minutes: z.number().optional().describe('Estimated time in minutes'),
  energy_required: z.enum(['low', 'medium', 'high']).optional().describe('Energy level required'),
  context_tags: z.array(z.string()).optional().describe('Context tags'),
  goal_ids: z.array(z.string()).optional().describe('Goal IDs to link'),
  add_to_my_day: z.boolean().optional().describe('Add to My Day smart list (sets due_date to today if not already set)'),
  mark_important: z.boolean().optional().describe('Mark as important (sets priority_tier to 1 if not already set)'),
});

export const updateTaskSchema = z.object({
  id: z.string().describe('Task ID to update'),
  title: z.string().optional(),
  notes: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  due_time: z.string().nullable().optional(),
  reminder_at: z.string().nullable().optional(),
  effort_score: z.number().min(1).max(5).nullable().optional(),
  impact_score: z.number().min(1).max(5).nullable().optional(),
  urgency_score: z.number().min(1).max(5).nullable().optional(),
  importance_score: z.number().min(1).max(5).nullable().optional(),
  priority_tier: z.number().min(1).max(3).nullable().optional(),
  priority_reasoning: z.string().nullable().optional(),
  estimated_minutes: z.number().nullable().optional(),
  energy_required: z.enum(['low', 'medium', 'high']).nullable().optional(),
  context_tags: z.array(z.string()).nullable().optional(),
  position: z.number().optional(),
});

export const getTasksSchema = z.object({
  list_id: z.string().optional().describe('Filter by list ID'),
  include_completed: z.boolean().optional().default(false).describe('Include completed tasks'),
  priority_tier: z.number().min(1).max(3).optional().describe('Filter by priority tier'),
  due_before: z.string().optional().describe('Filter tasks due before this date (YYYY-MM-DD)'),
  energy_required: z.enum(['low', 'medium', 'high']).optional().describe('Filter by energy level'),
});

export const deleteTaskSchema = z.object({
  id: z.string().describe('Task ID to delete'),
});

export const completeTaskSchema = z.object({
  id: z.string().describe('Task ID to complete'),
});

export const uncompleteTaskSchema = z.object({
  id: z.string().describe('Task ID to uncomplete'),
});

export const moveTaskSchema = z.object({
  id: z.string().describe('Task ID to move'),
  list_id: z.string().describe('Target list ID'),
});

export const bulkCreateTasksSchema = z.object({
  list_id: z.string().describe('List ID to add tasks to'),
  tasks: z.array(z.object({
    title: z.string().min(1),
    notes: z.string().optional(),
    effort_score: z.number().min(1).max(5).optional(),
    impact_score: z.number().min(1).max(5).optional(),
    urgency_score: z.number().min(1).max(5).optional(),
    importance_score: z.number().min(1).max(5).optional(),
    priority_tier: z.number().min(1).max(3).optional(),
    priority_reasoning: z.string().optional(),
    estimated_minutes: z.number().optional(),
    energy_required: z.enum(['low', 'medium', 'high']).optional(),
    due_date: z.string().optional(),
  })).describe('Array of tasks to create'),
  add_to_my_day: z.boolean().optional().describe('Add all tasks to My Day smart list (sets due_date to today if not already set)'),
  mark_important: z.boolean().optional().describe('Mark all tasks as important (sets priority_tier to 1 if not already set)'),
});

// ============================================================================
// Tool Implementations
// ============================================================================

function rowToTask(row: Record<string, unknown>): Task {
  return {
    ...row,
    completed: Boolean(row.completed),
    context_tags: row.context_tags as string | null,
  } as Task;
}

export function createTask(input: CreateTaskInput): Task {
  const db = getDb();
  const id = generateId();
  const now = nowISO();

  // Get next position in list
  const maxPos = db.prepare('SELECT MAX(position) as max FROM tasks WHERE list_id = ?').get(input.list_id) as { max: number | null };
  const position = (maxPos.max ?? -1) + 1;

  const stmt = db.prepare(`
    INSERT INTO tasks (
      id, list_id, title, notes, due_date, due_time, reminder_at,
      completed, position,
      effort_score, impact_score, urgency_score, importance_score,
      priority_tier, priority_reasoning,
      estimated_minutes, energy_required, context_tags,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.list_id,
    input.title,
    input.notes ?? null,
    input.due_date ?? null,
    input.due_time ?? null,
    input.reminder_at ?? null,
    position,
    input.effort_score ?? null,
    input.impact_score ?? null,
    input.urgency_score ?? null,
    input.importance_score ?? null,
    input.priority_tier ?? null,
    input.priority_reasoning ?? null,
    input.estimated_minutes ?? null,
    input.energy_required ?? null,
    input.context_tags ? JSON.stringify(input.context_tags) : null,
    now,
    now
  );

  // Link to goals if provided
  if (input.goal_ids && input.goal_ids.length > 0) {
    const linkStmt = db.prepare('INSERT INTO task_goals (task_id, goal_id, alignment_strength) VALUES (?, ?, 3)');
    for (const goalId of input.goal_ids) {
      linkStmt.run(id, goalId);
    }
  }

  return getTaskById(id)!;
}

export function getTaskById(id: string): Task | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!row) return null;
  return rowToTask(row as Record<string, unknown>);
}

export function getTasks(options: GetTasksOptions = {}): TaskWithGoals[] {
  const db = getDb();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.list_id) {
    conditions.push('t.list_id = ?');
    params.push(options.list_id);
  }

  if (!options.include_completed) {
    conditions.push('t.completed = 0');
  }

  if (options.priority_tier) {
    conditions.push('t.priority_tier = ?');
    params.push(options.priority_tier);
  }

  if (options.due_before) {
    conditions.push('t.due_date <= ?');
    params.push(options.due_before);
  }

  if (options.energy_required) {
    conditions.push('t.energy_required = ?');
    params.push(options.energy_required);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT t.*
    FROM tasks t
    ${whereClause}
    ORDER BY t.priority_tier ASC NULLS LAST, t.position ASC
  `;

  const tasks = db.prepare(query).all(...params) as Array<Record<string, unknown>>;

  // Get goals for each task
  const goalQuery = db.prepare(`
    SELECT tg.task_id, tg.goal_id, g.name as goal_name, tg.alignment_strength
    FROM task_goals tg
    JOIN goals g ON g.id = tg.goal_id
    WHERE tg.task_id = ?
  `);

  // Get tags for each task
  const tagQuery = db.prepare(`
    SELECT t.id, t.name, t.color
    FROM tags t
    JOIN task_tags tt ON tt.tag_id = t.id
    WHERE tt.task_id = ?
  `);

  return tasks.map((task) => {
    const goals = goalQuery.all(task.id) as Array<{
      task_id: string;
      goal_id: string;
      goal_name: string;
      alignment_strength: number;
    }>;
    const tags = tagQuery.all(task.id) as Tag[];

    return {
      ...rowToTask(task),
      goals: goals.map((g) => ({
        goal_id: g.goal_id,
        goal_name: g.goal_name,
        alignment_strength: g.alignment_strength,
      })),
      tags,
    };
  });
}

export function updateTask(id: string, input: UpdateTaskInput): Task | null {
  const db = getDb();

  const existing = getTaskById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: unknown[] = [];

  const fields: Array<[keyof UpdateTaskInput, string]> = [
    ['title', 'title'],
    ['notes', 'notes'],
    ['due_date', 'due_date'],
    ['due_time', 'due_time'],
    ['reminder_at', 'reminder_at'],
    ['effort_score', 'effort_score'],
    ['impact_score', 'impact_score'],
    ['urgency_score', 'urgency_score'],
    ['importance_score', 'importance_score'],
    ['priority_tier', 'priority_tier'],
    ['priority_reasoning', 'priority_reasoning'],
    ['estimated_minutes', 'estimated_minutes'],
    ['energy_required', 'energy_required'],
    ['position', 'position'],
  ];

  for (const [inputKey, dbColumn] of fields) {
    if (input[inputKey] !== undefined) {
      updates.push(`${dbColumn} = ?`);
      values.push(input[inputKey]);
    }
  }

  if (input.context_tags !== undefined) {
    updates.push('context_tags = ?');
    values.push(input.context_tags ? JSON.stringify(input.context_tags) : null);
  }

  if (updates.length === 0) {
    return existing;
  }

  values.push(id);
  const stmt = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getTaskById(id);
}

export function deleteTask(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function completeTask(id: string): Task | null {
  const db = getDb();
  const now = nowISO();

  db.prepare('UPDATE tasks SET completed = 1, completed_at = ? WHERE id = ?').run(now, id);
  return getTaskById(id);
}

export function uncompleteTask(id: string): Task | null {
  const db = getDb();

  db.prepare('UPDATE tasks SET completed = 0, completed_at = NULL WHERE id = ?').run(id);
  return getTaskById(id);
}

export function moveTask(id: string, listId: string): Task | null {
  const db = getDb();

  // Get next position in target list
  const maxPos = db.prepare('SELECT MAX(position) as max FROM tasks WHERE list_id = ?').get(listId) as { max: number | null };
  const position = (maxPos.max ?? -1) + 1;

  db.prepare('UPDATE tasks SET list_id = ?, position = ? WHERE id = ?').run(listId, position, id);
  return getTaskById(id);
}

export function bulkCreateTasks(listId: string, tasks: Array<{
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
}>): Task[] {
  const db = getDb();
  const now = nowISO();

  // Get starting position
  const maxPos = db.prepare('SELECT MAX(position) as max FROM tasks WHERE list_id = ?').get(listId) as { max: number | null };
  let position = (maxPos.max ?? -1) + 1;

  const stmt = db.prepare(`
    INSERT INTO tasks (
      id, list_id, title, notes, due_date,
      completed, position,
      effort_score, impact_score, urgency_score, importance_score,
      priority_tier, priority_reasoning,
      estimated_minutes, energy_required,
      created_at, updated_at, prioritized_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const createdIds: string[] = [];

  const transaction = db.transaction(() => {
    for (const task of tasks) {
      const id = generateId();
      const hasPriority = task.priority_tier || task.effort_score || task.impact_score;

      stmt.run(
        id,
        listId,
        task.title,
        task.notes ?? null,
        task.due_date ?? null,
        position++,
        task.effort_score ?? null,
        task.impact_score ?? null,
        task.urgency_score ?? null,
        task.importance_score ?? null,
        task.priority_tier ?? null,
        task.priority_reasoning ?? null,
        task.estimated_minutes ?? null,
        task.energy_required ?? null,
        now,
        now,
        hasPriority ? now : null
      );

      createdIds.push(id);
    }
  });

  transaction();

  return createdIds.map((id) => getTaskById(id)!);
}

// ============================================================================
// Tool Definitions for MCP
// ============================================================================

// Helper to get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export const taskTools = {
  create_task: {
    description: `Create a new task in a list. For smart lists:
- "My Day": Set add_to_my_day=true (sets due_date to today)
- "Important": Set mark_important=true (sets priority_tier to 1)
The task still needs a list_id for storage in a regular list.`,
    inputSchema: createTaskSchema,
    handler: (input: z.infer<typeof createTaskSchema>) => {
      // Apply smart list transformations
      const taskInput = { ...input } as CreateTaskInput & { add_to_my_day?: boolean; mark_important?: boolean };

      // If add_to_my_day is true, set due_date to today
      if (taskInput.add_to_my_day && !taskInput.due_date) {
        taskInput.due_date = getTodayDate();
      }

      // If mark_important is true, set priority_tier to 1
      if (taskInput.mark_important && !taskInput.priority_tier) {
        taskInput.priority_tier = 1;
      }

      // Remove the smart list flags before passing to createTask
      delete taskInput.add_to_my_day;
      delete taskInput.mark_important;

      const task = createTask(taskInput as CreateTaskInput);
      return { success: true, task };
    },
  },

  get_tasks: {
    description: 'Get tasks with optional filters. Returns tasks ordered by priority tier and position.',
    inputSchema: getTasksSchema,
    handler: (input: z.infer<typeof getTasksSchema>) => {
      const tasks = getTasks(input as GetTasksOptions);
      return { success: true, tasks, count: tasks.length };
    },
  },

  update_task: {
    description: 'Update a task',
    inputSchema: updateTaskSchema,
    handler: (input: z.infer<typeof updateTaskSchema>) => {
      const { id, ...updates } = input;
      const task = updateTask(id, updates as UpdateTaskInput);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }
      return { success: true, task };
    },
  },

  delete_task: {
    description: 'Delete a task',
    inputSchema: deleteTaskSchema,
    handler: (input: z.infer<typeof deleteTaskSchema>) => {
      const deleted = deleteTask(input.id);
      if (!deleted) {
        return { success: false, error: 'Task not found' };
      }
      return { success: true };
    },
  },

  complete_task: {
    description: 'Mark a task as completed',
    inputSchema: completeTaskSchema,
    handler: (input: z.infer<typeof completeTaskSchema>) => {
      const task = completeTask(input.id);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }
      return { success: true, task };
    },
  },

  uncomplete_task: {
    description: 'Mark a task as not completed',
    inputSchema: uncompleteTaskSchema,
    handler: (input: z.infer<typeof uncompleteTaskSchema>) => {
      const task = uncompleteTask(input.id);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }
      return { success: true, task };
    },
  },

  move_task: {
    description: 'Move a task to a different list',
    inputSchema: moveTaskSchema,
    handler: (input: z.infer<typeof moveTaskSchema>) => {
      const task = moveTask(input.id, input.list_id);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }
      return { success: true, task };
    },
  },

  bulk_create_tasks: {
    description: `Create multiple tasks at once in a list. For smart lists:
- "My Day": Set add_to_my_day=true (sets due_date to today for all tasks)
- "Important": Set mark_important=true (sets priority_tier to 1 for all tasks)
The tasks still need a list_id for storage in a regular list.`,
    inputSchema: bulkCreateTasksSchema,
    handler: (input: z.infer<typeof bulkCreateTasksSchema>) => {
      // Apply smart list transformations to each task
      const transformedTasks = input.tasks.map(task => {
        const transformed = { ...task };

        // If add_to_my_day is true, set due_date to today
        if (input.add_to_my_day && !transformed.due_date) {
          transformed.due_date = getTodayDate();
        }

        // If mark_important is true, set priority_tier to 1
        if (input.mark_important && !transformed.priority_tier) {
          transformed.priority_tier = 1;
        }

        return transformed;
      });

      const tasks = bulkCreateTasks(input.list_id, transformedTasks);
      return { success: true, tasks, count: tasks.length };
    },
  },
};
