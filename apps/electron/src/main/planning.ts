import { getDb } from './database';
import { getSettings, setSettings } from './settings';
import { createScopedLogger } from './logger';
import type { Task, TaskWithGoals } from '@uptier/shared';

const log = createScopedLogger('planning');

interface YesterdaySummary {
  completed: TaskWithGoals[];
  incomplete: TaskWithGoals[];
}

interface TodayOverview {
  scheduled: TaskWithGoals[];
  unscheduled: TaskWithGoals[];
  totalMinutes: number;
}

/**
 * Build a TaskWithGoals from a raw row by fetching goals and tags.
 */
function enrichTask(task: Task): TaskWithGoals {
  const db = getDb();

  const goals = db.prepare(`
    SELECT g.id as goal_id, g.name as goal_name, tg.strength
    FROM task_goals tg JOIN goals g ON tg.goal_id = g.id
    WHERE tg.task_id = ?
  `).all(task.id) as Array<{ goal_id: string; goal_name: string; strength: number }>;

  const tags = db.prepare(`
    SELECT t.id, t.name, t.color
    FROM task_tags tt JOIN tags t ON tt.tag_id = t.id
    WHERE tt.task_id = ?
  `).all(task.id) as Array<{ id: string; name: string; color: string }>;

  return {
    ...task,
    completed: Boolean(task.completed),
    goals,
    tags,
  } as TaskWithGoals;
}

/**
 * Get yesterday's completed and incomplete tasks.
 */
export function getYesterdaySummary(): YesterdaySummary {
  log.info('Getting yesterday summary');
  const db = getDb();

  // Tasks that were due yesterday OR completed yesterday
  const rows = db.prepare(`
    SELECT * FROM tasks
    WHERE due_date = date('now', '-1 day')
       OR (completed_at >= date('now', '-1 day') AND completed_at < date('now'))
    ORDER BY completed DESC, priority_tier ASC NULLS LAST
  `).all() as Task[];

  const completed: TaskWithGoals[] = [];
  const incomplete: TaskWithGoals[] = [];

  for (const row of rows) {
    const task = enrichTask(row);
    if (task.completed) {
      completed.push(task);
    } else {
      incomplete.push(task);
    }
  }

  log.info('Yesterday summary', { completed: completed.length, incomplete: incomplete.length });
  return { completed, incomplete };
}

/**
 * Get tasks available for today's plan:
 * overdue + due today + priority tier 1 + unsorted important
 */
export function getAvailableTasks(): TaskWithGoals[] {
  log.info('Getting available tasks for planning');
  const db = getDb();

  const rows = db.prepare(`
    SELECT * FROM tasks
    WHERE completed = 0
      AND (
        due_date <= date('now')
        OR priority_tier = 1
        OR (due_date IS NULL AND priority_tier <= 2)
      )
    ORDER BY priority_tier ASC NULLS LAST, due_date ASC NULLS LAST
  `).all() as Task[];

  const tasks = rows.map(enrichTask);
  log.info('Available tasks', { count: tasks.length });
  return tasks;
}

/**
 * Get an overview of today's schedule.
 */
export function getTodayOverview(): TodayOverview {
  log.info('Getting today overview');
  const db = getDb();

  const rows = db.prepare(`
    SELECT * FROM tasks
    WHERE completed = 0
      AND due_date = date('now')
    ORDER BY due_time ASC NULLS LAST, priority_tier ASC NULLS LAST
  `).all() as Task[];

  const scheduled: TaskWithGoals[] = [];
  const unscheduled: TaskWithGoals[] = [];
  let totalMinutes = 0;

  for (const row of rows) {
    const task = enrichTask(row);
    totalMinutes += task.estimated_minutes || 0;
    if (task.due_time) {
      scheduled.push(task);
    } else {
      unscheduled.push(task);
    }
  }

  log.info('Today overview', {
    scheduled: scheduled.length,
    unscheduled: unscheduled.length,
    totalMinutes,
  });

  return { scheduled, unscheduled, totalMinutes };
}

/**
 * Get the last date the daily planning was completed.
 */
export function getLastPlanningDate(): string | null {
  const settings = getSettings();
  return settings.planning?.lastPlanningDate ?? null;
}

/**
 * Set the last date the daily planning was completed.
 */
export function setLastPlanningDate(date: string): void {
  log.info('Setting last planning date', { date });
  const settings = getSettings();
  setSettings({
    planning: {
      ...settings.planning,
      lastPlanningDate: date,
    },
  });
}
