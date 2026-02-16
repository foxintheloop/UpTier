import { z } from 'zod';
import { getDb } from '../database.js';
import { notifyChange } from '../changelog.js';
import { getTaskById } from './tasks.js';

// ============================================================================
// Constants (must match DayView.tsx)
// ============================================================================

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const SNAP_MINUTES = 15;
const DEFAULT_DURATION = 30;

// ============================================================================
// Helpers
// ============================================================================

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function snapToGrid(timeStr: string): string {
  const total = timeToMinutes(timeStr);
  const snapped = Math.round(total / SNAP_MINUTES) * SNAP_MINUTES;
  return minutesToTime(snapped);
}

function computeEndTime(startTime: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(startTime) + durationMinutes);
}

// ============================================================================
// Schemas
// ============================================================================

const getDailyPlanningContextSchema = z.object({
  date: z.string().optional().describe('Target date in YYYY-MM-DD format. Defaults to today if not provided.'),
});

const getDayScheduleSchema = z.object({
  date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today if not provided.'),
});

const scheduleTasksSchema = z.object({
  tasks: z.array(z.object({
    task_id: z.string().describe('The task ID to schedule'),
    date: z.string().describe('Date in YYYY-MM-DD format'),
    start_time: z.string().describe('Start time in HH:MM 24-hour format (e.g., "09:00", "14:30"). Must be between 06:00 and 22:00. Times snap to 15-minute intervals.'),
    duration_minutes: z.number().optional().describe('Duration in minutes (e.g., 30, 60, 90). Minimum 15. If not provided, uses the task\'s existing estimated_minutes or defaults to 30.'),
  })).min(1).describe('Array of tasks to schedule on the day planner grid'),
});

const unscheduleTaskSchema = z.object({
  task_id: z.string().describe('The task ID to remove from the day planner time grid'),
});

// ============================================================================
// Handlers
// ============================================================================

function getDaySchedule(input: z.infer<typeof getDayScheduleSchema>) {
  const db = getDb();
  const date = input.date || getTodayDate();

  const rows = db.prepare(`
    SELECT t.id, t.title, t.due_time, t.estimated_minutes, t.priority_tier, t.energy_required, l.name as list_name
    FROM tasks t
    LEFT JOIN lists l ON t.list_id = l.id
    WHERE t.due_date = ? AND t.completed = 0
    ORDER BY t.due_time ASC NULLS LAST, t.priority_tier ASC NULLS LAST
  `).all(date) as Array<{
    id: string;
    title: string;
    due_time: string | null;
    estimated_minutes: number | null;
    priority_tier: number | null;
    energy_required: string | null;
    list_name: string | null;
  }>;

  const scheduled: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    priority_tier: number | null;
    energy_required: string | null;
    list_name: string | null;
  }> = [];

  const unscheduled: Array<{
    id: string;
    title: string;
    estimated_minutes: number | null;
    needs_estimate: boolean;
    priority_tier: number | null;
    energy_required: string | null;
    list_name: string | null;
  }> = [];

  for (const row of rows) {
    if (row.due_time) {
      const duration = row.estimated_minutes || DEFAULT_DURATION;
      scheduled.push({
        id: row.id,
        title: row.title,
        start_time: row.due_time,
        end_time: computeEndTime(row.due_time, duration),
        duration_minutes: duration,
        priority_tier: row.priority_tier,
        energy_required: row.energy_required,
        list_name: row.list_name,
      });
    } else {
      unscheduled.push({
        id: row.id,
        title: row.title,
        estimated_minutes: row.estimated_minutes,
        needs_estimate: row.estimated_minutes === null,
        priority_tier: row.priority_tier,
        energy_required: row.energy_required,
        list_name: row.list_name,
      });
    }
  }

  // Compute free blocks between scheduled tasks within working hours
  const dayStartMin = DAY_START_HOUR * 60;
  const dayEndMin = DAY_END_HOUR * 60;
  const freeBlocks: Array<{ start: string; end: string; duration_minutes: number }> = [];

  let cursor = dayStartMin;
  for (const task of scheduled) {
    const taskStart = timeToMinutes(task.start_time);
    const taskEnd = timeToMinutes(task.end_time);
    if (taskStart > cursor) {
      const gapStart = Math.max(cursor, dayStartMin);
      const gapEnd = Math.min(taskStart, dayEndMin);
      if (gapEnd > gapStart) {
        freeBlocks.push({
          start: minutesToTime(gapStart),
          end: minutesToTime(gapEnd),
          duration_minutes: gapEnd - gapStart,
        });
      }
    }
    cursor = Math.max(cursor, taskEnd);
  }
  if (cursor < dayEndMin) {
    freeBlocks.push({
      start: minutesToTime(cursor),
      end: minutesToTime(dayEndMin),
      duration_minutes: dayEndMin - cursor,
    });
  }

  const totalScheduledMinutes = scheduled.reduce((sum, t) => sum + t.duration_minutes, 0);
  const totalFreeMinutes = freeBlocks.reduce((sum, b) => sum + b.duration_minutes, 0);

  return {
    success: true,
    date,
    scheduled_tasks: scheduled,
    unscheduled_tasks: unscheduled,
    free_blocks: freeBlocks,
    summary: {
      total_scheduled: scheduled.length,
      total_unscheduled: unscheduled.length,
      total_scheduled_minutes: totalScheduledMinutes,
      total_free_minutes: totalFreeMinutes,
    },
  };
}

