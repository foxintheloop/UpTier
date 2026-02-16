import { getDb } from './database';
import { getSettings, setSettings } from './settings';
import { createScopedLogger } from './logger';
import type { Task, TaskWithGoals } from '@uptier/shared';

const log = createScopedLogger('planning');

interface PreviousDaySummary {
  completed: TaskWithGoals[];
  incomplete: TaskWithGoals[];
}

interface DayOverview {
  scheduled: TaskWithGoals[];
  unscheduled: TaskWithGoals[];
  totalMinutes: number;
}

function getToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function subtractOneDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid DST issues
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
 * Get the previous day's completed and incomplete tasks relative to targetDate.
 * If targetDate is tomorrow, this returns "today's" tasks.
 */
export function getPreviousDaySummary(targetDate?: string): PreviousDaySummary {
  const target = targetDate || getToday();
  const previousDay = subtractOneDay(target);
  log.info('Getting previous day summary', { targetDate: target, previousDay });
  const db = getDb();

  const rows = db.prepare(`
    SELECT * FROM tasks
    WHERE due_date = ?
       OR (completed_at >= ? AND completed_at < ?)
    ORDER BY completed DESC, priority_tier ASC NULLS LAST
  `).all(previousDay, previousDay, target) as Task[];

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

  log.info('Previous day summary', { completed: completed.length, incomplete: incomplete.length });
  return { completed, incomplete };
}

/**
 * Get tasks available for planning on targetDate:
 * overdue (relative to targetDate) + due on targetDate + priority tier 1 + unsorted important
 */
export function getAvailableTasks(targetDate?: string): TaskWithGoals[] {
  const target = targetDate || getToday();
  log.info('Getting available tasks for planning', { targetDate: target });
  const db = getDb();

  const rows = db.prepare(`
    SELECT * FROM tasks
    WHERE completed = 0
      AND (
        due_date <= ?
        OR priority_tier = 1
        OR (due_date IS NULL AND priority_tier <= 2)
      )
    ORDER BY priority_tier ASC NULLS LAST, due_date ASC NULLS LAST
  `).all(target) as Task[];

  const tasks = rows.map(enrichTask);
  log.info('Available tasks', { count: tasks.length });
  return tasks;
}

/**
 * Get an overview of a specific day's schedule.
 */
export function getDayOverview(targetDate?: string): DayOverview {
  const target = targetDate || getToday();
  log.info('Getting day overview', { targetDate: target });
  const db = getDb();

  const rows = db.prepare(`
    SELECT * FROM tasks
    WHERE completed = 0
      AND due_date = ?
    ORDER BY due_time ASC NULLS LAST, priority_tier ASC NULLS LAST
  `).all(target) as Task[];

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

  log.info('Day overview', {
    scheduled: scheduled.length,
    unscheduled: unscheduled.length,
    totalMinutes,
  });

  return { scheduled, unscheduled, totalMinutes };
}

/**
 * Get the last date the daily planning was completed (for auto-launch).
 */
export function getLastPlanningDate(): string | null {
  const settings = getSettings();
  return settings.planning?.lastPlanningDate ?? null;
}

/**
 * Set the last date the daily planning was completed (for auto-launch).
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

/**
 * Get all dates that have been planned.
 */
export function getPlannedDates(): string[] {
  const settings = getSettings();
  return settings.planning?.plannedDates ?? [];
}

/**
 * Record a date as planned. Deduplicates and trims to 90 entries.
 */
export function addPlannedDate(date: string): void {
  log.info('Adding planned date', { date });
  const settings = getSettings();
  const existing = settings.planning?.plannedDates ?? [];
  const deduped = existing.filter(d => d !== date);
  deduped.push(date);
  // Keep only the most recent 90 entries
  const trimmed = deduped.slice(-90);
  setSettings({
    planning: {
      ...settings.planning,
      plannedDates: trimmed,
    },
  });
}
