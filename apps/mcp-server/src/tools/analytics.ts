import { z } from 'zod';
import { getDb } from '../database.js';

// ============================================================================
// Helpers
// ============================================================================

function getToday(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function subtractDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

// ============================================================================
// Schemas
// ============================================================================

const getProductivityDashboardSchema = z.object({});

const getStreakInfoSchema = z.object({});

const getWeeklyTrendSchema = z.object({});

// ============================================================================
// Handlers
// ============================================================================

function getProductivityDashboard() {
  const db = getDb();
  const today = getToday();

  // Today summary
  const completed = db.prepare(
    `SELECT COUNT(*) as cnt FROM tasks WHERE completed = 1 AND date(completed_at) = ?`
  ).get(today) as { cnt: number };

  const planned = db.prepare(
    `SELECT COUNT(*) as cnt FROM tasks WHERE due_date = ?`
  ).get(today) as { cnt: number };

  const focus = db.prepare(
    `SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions WHERE date(started_at) = ? AND completed = 1`
  ).get(today) as { total: number };

  const tiers = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN priority_tier = 1 THEN 1 ELSE 0 END), 0) as tier1,
      COALESCE(SUM(CASE WHEN priority_tier = 2 THEN 1 ELSE 0 END), 0) as tier2,
      COALESCE(SUM(CASE WHEN priority_tier = 3 THEN 1 ELSE 0 END), 0) as tier3,
      COALESCE(SUM(CASE WHEN priority_tier IS NULL THEN 1 ELSE 0 END), 0) as unset
    FROM tasks WHERE due_date = ?
  `).get(today) as { tier1: number; tier2: number; tier3: number; unset: number };

  const completionRate = planned.cnt > 0
    ? Math.round((completed.cnt / planned.cnt) * 100)
    : 0;

  // Weekly trend
  const weekAgo = subtractDays(today, 6);
  const weekRows = db.prepare(`
    SELECT date(completed_at) as day, COUNT(*) as cnt
    FROM tasks
    WHERE completed = 1
      AND completed_at IS NOT NULL
      AND date(completed_at) >= ?
      AND date(completed_at) <= ?
    GROUP BY date(completed_at)
  `).all(weekAgo, today) as Array<{ day: string; cnt: number }>;

  const countMap = new Map<string, number>();
  for (const row of weekRows) {
    countMap.set(row.day, row.cnt);
  }

  const weeklyDays = [];
  for (let i = 6; i >= 0; i--) {
    const date = subtractDays(today, i);
    weeklyDays.push({
      date,
      day_label: getDayLabel(date),
      completed_count: countMap.get(date) || 0,
    });
  }

  // Streak
  const streakRows = db.prepare(`
    SELECT DISTINCT date(completed_at) as day
    FROM tasks
    WHERE completed = 1 AND completed_at IS NOT NULL
    ORDER BY day DESC
    LIMIT 365
  `).all() as Array<{ day: string }>;

  let currentStreak = 0;
  let longestStreak = 0;
  const lastCompletionDate = streakRows.length > 0 ? streakRows[0].day : null;

  if (streakRows.length > 0) {
    const dateSet = new Set(streakRows.map(r => r.day));
    let checkDate = today;

    if (!dateSet.has(today)) {
      const yesterday = subtractDays(today, 1);
      if (dateSet.has(yesterday)) {
        checkDate = yesterday;
      }
    }

    if (dateSet.has(checkDate)) {
      while (dateSet.has(checkDate)) {
        currentStreak++;
        checkDate = subtractDays(checkDate, 1);
      }
    }

    // Longest streak
    const sorted = [...streakRows].sort((a, b) => a.day.localeCompare(b.day));
    let current = 1;
    longestStreak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const dayAfterPrev = subtractDays(sorted[i - 1].day, -1);
      if (dayAfterPrev === sorted[i].day) {
        current++;
        longestStreak = Math.max(longestStreak, current);
      } else {
        current = 1;
      }
    }
  }

  return {
    date: today,
    today_summary: {
      completed_count: completed.cnt,
      planned_count: planned.cnt,
      completion_rate: completionRate,
      focus_minutes: focus.total,
      tier_breakdown: tiers,
    },
    weekly_trend: weeklyDays,
    streak: {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_completion_date: lastCompletionDate,
    },
  };
}

function getStreakInfoHandler() {
  const db = getDb();
  const today = getToday();

  const rows = db.prepare(`
    SELECT DISTINCT date(completed_at) as day
    FROM tasks
    WHERE completed = 1 AND completed_at IS NOT NULL
    ORDER BY day DESC
    LIMIT 365
  `).all() as Array<{ day: string }>;

  if (rows.length === 0) {
    return {
      current_streak: 0,
      longest_streak: 0,
      last_completion_date: null,
    };
  }

  const lastCompletionDate = rows[0].day;
  const dateSet = new Set(rows.map(r => r.day));

  let currentStreak = 0;
  let checkDate = today;

  if (!dateSet.has(today)) {
    const yesterday = subtractDays(today, 1);
    if (dateSet.has(yesterday)) {
      checkDate = yesterday;
    }
  }

  if (dateSet.has(checkDate)) {
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = subtractDays(checkDate, 1);
    }
  }

  const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day));
  let longestStreak = rows.length > 0 ? 1 : 0;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const dayAfterPrev = subtractDays(sorted[i - 1].day, -1);
    if (dayAfterPrev === sorted[i].day) {
      current++;
      longestStreak = Math.max(longestStreak, current);
    } else {
      current = 1;
    }
  }

  return {
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_completion_date: lastCompletionDate,
  };
}

function getWeeklyTrendHandler() {
  const db = getDb();
  const today = getToday();
  const weekAgo = subtractDays(today, 6);

  const rows = db.prepare(`
    SELECT date(completed_at) as day, COUNT(*) as cnt
    FROM tasks
    WHERE completed = 1
      AND completed_at IS NOT NULL
      AND date(completed_at) >= ?
      AND date(completed_at) <= ?
    GROUP BY date(completed_at)
  `).all(weekAgo, today) as Array<{ day: string; cnt: number }>;

  const countMap = new Map<string, number>();
  for (const row of rows) {
    countMap.set(row.day, row.cnt);
  }

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = subtractDays(today, i);
    days.push({
      date,
      day_label: getDayLabel(date),
      completed_count: countMap.get(date) || 0,
    });
  }

  const totalWeek = days.reduce((sum, d) => sum + d.completed_count, 0);

  return {
    period: `${weekAgo} to ${today}`,
    total_completions: totalWeek,
    daily_average: Math.round((totalWeek / 7) * 10) / 10,
    days,
  };
}

// ============================================================================
// Export tools
// ============================================================================

export const analyticsTools = {
  get_productivity_dashboard: {
    description: 'Get a comprehensive productivity dashboard with today\'s summary (completed tasks, completion rate, focus time, priority breakdown), 7-day completion trend, and streak information.',
    inputSchema: getProductivityDashboardSchema,
    handler: () => getProductivityDashboard(),
  },

  get_streak_info: {
    description: 'Get the user\'s current task completion streak (consecutive days with at least one completed task) and their longest streak.',
    inputSchema: getStreakInfoSchema,
    handler: () => getStreakInfoHandler(),
  },

  get_weekly_trend: {
    description: 'Get the 7-day task completion trend showing how many tasks were completed each day over the past week.',
    inputSchema: getWeeklyTrendSchema,
    handler: () => getWeeklyTrendHandler(),
  },
};