function scheduleTasks(input: z.infer<typeof scheduleTasksSchema>) {
  const db = getDb();
  const results: Array<{
    task_id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
  }> = [];

  const transaction = db.transaction(() => {
    for (const item of input.tasks) {
      const existing = getTaskById(item.task_id);
      if (!existing) {
        throw new Error(`Task not found: ${item.task_id}`);
      }

      const snappedTime = snapToGrid(item.start_time);
      const duration = Math.max(15, item.duration_minutes ?? existing.estimated_minutes ?? DEFAULT_DURATION);

      db.prepare(
        'UPDATE tasks SET due_date = ?, due_time = ?, estimated_minutes = ?, updated_at = ? WHERE id = ?'
      ).run(item.date, snappedTime, duration, new Date().toISOString(), item.task_id);

      results.push({
        task_id: item.task_id,
        title: existing.title,
        date: item.date,
        start_time: snappedTime,
        end_time: computeEndTime(snappedTime, duration),
        duration_minutes: duration,
      });
    }
  });

  transaction();
  notifyChange('task', 'bulk');

  return { success: true, scheduled: results, count: results.length };
}

function unscheduleTask(input: z.infer<typeof unscheduleTaskSchema>) {
  const db = getDb();
  const existing = getTaskById(input.task_id);
  if (!existing) {
    return { success: false, error: `Task not found: ${input.task_id}` };
  }

  db.prepare(
    'UPDATE tasks SET due_time = NULL, updated_at = ? WHERE id = ?'
  ).run(new Date().toISOString(), input.task_id);

  notifyChange('task', 'update', input.task_id);

  return { success: true, task_id: input.task_id, title: existing.title };
}

// ============================================================================
// Tool Definitions for MCP
// ============================================================================

export const scheduleTools = {
  get_day_schedule: {
    description: `Get the day planner schedule for a specific date. Returns scheduled tasks (time blocks on the planner grid), unscheduled tasks (in the sidebar), and available free time blocks.

IMPORTANT workflow when the user asks to schedule their day:
1. Call this tool first to see the current state
2. Ask the user what time they want to START their day
3. Check unscheduled_tasks — any with needs_estimate=true have no duration. Ask the user how long those tasks will take before scheduling them.
4. Then use schedule_tasks to place tasks at specific times on the planner grid.`,
    inputSchema: getDayScheduleSchema,
    handler: (input: z.infer<typeof getDayScheduleSchema>) => {
      return getDaySchedule(input);
    },
  },

  schedule_tasks: {
    description: `Schedule tasks onto the day planner time grid. Each task gets a specific start time and duration, appearing as a draggable time block on the planner calendar.

Before calling this tool:
1. Use get_day_schedule to see current schedule and free time blocks
2. Ask the user what time they want to start their day if not already known
3. For any tasks without estimated_minutes (needs_estimate=true in get_day_schedule), ask the user how long they will take
4. Arrange tasks sequentially, respecting their durations, within the free blocks`,
    inputSchema: scheduleTasksSchema,
    handler: (input: z.infer<typeof scheduleTasksSchema>) => {
      return scheduleTasks(input);
    },
  },

  unschedule_task: {
    description: 'Remove a task from the day planner time grid. The task keeps its due date but moves from the time grid to the unscheduled sidebar.',
    inputSchema: unscheduleTaskSchema,
    handler: (input: z.infer<typeof unscheduleTaskSchema>) => {
      return unscheduleTask(input);
    },
  },

  get_daily_planning_context: {
    description: `Get full context for daily planning. Returns the previous day's summary (completed + incomplete tasks), the target day's current schedule, available tasks that could be scheduled, and free time blocks. Use this to help the user plan their day by suggesting which tasks to focus on and when to schedule them.

Optionally pass a date to plan a future day (e.g., tomorrow or next Monday). Defaults to today.`,
    inputSchema: getDailyPlanningContextSchema,
    handler: (input: z.infer<typeof getDailyPlanningContextSchema>) => {
      const db = getDb();
      const targetDate = input.date || getTodayDate();

      // Compute previous day relative to target
      const targetDateObj = new Date(targetDate + 'T12:00:00');
      const previousDateObj = new Date(targetDateObj);
      previousDateObj.setDate(previousDateObj.getDate() - 1);
      const previousDateStr = previousDateObj.toISOString().split('T')[0];

      // Previous day's tasks
      const previousDayRows = db.prepare(`
        SELECT id, title, completed, priority_tier, estimated_minutes
        FROM tasks
        WHERE due_date = ? OR (completed_at >= ? AND completed_at < ?)
        ORDER BY completed DESC, priority_tier ASC NULLS LAST
      `).all(previousDateStr, previousDateStr, targetDate) as Array<{
        id: string; title: string; completed: number;
        priority_tier: number | null; estimated_minutes: number | null;
      }>;

      const previousCompleted = previousDayRows.filter((r) => r.completed);
      const previousIncomplete = previousDayRows.filter((r) => !r.completed);

      // Target day's schedule
      const daySchedule = getDaySchedule({ date: targetDate });

      // Available tasks for planning
      const availableRows = db.prepare(`
        SELECT id, title, due_date, priority_tier, estimated_minutes, energy_required
        FROM tasks
        WHERE completed = 0
          AND (
            due_date <= ?
            OR priority_tier = 1
            OR (due_date IS NULL AND priority_tier <= 2)
          )
        ORDER BY priority_tier ASC NULLS LAST, due_date ASC NULLS LAST
      `).all(targetDate) as Array<{
        id: string; title: string; due_date: string | null;
        priority_tier: number | null; estimated_minutes: number | null;
        energy_required: string | null;
      }>;

      return {
        success: true,
        date: targetDate,
        previous_day: {
          date: previousDateStr,
          completed: previousCompleted,
          incomplete: previousIncomplete,
        },
        schedule: daySchedule,
        available_tasks: availableRows,
      };
    },
  },
};
