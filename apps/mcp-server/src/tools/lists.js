import { z } from 'zod';
import { getDb, generateId, nowISO } from '../database.js';
import { DEFAULT_LIST_ICON, DEFAULT_LIST_COLOR } from '@uptier/shared';
// ============================================================================
// Schemas
// ============================================================================
export const createListSchema = z.object({
    name: z.string().min(1).describe('Name of the list'),
    description: z.string().optional().describe('Optional description'),
    icon: z.string().optional().describe('Lucide icon name (default: list)'),
    color: z.string().optional().describe('Hex color code (default: #3b82f6)'),
});
export const updateListSchema = z.object({
    id: z.string().describe('List ID to update'),
    name: z.string().optional().describe('New name'),
    description: z.string().nullable().optional().describe('New description'),
    icon: z.string().optional().describe('New icon'),
    color: z.string().optional().describe('New color'),
});
export const deleteListSchema = z.object({
    id: z.string().describe('List ID to delete'),
});
export const getListsSchema = z.object({
    include_smart_lists: z.boolean().optional().default(true).describe('Include smart lists'),
});
export const reorderListsSchema = z.object({
    list_ids: z.array(z.string()).describe('List IDs in desired order'),
});
// ============================================================================
// Tool Implementations
// ============================================================================
export function createList(input) {
    const db = getDb();
    const id = generateId();
    const now = nowISO();
    // Get next position
    const maxPos = db.prepare('SELECT MAX(position) as max FROM lists WHERE is_smart_list = 0').get();
    const position = (maxPos.max ?? -1) + 1;
    const stmt = db.prepare(`
    INSERT INTO lists (id, name, description, icon, color, position, is_smart_list, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);
    stmt.run(id, input.name, input.description ?? null, input.icon ?? DEFAULT_LIST_ICON, input.color ?? DEFAULT_LIST_COLOR, position, now, now);
    return getListById(id);
}
export function getListById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM lists WHERE id = ?').get(id);
    if (!row)
        return null;
    return {
        ...row,
        is_smart_list: Boolean(row.is_smart_list),
    };
}
export function getLists(includeSmartLists = true) {
    const db = getDb();
    const query = `
    SELECT
      l.*,
      COUNT(t.id) as task_count,
      SUM(CASE WHEN t.completed = 0 THEN 1 ELSE 0 END) as incomplete_count
    FROM lists l
    LEFT JOIN tasks t ON t.list_id = l.id
    ${includeSmartLists ? '' : 'WHERE l.is_smart_list = 0'}
    GROUP BY l.id
    ORDER BY l.is_smart_list DESC, l.position ASC
  `;
    const rows = db.prepare(query).all();
    return rows.map((row) => ({
        ...row,
        is_smart_list: Boolean(row.is_smart_list),
        task_count: row.task_count ?? 0,
        incomplete_count: row.incomplete_count ?? 0,
    }));
}
export function updateList(id, input) {
    const db = getDb();
    const existing = getListById(id);
    if (!existing)
        return null;
    const updates = [];
    const values = [];
    if (input.name !== undefined) {
        updates.push('name = ?');
        values.push(input.name);
    }
    if (input.description !== undefined) {
        updates.push('description = ?');
        values.push(input.description);
    }
    if (input.icon !== undefined) {
        updates.push('icon = ?');
        values.push(input.icon);
    }
    if (input.color !== undefined) {
        updates.push('color = ?');
        values.push(input.color);
    }
    if (input.position !== undefined) {
        updates.push('position = ?');
        values.push(input.position);
    }
    if (updates.length === 0) {
        return existing;
    }
    values.push(id);
    const stmt = db.prepare(`UPDATE lists SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return getListById(id);
}
export function deleteList(id) {
    const db = getDb();
    const result = db.prepare('DELETE FROM lists WHERE id = ? AND is_smart_list = 0').run(id);
    return result.changes > 0;
}
export function reorderLists(listIds) {
    const db = getDb();
    const updateStmt = db.prepare('UPDATE lists SET position = ? WHERE id = ?');
    const transaction = db.transaction(() => {
        listIds.forEach((id, index) => {
            updateStmt.run(index, id);
        });
    });
    transaction();
}
// ============================================================================
// Tool Definitions for MCP
// ============================================================================
export const listTools = {
    create_list: {
        description: 'Create a new task list',
        inputSchema: createListSchema,
        handler: (input) => {
            const list = createList(input);
            return { success: true, list };
        },
    },
    get_lists: {
        description: 'Get all lists with task counts',
        inputSchema: getListsSchema,
        handler: (input) => {
            const lists = getLists(input.include_smart_lists);
            return { success: true, lists };
        },
    },
    update_list: {
        description: 'Update a list',
        inputSchema: updateListSchema,
        handler: (input) => {
            const { id, ...updates } = input;
            const list = updateList(id, updates);
            if (!list) {
                return { success: false, error: 'List not found' };
            }
            return { success: true, list };
        },
    },
    delete_list: {
        description: 'Delete a list and all its tasks',
        inputSchema: deleteListSchema,
        handler: (input) => {
            const deleted = deleteList(input.id);
            if (!deleted) {
                return { success: false, error: 'List not found or is a smart list' };
            }
            return { success: true };
        },
    },
    reorder_lists: {
        description: 'Reorder lists by providing list IDs in desired order',
        inputSchema: reorderListsSchema,
        handler: (input) => {
            reorderLists(input.list_ids);
            return { success: true };
        },
    },
};
//# sourceMappingURL=lists.js.map