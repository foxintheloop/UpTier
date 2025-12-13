import { z } from 'zod';
import { getDb, generateId, nowISO } from '../database.js';
// ============================================================================
// Schemas
// ============================================================================
export const createGoalSchema = z.object({
    name: z.string().min(1).describe('Goal name'),
    description: z.string().optional().describe('Goal description'),
    timeframe: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).describe('Goal timeframe'),
    target_date: z.string().optional().describe('Target completion date (YYYY-MM-DD)'),
    parent_goal_id: z.string().optional().describe('Parent goal ID for hierarchical goals'),
});
export const updateGoalSchema = z.object({
    id: z.string().describe('Goal ID to update'),
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    timeframe: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    target_date: z.string().nullable().optional(),
    parent_goal_id: z.string().nullable().optional(),
    status: z.enum(['active', 'completed', 'abandoned']).optional(),
});
export const deleteGoalSchema = z.object({
    id: z.string().describe('Goal ID to delete'),
});
export const getGoalsSchema = z.object({
    include_completed: z.boolean().optional().default(false).describe('Include completed/abandoned goals'),
    parent_id: z.string().optional().describe('Filter by parent goal ID'),
});
export const linkTasksToGoalSchema = z.object({
    goal_id: z.string().describe('Goal ID to link tasks to'),
    task_ids: z.array(z.string()).describe('Task IDs to link'),
    alignment_strength: z.number().min(1).max(5).optional().default(3).describe('How strongly tasks align with goal (1-5)'),
});
export const unlinkTasksFromGoalSchema = z.object({
    goal_id: z.string().describe('Goal ID to unlink tasks from'),
    task_ids: z.array(z.string()).describe('Task IDs to unlink'),
});
export const getGoalProgressSchema = z.object({
    goal_id: z.string().describe('Goal ID to get progress for'),
});
// ============================================================================
// Tool Implementations
// ============================================================================
function rowToGoal(row) {
    return row;
}
export function createGoal(input) {
    const db = getDb();
    const id = generateId();
    const now = nowISO();
    const stmt = db.prepare(`
    INSERT INTO goals (id, name, description, timeframe, target_date, parent_goal_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `);
    stmt.run(id, input.name, input.description ?? null, input.timeframe, input.target_date ?? null, input.parent_goal_id ?? null, now, now);
    return getGoalById(id);
}
export function getGoalById(id) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    if (!row)
        return null;
    return rowToGoal(row);
}
export function getGoals(includeCompleted = false, parentId) {
    const db = getDb();
    const conditions = [];
    const params = [];
    if (!includeCompleted) {
        conditions.push("status = 'active'");
    }
    if (parentId !== undefined) {
        if (parentId === null) {
            conditions.push('parent_goal_id IS NULL');
        }
        else {
            conditions.push('parent_goal_id = ?');
            params.push(parentId);
        }
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db.prepare(`
    SELECT * FROM goals
    ${whereClause}
    ORDER BY timeframe, name
  `).all(...params);
    return rows.map((row) => rowToGoal(row));
}
export function getGoalsWithHierarchy(includeCompleted = false) {
    const db = getDb();
    const statusFilter = includeCompleted ? '' : "WHERE status = 'active'";
    const allGoals = db.prepare(`SELECT * FROM goals ${statusFilter} ORDER BY timeframe, name`).all();
    // Build hierarchy
    const goalMap = new Map();
    const rootGoals = [];
    // First pass: create all goal objects
    for (const goal of allGoals) {
        goalMap.set(goal.id, { ...goal, children: [] });
    }
    // Second pass: build hierarchy
    for (const goal of allGoals) {
        const goalWithChildren = goalMap.get(goal.id);
        if (goal.parent_goal_id && goalMap.has(goal.parent_goal_id)) {
            goalMap.get(goal.parent_goal_id).children.push(goalWithChildren);
        }
        else {
            rootGoals.push(goalWithChildren);
        }
    }
    return rootGoals;
}
export function updateGoal(id, input) {
    const db = getDb();
    const existing = getGoalById(id);
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
    if (input.timeframe !== undefined) {
        updates.push('timeframe = ?');
        values.push(input.timeframe);
    }
    if (input.target_date !== undefined) {
        updates.push('target_date = ?');
        values.push(input.target_date);
    }
    if (input.parent_goal_id !== undefined) {
        updates.push('parent_goal_id = ?');
        values.push(input.parent_goal_id);
    }
    if (input.status !== undefined) {
        updates.push('status = ?');
        values.push(input.status);
    }
    if (updates.length === 0) {
        return existing;
    }
    values.push(id);
    const stmt = db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return getGoalById(id);
}
export function deleteGoal(id) {
    const db = getDb();
    const result = db.prepare('DELETE FROM goals WHERE id = ?').run(id);
    return result.changes > 0;
}
export function linkTasksToGoal(goalId, taskIds, alignmentStrength = 3) {
    const db = getDb();
    const stmt = db.prepare(`
    INSERT OR REPLACE INTO task_goals (task_id, goal_id, alignment_strength)
    VALUES (?, ?, ?)
  `);
    let linked = 0;
    const transaction = db.transaction(() => {
        for (const taskId of taskIds) {
            stmt.run(taskId, goalId, alignmentStrength);
            linked++;
        }
    });
    transaction();
    return { linked };
}
export function unlinkTasksFromGoal(goalId, taskIds) {
    const db = getDb();
    const placeholders = taskIds.map(() => '?').join(', ');
    const result = db.prepare(`
    DELETE FROM task_goals
    WHERE goal_id = ? AND task_id IN (${placeholders})
  `).run(goalId, ...taskIds);
    return { unlinked: result.changes };
}
export function getGoalProgress(goalId) {
    const db = getDb();
    const goal = getGoalById(goalId);
    if (!goal)
        return null;
    const stats = db.prepare(`
    SELECT
      COUNT(t.id) as total_tasks,
      SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) as completed_tasks
    FROM task_goals tg
    JOIN tasks t ON t.id = tg.task_id
    WHERE tg.goal_id = ?
  `).get(goalId);
    const total = stats.total_tasks ?? 0;
    const completed = stats.completed_tasks ?? 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
        ...goal,
        total_tasks: total,
        completed_tasks: completed,
        progress_percentage: percentage,
    };
}
// ============================================================================
// Tool Definitions for MCP
// ============================================================================
export const goalTools = {
    create_goal: {
        description: 'Create a new goal for task alignment',
        inputSchema: createGoalSchema,
        handler: (input) => {
            const goal = createGoal(input);
            return { success: true, goal };
        },
    },
    get_goals: {
        description: 'Get all goals, optionally with hierarchy',
        inputSchema: getGoalsSchema,
        handler: (input) => {
            if (input.parent_id !== undefined) {
                const goals = getGoals(input.include_completed, input.parent_id);
                return { success: true, goals };
            }
            else {
                const goals = getGoalsWithHierarchy(input.include_completed);
                return { success: true, goals };
            }
        },
    },
    update_goal: {
        description: 'Update a goal',
        inputSchema: updateGoalSchema,
        handler: (input) => {
            const { id, ...updates } = input;
            const goal = updateGoal(id, updates);
            if (!goal) {
                return { success: false, error: 'Goal not found' };
            }
            return { success: true, goal };
        },
    },
    delete_goal: {
        description: 'Delete a goal (task links will be removed)',
        inputSchema: deleteGoalSchema,
        handler: (input) => {
            const deleted = deleteGoal(input.id);
            if (!deleted) {
                return { success: false, error: 'Goal not found' };
            }
            return { success: true };
        },
    },
    link_tasks_to_goal: {
        description: 'Associate tasks with a goal',
        inputSchema: linkTasksToGoalSchema,
        handler: (input) => {
            const result = linkTasksToGoal(input.goal_id, input.task_ids, input.alignment_strength);
            return { success: true, ...result };
        },
    },
    unlink_tasks_from_goal: {
        description: 'Remove task associations from a goal',
        inputSchema: unlinkTasksFromGoalSchema,
        handler: (input) => {
            const result = unlinkTasksFromGoal(input.goal_id, input.task_ids);
            return { success: true, ...result };
        },
    },
    get_goal_progress: {
        description: 'Get completion stats for a goal based on linked tasks',
        inputSchema: getGoalProgressSchema,
        handler: (input) => {
            const progress = getGoalProgress(input.goal_id);
            if (!progress) {
                return { success: false, error: 'Goal not found' };
            }
            return { success: true, progress };
        },
    },
};
//# sourceMappingURL=goals.js.map