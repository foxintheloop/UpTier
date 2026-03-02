import { z } from 'zod';
import { getDb, generateId, nowISO } from '../database.js';
import { notifyChange } from '../changelog.js';
import { updateTask } from './tasks.js';
import type { Subtask } from '@uptier/shared';

// ============================================================================
// Schemas
// ============================================================================

export const addSubtaskSchema = z.object({
  task_id: z.string().describe('Parent task ID'),
  title: z.string().min(1).describe('Subtask title'),
});

export const updateSubtaskSchema = z.object({
  id: z.string().describe('Subtask ID to update'),
  title: z.string().optional().describe('New title'),
});

export const deleteSubtaskSchema = z.object({
  id: z.string().describe('Subtask ID to delete'),
});

export const completeSubtaskSchema = z.object({
  id: z.string().describe('Subtask ID to complete'),
});

export const uncompleteSubtaskSchema = z.object({
  id: z.string().describe('Subtask ID to uncomplete'),
});

export const reorderSubtasksSchema = z.object({
  task_id: z.string().describe('Parent task ID'),
  subtask_ids: z.array(z.string()).describe('Subtask IDs in desired order'),
});

export const decomposeTaskSchema = z.object({
  task_id: z.string().describe('The task to decompose into subtasks'),
  subtasks: z.array(z.object({
    title: z.string().describe('Subtask title'),
    estimated_minutes: z.number().optional().describe('Estimated duration in minutes'),
  })).min(1).describe('Subtasks to create. Claude should analyze the task and generate appropriate subtasks.'),
});

export const getSubtasksSchema = z.object({
  task_id: z.string().describe('Parent task ID'),
});

// ============================================================================
// Tool Implementations
// ============================================================================

function rowToSubtask(row: Record<string, unknown>): Subtask {
  return {
    ...row,
    completed: Boolean(row.completed),
  } as Subtask;
}

export function addSubtask(taskId: string, title: string): Subtask {
  const db = getDb();
  const id = generateId();
  const now = nowISO();

  // Get next position
  const maxPos = db.prepare('SELECT MAX(position) as max FROM subtasks WHERE task_id = ?').get(taskId) as { max: number | null };
  const position = (maxPos.max ?? -1) + 1;

  db.prepare(`
    INSERT INTO subtasks (id, task_id, title, completed, position, created_at)
    VALUES (?, ?, ?, 0, ?, ?)
  `).run(id, taskId, title, position, now);

  return getSubtaskById(id)!;
}

export function getSubtaskById(id: string): Subtask | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
  if (!row) return null;
  return rowToSubtask(row as Record<string, unknown>);
}

export function getSubtasksByTaskId(taskId: string): Subtask[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position').all(taskId);
  return rows.map((row) => rowToSubtask(row as Record<string, unknown>));
}

export function updateSubtask(id: string, title: string): Subtask | null {
  const db = getDb();
  db.prepare('UPDATE subtasks SET title = ? WHERE id = ?').run(title, id);
  return getSubtaskById(id);
}

export function deleteSubtask(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function completeSubtask(id: string): Subtask | null {
  const db = getDb();
  db.prepare('UPDATE subtasks SET completed = 1 WHERE id = ?').run(id);
  return getSubtaskById(id);
}

export function uncompleteSubtask(id: string): Subtask | null {
  const db = getDb();
  db.prepare('UPDATE subtasks SET completed = 0 WHERE id = ?').run(id);
  return getSubtaskById(id);
}

export function reorderSubtasks(taskId: string, subtaskIds: string[]): void {
  const db = getDb();

  const updateStmt = db.prepare('UPDATE subtasks SET position = ? WHERE id = ? AND task_id = ?');

  const transaction = db.transaction(() => {
    subtaskIds.forEach((id, index) => {
      updateStmt.run(index, id, taskId);
    });
  });

  transaction();
}

// ============================================================================
// Tool Definitions for MCP
// ============================================================================

export const subtaskTools = {
  add_subtask: {
    description: 'Add a subtask (checklist item) to a task',
    inputSchema: addSubtaskSchema,
    handler: (input: z.infer<typeof addSubtaskSchema>) => {
      const subtask = addSubtask(input.task_id, input.title);
      notifyChange('subtask', 'create', subtask.id);
      return { success: true, subtask };
    },
  },

  get_subtasks: {
    description: 'Get all subtasks for a task',
    inputSchema: getSubtasksSchema,
    handler: (input: z.infer<typeof getSubtasksSchema>) => {
      const subtasks = getSubtasksByTaskId(input.task_id);
      return { success: true, subtasks };
    },
  },

  update_subtask: {
    description: 'Update a subtask title',
    inputSchema: updateSubtaskSchema,
    handler: (input: z.infer<typeof updateSubtaskSchema>) => {
      if (!input.title) {
        return { success: false, error: 'Title is required' };
      }
      const subtask = updateSubtask(input.id, input.title);
      if (!subtask) {
        return { success: false, error: 'Subtask not found' };
      }
      notifyChange('subtask', 'update', input.id);
      return { success: true, subtask };
    },
  },

  delete_subtask: {
    description: 'Delete a subtask',
    inputSchema: deleteSubtaskSchema,
    handler: (input: z.infer<typeof deleteSubtaskSchema>) => {
      const deleted = deleteSubtask(input.id);
      if (!deleted) {
        return { success: false, error: 'Subtask not found' };
      }
      notifyChange('subtask', 'delete', input.id);
      return { success: true };
    },
  },

  complete_subtask: {
    description: 'Mark a subtask as completed',
    inputSchema: completeSubtaskSchema,
    handler: (input: z.infer<typeof completeSubtaskSchema>) => {
      const subtask = completeSubtask(input.id);
      if (!subtask) {
        return { success: false, error: 'Subtask not found' };
      }
      notifyChange('subtask', 'complete', input.id);
      return { success: true, subtask };
    },
  },

  uncomplete_subtask: {
    description: 'Mark a subtask as not completed',
    inputSchema: uncompleteSubtaskSchema,
    handler: (input: z.infer<typeof uncompleteSubtaskSchema>) => {
      const subtask = uncompleteSubtask(input.id);
      if (!subtask) {
        return { success: false, error: 'Subtask not found' };
      }
      notifyChange('subtask', 'update', input.id);
      return { success: true, subtask };
    },
  },

  reorder_subtasks: {
    description: 'Reorder subtasks within a task',
    inputSchema: reorderSubtasksSchema,
    handler: (input: z.infer<typeof reorderSubtasksSchema>) => {
      reorderSubtasks(input.task_id, input.subtask_ids);
      notifyChange('subtask', 'update');
      return { success: true };
    },
  },

  decompose_task: {
    description: 'Decompose a task into subtasks. Analyze the task and create appropriate subtasks with estimated durations. Also updates the parent task estimated_minutes with the total.',
    inputSchema: decomposeTaskSchema,
    handler: (input: z.infer<typeof decomposeTaskSchema>) => {
      const created: Subtask[] = [];
      let totalMinutes = 0;

      for (const sub of input.subtasks) {
        const subtask = addSubtask(input.task_id, sub.title);
        created.push(subtask);
        totalMinutes += sub.estimated_minutes ?? 0;
      }

      // Update parent task estimated_minutes with the sum
      if (totalMinutes > 0) {
        updateTask(input.task_id, { estimated_minutes: totalMinutes });
        notifyChange('task', 'update', input.task_id);
      }

      notifyChange('subtask', 'create');
      return {
        success: true,
        subtasks: created,
        totalEstimatedMinutes: totalMinutes,
      };
    },
  },
};
