import { z } from 'zod';
import { getDb, nowISO } from '../database.js';
import { PRIORITIZATION_STRATEGIES } from '@uptier/shared';
import { getTasks } from './tasks.js';
// ============================================================================
// Schemas
// ============================================================================
export const bulkSetPrioritiesSchema = z.object({
    updates: z.array(z.object({
        task_id: z.string().describe('Task ID to update'),
        effort_score: z.number().min(1).max(5).optional().describe('Effort score (1-5)'),
        impact_score: z.number().min(1).max(5).optional().describe('Impact score (1-5)'),
        urgency_score: z.number().min(1).max(5).optional().describe('Urgency score (1-5)'),
        importance_score: z.number().min(1).max(5).optional().describe('Importance score (1-5)'),
        priority_tier: z.number().min(1).max(3).optional().describe('Priority tier (1-3)'),
        priority_reasoning: z.string().optional().describe('Explanation for this priority'),
    })).describe('Array of priority updates'),
});
export const prioritizeListSchema = z.object({
    list_id: z.string().describe('List ID to prioritize'),
    strategy: z.enum(['balanced', 'urgent_first', 'quick_wins', 'high_impact', 'eisenhower'])
        .optional()
        .default('balanced')
        .describe('Prioritization strategy to apply'),
    context: z.string().optional().describe('Additional context (e.g., "I have 2 hours", "interview tomorrow")'),
    goal_ids: z.array(z.string()).optional().describe('Goal IDs to weight heavily in prioritization'),
});
export const getPrioritizationSummarySchema = z.object({
    list_ids: z.array(z.string()).optional().describe('Specific list IDs to summarize (all if not provided)'),
    include_completed: z.boolean().optional().default(false).describe('Include completed tasks'),
});
// ============================================================================
// Tool Implementations
// ============================================================================
export function bulkSetPriorities(updates) {
    const db = getDb();
    const now = nowISO();
    const failed = [];
    let updated = 0;
    const transaction = db.transaction(() => {
        for (const update of updates) {
            const fields = [];
            const values = [];
            if (update.effort_score !== undefined) {
                fields.push('effort_score = ?');
                values.push(update.effort_score);
            }
            if (update.impact_score !== undefined) {
                fields.push('impact_score = ?');
                values.push(update.impact_score);
            }
            if (update.urgency_score !== undefined) {
                fields.push('urgency_score = ?');
                values.push(update.urgency_score);
            }
            if (update.importance_score !== undefined) {
                fields.push('importance_score = ?');
                values.push(update.importance_score);
            }
            if (update.priority_tier !== undefined) {
                fields.push('priority_tier = ?');
                values.push(update.priority_tier);
            }
            if (update.priority_reasoning !== undefined) {
                fields.push('priority_reasoning = ?');
                values.push(update.priority_reasoning);
            }
            if (fields.length === 0) {
                continue;
            }
            // Always update prioritized_at
            fields.push('prioritized_at = ?');
            values.push(now);
            values.push(update.task_id);
            const stmt = db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`);
            const result = stmt.run(...values);
            if (result.changes === 0) {
                failed.push(update.task_id);
            }
            else {
                updated++;
            }
        }
    });
    transaction();
    return { updated, failed };
}
export function getTasksForPrioritization(listId, strategy, context, goalIds) {
    const db = getDb();
    // Get tasks
    const tasks = getTasks({ list_id: listId, include_completed: false });
    // Get strategy info
    const strategyInfo = PRIORITIZATION_STRATEGIES[strategy];
    // Get focused goals if specified
    let focusedGoals;
    if (goalIds && goalIds.length > 0) {
        const placeholders = goalIds.map(() => '?').join(', ');
        const goalRows = db.prepare(`SELECT id, name FROM goals WHERE id IN (${placeholders})`).all(...goalIds);
        focusedGoals = goalRows;
    }
    return {
        tasks,
        strategy_info: {
            name: strategyInfo.label,
            description: strategyInfo.description,
            prompt_hint: strategyInfo.prompt_hint,
        },
        context,
        focused_goals: focusedGoals,
    };
}
export function getPrioritizationSummary(listIds, includeCompleted = false) {
    const db = getDb();
    // Build base conditions
    const conditions = [];
    const params = [];
    if (listIds && listIds.length > 0) {
        const placeholders = listIds.map(() => '?').join(', ');
        conditions.push(`list_id IN (${placeholders})`);
        params.push(...listIds);
    }
    if (!includeCompleted) {
        conditions.push('completed = 0');
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    // Get tier counts
    const tierCounts = db.prepare(`
    SELECT
      SUM(CASE WHEN priority_tier = 1 THEN 1 ELSE 0 END) as tier_1,
      SUM(CASE WHEN priority_tier = 2 THEN 1 ELSE 0 END) as tier_2,
      SUM(CASE WHEN priority_tier = 3 THEN 1 ELSE 0 END) as tier_3,
      SUM(CASE WHEN priority_tier IS NULL THEN 1 ELSE 0 END) as unprioritized
    FROM tasks
    ${whereClause}
  `).get(...params);
    // Get overdue and due today counts
    const today = new Date().toISOString().slice(0, 10);
    const dateParams = [...params, today, today];
    const dateCounts = db.prepare(`
    SELECT
      SUM(CASE WHEN due_date < ? THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN due_date = ? THEN 1 ELSE 0 END) as due_today
    FROM tasks
    ${whereClause}
    ${conditions.length > 0 ? 'AND' : 'WHERE'} due_date IS NOT NULL
  `).get(...dateParams);
    // Get quick wins (low effort, high impact)
    const quickWins = db.prepare(`
    SELECT id as task_id, title, effort_score, impact_score
    FROM tasks
    ${whereClause}
    ${conditions.length > 0 ? 'AND' : 'WHERE'}
    effort_score IS NOT NULL AND effort_score <= 2
    AND impact_score IS NOT NULL AND impact_score >= 4
    AND completed = 0
    ORDER BY impact_score DESC, effort_score ASC
    LIMIT 5
  `).all(...params);
    // Get high impact tasks
    const highImpact = db.prepare(`
    SELECT id as task_id, title, impact_score, effort_score
    FROM tasks
    ${whereClause}
    ${conditions.length > 0 ? 'AND' : 'WHERE'}
    impact_score IS NOT NULL AND impact_score >= 4
    AND completed = 0
    ORDER BY impact_score DESC, effort_score ASC
    LIMIT 5
  `).all(...params);
    // Get effort distribution
    const effortDist = db.prepare(`
    SELECT
      SUM(CASE WHEN effort_score <= 2 THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN effort_score = 3 THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN effort_score >= 4 THEN 1 ELSE 0 END) as high
    FROM tasks
    ${whereClause}
    ${conditions.length > 0 ? 'AND' : 'WHERE'} effort_score IS NOT NULL
  `).get(...params);
    return {
        tier_1_count: tierCounts.tier_1 ?? 0,
        tier_2_count: tierCounts.tier_2 ?? 0,
        tier_3_count: tierCounts.tier_3 ?? 0,
        unprioritized_count: tierCounts.unprioritized ?? 0,
        overdue_count: dateCounts.overdue ?? 0,
        due_today_count: dateCounts.due_today ?? 0,
        quick_wins: quickWins,
        high_impact_tasks: highImpact,
        effort_distribution: {
            low: effortDist.low ?? 0,
            medium: effortDist.medium ?? 0,
            high: effortDist.high ?? 0,
        },
    };
}
// ============================================================================
// Tool Definitions for MCP
// ============================================================================
export const priorityTools = {
    bulk_set_priorities: {
        description: 'Set priority scores and tiers for multiple tasks at once. Use this after analyzing tasks to persist your prioritization decisions.',
        inputSchema: bulkSetPrioritiesSchema,
        handler: (input) => {
            const result = bulkSetPriorities(input.updates);
            return {
                success: true,
                updated: result.updated,
                failed: result.failed.length > 0 ? result.failed : undefined,
            };
        },
    },
    prioritize_list: {
        description: `Analyze and prepare tasks in a list for prioritization. Returns tasks with current data and strategy guidance.

After calling this, analyze the tasks based on the strategy and context provided, then call bulk_set_priorities to persist your decisions.

Strategies:
- balanced: Weighs all factors equally
- urgent_first: Prioritizes by deadline and urgency
- quick_wins: Low effort, high impact tasks first
- high_impact: Maximum impact regardless of effort
- eisenhower: Classic urgent/important matrix`,
        inputSchema: prioritizeListSchema,
        handler: (input) => {
            const result = getTasksForPrioritization(input.list_id, input.strategy, input.context, input.goal_ids);
            return {
                success: true,
                ...result,
                instructions: `Analyze these ${result.tasks.length} tasks using the "${result.strategy_info.name}" strategy.
${result.strategy_info.prompt_hint}
${result.context ? `\nUser context: ${result.context}` : ''}
${result.focused_goals ? `\nPrioritize tasks aligned with goals: ${result.focused_goals.map(g => g.name).join(', ')}` : ''}

After analysis, call bulk_set_priorities with your decisions including priority_reasoning for each task.`,
            };
        },
    },
    get_prioritization_summary: {
        description: 'Get a summary view of task priorities across lists. Shows tier breakdown, overdue counts, quick wins available, and effort distribution.',
        inputSchema: getPrioritizationSummarySchema,
        handler: (input) => {
            const summary = getPrioritizationSummary(input.list_ids, input.include_completed);
            return { success: true, summary };
        },
    },
};
//# sourceMappingURL=priorities.js.map