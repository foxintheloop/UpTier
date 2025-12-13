import { ipcMain } from 'electron';
import { getDb, generateId, nowISO } from './database';
import { createScopedLogger, createIpcTimer } from './logger';
import { getSettings, setSettings, getEffectiveTheme, getDatabaseProfiles, getActiveProfile, setActiveProfile, createDatabaseProfile, updateDatabaseProfile, deleteDatabaseProfile, } from './settings';
import { switchDatabase, getDbPath } from './database';
import { notificationScheduler } from './notifications';
import { exportToJson, exportToCsv, exportToFile, selectImportFile, previewImport, executeImport, } from './export-import';
import { suggestDueDate, suggestBreakdown, getTaskSuggestions } from './ai-suggestions';
import { DEFAULT_LIST_ICON, DEFAULT_LIST_COLOR } from '@uptier/shared';
const ipcLog = createScopedLogger('ipc');
// Wrapper function to add logging to any IPC handler
function withLogging(channel, handler) {
    return (...args) => {
        const timer = createIpcTimer(channel);
        timer.start();
        try {
            const result = handler(...args);
            timer.end({ success: true });
            return result;
        }
        catch (error) {
            timer.error(error);
            throw error;
        }
    };
}
// ============================================================================
// Lists
// ============================================================================
function getLists() {
    const db = getDb();
    const rows = db.prepare(`
    SELECT
      l.*,
      COUNT(t.id) as task_count,
      SUM(CASE WHEN t.completed = 0 THEN 1 ELSE 0 END) as incomplete_count
    FROM lists l
    LEFT JOIN tasks t ON t.list_id = l.id
    WHERE l.is_smart_list = 0
    GROUP BY l.id
    ORDER BY l.position ASC
  `).all();
    return rows.map((row) => ({
        ...row,
        is_smart_list: Boolean(row.is_smart_list),
        task_count: row.task_count ?? 0,
        incomplete_count: row.incomplete_count ?? 0,
    }));
}
function createList(input) {
    const db = getDb();
    const id = generateId();
    const now = nowISO();
    ipcLog.debug('Creating list', { name: input.name });
    const maxPos = db.prepare('SELECT MAX(position) as max FROM lists WHERE is_smart_list = 0').get();
    const position = (maxPos.max ?? -1) + 1;
    db.prepare(`
    INSERT INTO lists (id, name, description, icon, color, position, is_smart_list, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(id, input.name, input.description ?? null, input.icon ?? DEFAULT_LIST_ICON, input.color ?? DEFAULT_LIST_COLOR, position, now, now);
    ipcLog.info('List created', { id, name: input.name });
    return db.prepare('SELECT * FROM lists WHERE id = ?').get(id);
}
function updateList(id, input) {
    const db = getDb();
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
    if (updates.length === 0)
        return db.prepare('SELECT * FROM lists WHERE id = ?').get(id);
    ipcLog.debug('Updating list', { id, fields: updates.length });
    values.push(id);
    db.prepare(`UPDATE lists SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    ipcLog.info('List updated', { id });
    return db.prepare('SELECT * FROM lists WHERE id = ?').get(id);
}
function deleteList(id) {
    const db = getDb();
    ipcLog.debug('Deleting list', { id });
    const result = db.prepare('DELETE FROM lists WHERE id = ? AND is_smart_list = 0').run(id);
    const success = result.changes > 0;
    if (success) {
        ipcLog.info('List deleted', { id });
    }
    else {
        ipcLog.warn('List not deleted (not found or is smart list)', { id });
    }
    return success;
}
// ============================================================================
// Tasks
// ============================================================================
// Smart list ID prefixes
const SMART_LIST_IDS = ['smart:my_day', 'smart:important', 'smart:planned', 'smart:completed'];
function isSmartListId(id) {
    return id !== undefined && id.startsWith('smart:');
}
function getSmartListTasks(smartListId) {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    let sql = '';
    const params = [];
    switch (smartListId) {
        case 'smart:my_day':
            // Tasks due today
            sql = `SELECT t.* FROM tasks t WHERE t.due_date = ? AND t.completed = 0 ORDER BY t.priority_tier ASC NULLS LAST, t.position ASC`;
            params.push(today);
            break;
        case 'smart:important':
            // Tier 1 priority tasks
            sql = `SELECT t.* FROM tasks t WHERE t.priority_tier = 1 AND t.completed = 0 ORDER BY t.position ASC`;
            break;
        case 'smart:planned':
            // Tasks with due dates
            sql = `SELECT t.* FROM tasks t WHERE t.due_date IS NOT NULL AND t.completed = 0 ORDER BY t.due_date ASC, t.priority_tier ASC NULLS LAST`;
            break;
        case 'smart:completed':
            // Completed tasks (recent first)
            sql = `SELECT t.* FROM tasks t WHERE t.completed = 1 ORDER BY t.completed_at DESC LIMIT 100`;
            break;
        default:
            return [];
    }
    const tasks = db.prepare(sql).all(...params);
    const goalQuery = db.prepare(`
    SELECT tg.task_id, tg.goal_id, g.name as goal_name, tg.alignment_strength
    FROM task_goals tg
    JOIN goals g ON g.id = tg.goal_id
    WHERE tg.task_id = ?
  `);
    const tagQuery = db.prepare(`
    SELECT t.id, t.name, t.color
    FROM tags t
    JOIN task_tags tt ON tt.tag_id = t.id
    WHERE tt.task_id = ?
  `);
    return tasks.map((task) => {
        const goals = goalQuery.all(task.id);
        const tags = tagQuery.all(task.id);
        return {
            ...task,
            completed: Boolean(task.completed),
            goals: goals.map((g) => ({
                goal_id: g.goal_id,
                goal_name: g.goal_name,
                alignment_strength: g.alignment_strength,
            })),
            tags,
        };
    });
}
function getTasks(options = {}) {
    const db = getDb();
    // Handle smart list IDs
    if (isSmartListId(options.list_id)) {
        return getSmartListTasks(options.list_id);
    }
    const conditions = [];
    const params = [];
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
    const tasks = db.prepare(`
    SELECT t.* FROM tasks t
    ${whereClause}
    ORDER BY t.priority_tier ASC NULLS LAST, t.position ASC
  `).all(...params);
    const goalQuery = db.prepare(`
    SELECT tg.task_id, tg.goal_id, g.name as goal_name, tg.alignment_strength
    FROM task_goals tg
    JOIN goals g ON g.id = tg.goal_id
    WHERE tg.task_id = ?
  `);
    const tagQuery = db.prepare(`
    SELECT t.id, t.name, t.color
    FROM tags t
    JOIN task_tags tt ON tt.tag_id = t.id
    WHERE tt.task_id = ?
  `);
    return tasks.map((task) => {
        const goals = goalQuery.all(task.id);
        const tags = tagQuery.all(task.id);
        return {
            ...task,
            completed: Boolean(task.completed),
            goals: goals.map((g) => ({
                goal_id: g.goal_id,
                goal_name: g.goal_name,
                alignment_strength: g.alignment_strength,
            })),
            tags,
        };
    });
}
function createTask(input) {
    const db = getDb();
    const id = generateId();
    const now = nowISO();
    ipcLog.debug('Creating task', { title: input.title, listId: input.list_id });
    const maxPos = db.prepare('SELECT MAX(position) as max FROM tasks WHERE list_id = ?').get(input.list_id);
    const position = (maxPos.max ?? -1) + 1;
    db.prepare(`
    INSERT INTO tasks (
      id, list_id, title, notes, due_date, due_time, reminder_at,
      completed, position,
      effort_score, impact_score, urgency_score, importance_score,
      priority_tier, priority_reasoning,
      estimated_minutes, energy_required, context_tags,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.list_id, input.title, input.notes ?? null, input.due_date ?? null, input.due_time ?? null, input.reminder_at ?? null, position, input.effort_score ?? null, input.impact_score ?? null, input.urgency_score ?? null, input.importance_score ?? null, input.priority_tier ?? null, input.priority_reasoning ?? null, input.estimated_minutes ?? null, input.energy_required ?? null, input.context_tags ? JSON.stringify(input.context_tags) : null, now, now);
    if (input.goal_ids?.length) {
        const linkStmt = db.prepare('INSERT INTO task_goals (task_id, goal_id, alignment_strength) VALUES (?, ?, 3)');
        for (const goalId of input.goal_ids) {
            linkStmt.run(id, goalId);
        }
    }
    ipcLog.info('Task created', { id, title: input.title });
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}
function updateTask(id, input) {
    const db = getDb();
    const updates = [];
    const values = [];
    const fields = [
        ['title', 'title'], ['notes', 'notes'], ['due_date', 'due_date'],
        ['due_time', 'due_time'], ['reminder_at', 'reminder_at'],
        ['effort_score', 'effort_score'], ['impact_score', 'impact_score'],
        ['urgency_score', 'urgency_score'], ['importance_score', 'importance_score'],
        ['priority_tier', 'priority_tier'], ['priority_reasoning', 'priority_reasoning'],
        ['estimated_minutes', 'estimated_minutes'], ['energy_required', 'energy_required'],
        ['position', 'position'],
    ];
    for (const [inputKey, dbCol] of fields) {
        if (input[inputKey] !== undefined) {
            updates.push(`${dbCol} = ?`);
            values.push(input[inputKey]);
        }
    }
    if (input.context_tags !== undefined) {
        updates.push('context_tags = ?');
        values.push(input.context_tags ? JSON.stringify(input.context_tags) : null);
    }
    if (updates.length === 0)
        return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    ipcLog.debug('Updating task', { id, fields: updates.length });
    values.push(id);
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    ipcLog.info('Task updated', { id });
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}
function deleteTask(id) {
    const db = getDb();
    ipcLog.debug('Deleting task', { id });
    const success = db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0;
    if (success) {
        ipcLog.info('Task deleted', { id });
    }
    else {
        ipcLog.warn('Task not deleted (not found)', { id });
    }
    return success;
}
function completeTask(id) {
    const db = getDb();
    ipcLog.debug('Completing task', { id });
    db.prepare('UPDATE tasks SET completed = 1, completed_at = ? WHERE id = ?').run(nowISO(), id);
    ipcLog.info('Task completed', { id });
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}
function uncompleteTask(id) {
    const db = getDb();
    ipcLog.debug('Uncompleting task', { id });
    db.prepare('UPDATE tasks SET completed = 0, completed_at = NULL WHERE id = ?').run(id);
    ipcLog.info('Task uncompleted', { id });
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}
function reorderTasks(listId, taskIds) {
    const db = getDb();
    ipcLog.debug('Reordering tasks', { listId, taskCount: taskIds.length });
    const stmt = db.prepare('UPDATE tasks SET position = ? WHERE id = ? AND list_id = ?');
    const transaction = db.transaction(() => {
        taskIds.forEach((id, index) => stmt.run(index, id, listId));
    });
    transaction();
    ipcLog.info('Tasks reordered', { listId, taskCount: taskIds.length });
}
// ============================================================================
// Goals
// ============================================================================
function getGoals() {
    const db = getDb();
    return db.prepare("SELECT * FROM goals WHERE status = 'active' ORDER BY timeframe, name").all();
}
function createGoal(input) {
    const db = getDb();
    const id = generateId();
    const now = nowISO();
    ipcLog.debug('Creating goal', { name: input.name, timeframe: input.timeframe });
    db.prepare(`
    INSERT INTO goals (id, name, description, timeframe, target_date, parent_goal_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(id, input.name, input.description ?? null, input.timeframe, input.target_date ?? null, input.parent_goal_id ?? null, now, now);
    ipcLog.info('Goal created', { id, name: input.name });
    return db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
}
function linkTasksToGoal(goalId, taskIds, alignmentStrength) {
    const db = getDb();
    ipcLog.debug('Linking tasks to goal', { goalId, taskCount: taskIds.length, alignmentStrength });
    const stmt = db.prepare('INSERT OR REPLACE INTO task_goals (task_id, goal_id, alignment_strength) VALUES (?, ?, ?)');
    const transaction = db.transaction(() => {
        for (const taskId of taskIds) {
            stmt.run(taskId, goalId, alignmentStrength);
        }
    });
    transaction();
    ipcLog.info('Tasks linked to goal', { goalId, taskCount: taskIds.length });
}
function getGoalProgress(goalId) {
    const db = getDb();
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(goalId);
    if (!goal)
        return null;
    const stats = db.prepare(`
    SELECT COUNT(t.id) as total, SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) as completed
    FROM task_goals tg JOIN tasks t ON t.id = tg.task_id WHERE tg.goal_id = ?
  `).get(goalId);
    return {
        ...goal,
        total_tasks: stats.total ?? 0,
        completed_tasks: stats.completed ?? 0,
        progress_percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    };
}
// ============================================================================
// Subtasks
// ============================================================================
function getSubtasks(taskId) {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position').all(taskId);
    return rows.map(r => ({ ...r, completed: Boolean(r.completed) }));
}
function addSubtask(taskId, title) {
    const db = getDb();
    const id = generateId();
    const now = nowISO();
    ipcLog.debug('Adding subtask', { taskId, title });
    const maxPos = db.prepare('SELECT MAX(position) as max FROM subtasks WHERE task_id = ?').get(taskId);
    const position = (maxPos.max ?? -1) + 1;
    db.prepare('INSERT INTO subtasks (id, task_id, title, completed, position, created_at) VALUES (?, ?, ?, 0, ?, ?)').run(id, taskId, title, position, now);
    ipcLog.info('Subtask added', { id, taskId });
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
}
function completeSubtask(id) {
    const db = getDb();
    ipcLog.debug('Completing subtask', { id });
    db.prepare('UPDATE subtasks SET completed = 1 WHERE id = ?').run(id);
    ipcLog.info('Subtask completed', { id });
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
}
function uncompleteSubtask(id) {
    const db = getDb();
    ipcLog.debug('Uncompleting subtask', { id });
    db.prepare('UPDATE subtasks SET completed = 0 WHERE id = ?').run(id);
    ipcLog.info('Subtask uncompleted', { id });
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
}
function deleteSubtask(id) {
    const db = getDb();
    ipcLog.debug('Deleting subtask', { id });
    const success = db.prepare('DELETE FROM subtasks WHERE id = ?').run(id).changes > 0;
    if (success) {
        ipcLog.info('Subtask deleted', { id });
    }
    else {
        ipcLog.warn('Subtask not deleted (not found)', { id });
    }
    return success;
}
// ============================================================================
// Tags
// ============================================================================
function getTags() {
    const db = getDb();
    return db.prepare('SELECT * FROM tags ORDER BY name').all();
}
function createTag(input) {
    const db = getDb();
    const id = generateId();
    ipcLog.debug('Creating tag', { name: input.name });
    db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, input.name, input.color ?? '#6b7280');
    ipcLog.info('Tag created', { id, name: input.name });
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
}
function updateTag(id, input) {
    const db = getDb();
    const updates = [];
    const values = [];
    if (input.name !== undefined) {
        updates.push('name = ?');
        values.push(input.name);
    }
    if (input.color !== undefined) {
        updates.push('color = ?');
        values.push(input.color);
    }
    if (updates.length === 0)
        return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    ipcLog.debug('Updating tag', { id, fields: updates.length });
    values.push(id);
    db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    ipcLog.info('Tag updated', { id });
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
}
function deleteTag(id) {
    const db = getDb();
    ipcLog.debug('Deleting tag', { id });
    const success = db.prepare('DELETE FROM tags WHERE id = ?').run(id).changes > 0;
    if (success) {
        ipcLog.info('Tag deleted', { id });
    }
    else {
        ipcLog.warn('Tag not deleted (not found)', { id });
    }
    return success;
}
function addTagToTask(taskId, tagId) {
    const db = getDb();
    ipcLog.debug('Adding tag to task', { taskId, tagId });
    try {
        db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tagId);
        ipcLog.info('Tag added to task', { taskId, tagId });
        return true;
    }
    catch (error) {
        ipcLog.error('Failed to add tag to task', error, { taskId, tagId });
        return false;
    }
}
function removeTagFromTask(taskId, tagId) {
    const db = getDb();
    ipcLog.debug('Removing tag from task', { taskId, tagId });
    const success = db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(taskId, tagId).changes > 0;
    if (success) {
        ipcLog.info('Tag removed from task', { taskId, tagId });
    }
    else {
        ipcLog.warn('Tag not removed from task (not found)', { taskId, tagId });
    }
    return success;
}
function getTaskTags(taskId) {
    const db = getDb();
    return db.prepare(`
    SELECT t.* FROM tags t
    JOIN task_tags tt ON tt.tag_id = t.id
    WHERE tt.task_id = ?
    ORDER BY t.name
  `).all(taskId);
}
// ============================================================================
// Register IPC Handlers
// ============================================================================
export function registerIpcHandlers() {
    ipcLog.info('Registering IPC handlers');
    // Lists
    ipcMain.handle('lists:getAll', withLogging('lists:getAll', () => getLists()));
    ipcMain.handle('lists:create', withLogging('lists:create', (_, input) => createList(input)));
    ipcMain.handle('lists:update', withLogging('lists:update', (_, id, input) => updateList(id, input)));
    ipcMain.handle('lists:delete', withLogging('lists:delete', (_, id) => deleteList(id)));
    // Tasks
    ipcMain.handle('tasks:getByList', withLogging('tasks:getByList', (_, options) => getTasks(options)));
    ipcMain.handle('tasks:create', withLogging('tasks:create', (_, input) => createTask(input)));
    ipcMain.handle('tasks:update', withLogging('tasks:update', (_, id, input) => updateTask(id, input)));
    ipcMain.handle('tasks:delete', withLogging('tasks:delete', (_, id) => deleteTask(id)));
    ipcMain.handle('tasks:complete', withLogging('tasks:complete', (_, id) => completeTask(id)));
    ipcMain.handle('tasks:uncomplete', withLogging('tasks:uncomplete', (_, id) => uncompleteTask(id)));
    ipcMain.handle('tasks:reorder', withLogging('tasks:reorder', (_, listId, taskIds) => reorderTasks(listId, taskIds)));
    // Goals
    ipcMain.handle('goals:getAll', withLogging('goals:getAll', () => getGoals()));
    ipcMain.handle('goals:create', withLogging('goals:create', (_, input) => createGoal(input)));
    ipcMain.handle('goals:linkTasks', withLogging('goals:linkTasks', (_, goalId, taskIds, strength) => linkTasksToGoal(goalId, taskIds, strength)));
    ipcMain.handle('goals:getProgress', withLogging('goals:getProgress', (_, goalId) => getGoalProgress(goalId)));
    // Subtasks
    ipcMain.handle('subtasks:getByTask', withLogging('subtasks:getByTask', (_, taskId) => getSubtasks(taskId)));
    ipcMain.handle('subtasks:add', withLogging('subtasks:add', (_, taskId, title) => addSubtask(taskId, title)));
    ipcMain.handle('subtasks:complete', withLogging('subtasks:complete', (_, id) => completeSubtask(id)));
    ipcMain.handle('subtasks:uncomplete', withLogging('subtasks:uncomplete', (_, id) => uncompleteSubtask(id)));
    ipcMain.handle('subtasks:delete', withLogging('subtasks:delete', (_, id) => deleteSubtask(id)));
    // Tags
    ipcMain.handle('tags:getAll', withLogging('tags:getAll', () => getTags()));
    ipcMain.handle('tags:create', withLogging('tags:create', (_, input) => createTag(input)));
    ipcMain.handle('tags:update', withLogging('tags:update', (_, id, input) => updateTag(id, input)));
    ipcMain.handle('tags:delete', withLogging('tags:delete', (_, id) => deleteTag(id)));
    ipcMain.handle('tasks:addTag', withLogging('tasks:addTag', (_, taskId, tagId) => addTagToTask(taskId, tagId)));
    ipcMain.handle('tasks:removeTag', withLogging('tasks:removeTag', (_, taskId, tagId) => removeTagFromTask(taskId, tagId)));
    ipcMain.handle('tasks:getTags', withLogging('tasks:getTags', (_, taskId) => getTaskTags(taskId)));
    // Settings
    ipcMain.handle('settings:get', withLogging('settings:get', () => getSettings()));
    ipcMain.handle('settings:set', withLogging('settings:set', (_, settings) => setSettings(settings)));
    ipcMain.handle('settings:getEffectiveTheme', withLogging('settings:getEffectiveTheme', () => getEffectiveTheme()));
    // Notifications
    ipcMain.handle('notifications:getUpcoming', withLogging('notifications:getUpcoming', (_, limit) => notificationScheduler.getUpcoming(limit)));
    ipcMain.handle('notifications:snooze', withLogging('notifications:snooze', (_, taskId) => notificationScheduler.snooze(taskId)));
    ipcMain.handle('notifications:dismiss', withLogging('notifications:dismiss', (_, taskId) => notificationScheduler.dismiss(taskId)));
    ipcMain.handle('notifications:getPendingCount', withLogging('notifications:getPendingCount', () => notificationScheduler.getPendingCount()));
    ipcMain.handle('notifications:setReminderFromDueDate', withLogging('notifications:setReminderFromDueDate', (_, taskId, dueDate, dueTime) => notificationScheduler.setReminderFromDueDate(taskId, dueDate, dueTime)));
    // Export/Import
    ipcMain.handle('export:json', withLogging('export:json', () => exportToJson()));
    ipcMain.handle('export:csv', withLogging('export:csv', () => exportToCsv()));
    ipcMain.handle('export:toFile', withLogging('export:toFile', async (_, format) => exportToFile(format)));
    ipcMain.handle('import:selectFile', withLogging('import:selectFile', () => selectImportFile()));
    ipcMain.handle('import:preview', withLogging('import:preview', async (_, filePath) => previewImport(filePath)));
    ipcMain.handle('import:execute', withLogging('import:execute', async (_, filePath, options) => executeImport(filePath, options)));
    // Database Profiles
    ipcMain.handle('database:getProfiles', withLogging('database:getProfiles', () => getDatabaseProfiles()));
    ipcMain.handle('database:getActiveProfile', withLogging('database:getActiveProfile', () => getActiveProfile()));
    ipcMain.handle('database:create', withLogging('database:create', (_, input) => createDatabaseProfile(input)));
    ipcMain.handle('database:update', withLogging('database:update', (_, id, updates) => updateDatabaseProfile(id, updates)));
    ipcMain.handle('database:delete', withLogging('database:delete', (_, id) => deleteDatabaseProfile(id)));
    ipcMain.handle('database:switch', withLogging('database:switch', (_, profileId) => {
        const profile = setActiveProfile(profileId);
        if (!profile) {
            return { success: false, error: 'Profile not found' };
        }
        return switchDatabase(profile);
    }));
    ipcMain.handle('database:getCurrentPath', withLogging('database:getCurrentPath', () => getDbPath()));
    // AI Suggestions
    ipcMain.handle('suggestions:getDueDate', withLogging('suggestions:getDueDate', (_, taskId) => suggestDueDate(taskId)));
    ipcMain.handle('suggestions:getBreakdown', withLogging('suggestions:getBreakdown', (_, taskId) => suggestBreakdown(taskId)));
    ipcMain.handle('suggestions:getAll', withLogging('suggestions:getAll', (_, taskId) => getTaskSuggestions(taskId)));
    ipcLog.info('IPC handlers registered', { count: 52 });
}
//# sourceMappingURL=ipc-handlers.js.map