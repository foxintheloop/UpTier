import { z } from 'zod';
import { getDb, generateId, nowISO } from '../database.js';
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
export const getSubtasksSchema = z.object({
    task_id: z.string().describe('Parent task ID'),
});
// ============================================================================
// Tool Implementations
// ============================================================================
function rowToSubtask(row) {
    return {
        ...row,
        completed: Boolean(row.completed),
    };
}
export function addSubtask(taskId, title) {
    const db = getDb();
    const id = generateId();
    const now = nowISO();
    // Get next position
    const maxPos = db.prepare('SELECT MAX(position) as max FROM subtasks WHERE task_id = ?').get(taskId);
    const position = (maxPos.max ?? -1) + 1;
    db.prepare(`
    INSERT INTO subtasks (id, task_id, title, completed, position, created_at)
    VALUES (?, ?, ?, 0, ?, ?)
  `).run(id, taskId, title, position, now);
    return getSubtaskById(id);
}
export function getSubtaskById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
    if (!row)
        return null;
    return rowToSubtask(row);
}
export function getSubtasksByTaskId(taskId) {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position').all(taskId);
    return rows.map((row) => rowToSubtask(row));
}
export function updateSubtask(id, title) {
    const db = getDb();
    db.prepare('UPDATE subtasks SET title = ? WHERE id = ?').run(title, id);
    return getSubtaskById(id);
}
export function deleteSubtask(id) {
    const db = getDb();
    const result = db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    return result.changes > 0;
}
export function completeSubtask(id) {
    const db = getDb();
    db.prepare('UPDATE subtasks SET completed = 1 WHERE id = ?').run(id);
    return getSubtaskById(id);
}
export function uncompleteSubtask(id) {
    const db = getDb();
    db.prepare('UPDATE subtasks SET completed = 0 WHERE id = ?').run(id);
    return getSubtaskById(id);
}
export function reorderSubtasks(taskId, subtaskIds) {
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
        handler: (input) => {
            const subtask = addSubtask(input.task_id, input.title);
            return { success: true, subtask };
        },
    },
    get_subtasks: {
        description: 'Get all subtasks for a task',
        inputSchema: getSubtasksSchema,
        handler: (input) => {
            const subtasks = getSubtasksByTaskId(input.task_id);
            return { success: true, subtasks };
        },
    },
    update_subtask: {
        description: 'Update a subtask title',
        inputSchema: updateSubtaskSchema,
        handler: (input) => {
            if (!input.title) {
                return { success: false, error: 'Title is required' };
            }
            const subtask = updateSubtask(input.id, input.title);
            if (!subtask) {
                return { success: false, error: 'Subtask not found' };
            }
            return { success: true, subtask };
        },
    },
    delete_subtask: {
        description: 'Delete a subtask',
        inputSchema: deleteSubtaskSchema,
        handler: (input) => {
            const deleted = deleteSubtask(input.id);
            if (!deleted) {
                return { success: false, error: 'Subtask not found' };
            }
            return { success: true };
        },
    },
    complete_subtask: {
        description: 'Mark a subtask as completed',
        inputSchema: completeSubtaskSchema,
        handler: (input) => {
            const subtask = completeSubtask(input.id);
            if (!subtask) {
                return { success: false, error: 'Subtask not found' };
            }
            return { success: true, subtask };
        },
    },
    uncomplete_subtask: {
        description: 'Mark a subtask as not completed',
        inputSchema: uncompleteSubtaskSchema,
        handler: (input) => {
            const subtask = uncompleteSubtask(input.id);
            if (!subtask) {
                return { success: false, error: 'Subtask not found' };
            }
            return { success: true, subtask };
        },
    },
    reorder_subtasks: {
        description: 'Reorder subtasks within a task',
        inputSchema: reorderSubtasksSchema,
        handler: (input) => {
            reorderSubtasks(input.task_id, input.subtask_ids);
            return { success: true };
        },
    },
};
//# sourceMappingURL=subtasks.js.map