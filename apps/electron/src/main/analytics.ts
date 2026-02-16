import { getDb } from './database';
import { getSettings } from './settings';
import { createScopedLogger } from './logger';
import type {
  TodaySummary,
  WeeklyTrend,
  StreakInfo,
  FocusGoalProgress,
  DashboardData,
} from '@uptier/shared';

const log = createScopedLogger('analytics');

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

export function getTodaySummary(): TodaySummary {
  const db = getDb();
  const today = getToday();
  log.info('Getting today summary', { today });

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

  return {
    completedCount: completed.cnt,
    plannedCount: planned.cnt,
    completionRate,
    focusMinutes: focus.total,
    tierBreakdown: tiers,
  };
}

export function getWeeklyTrend(): WeeklyTrend {
  const db = getDb();
  const today = getToday();
  const weekAgo = subtractDays(today, 6);
  log.info('Getting weekly trend', { from: weekAgo, to: today });

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

  const days: WeeklyTrend['days'] = [];
  for (let i = 6; i >= 0; i--) {
    const date = subtractDays(today, i);
    days.push({
      date,
      dayLabel: getDayLabel(date),
      completedCount: countMap.get(date) || 0,
    });
  }

  return { days };
}

export function getStreakInfo(): StreakInfo {
  const db = getDb();
  const today = getToday();
  log.info('Getting streak info');

  const rows = db.prepare(`
    SELECT DISTINCT date(completed_at) as day
    FROM tasks
    WHERE completed = 1 AND completed_at IS NOT NULL
    ORDER BY day DESC
    LIMIT 365
  `).all() as Array<{ day: string }>;

  if (rows.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastCompletionDate: null, milestoneReached: null };
  }

  const lastCompletionDate = rows[0].day;
  const dateSet = new Set(rows.map(r => r.day));

  // Calculate current streak: walk backwards from today
  let currentStreak = 0;
  let checkDate = today;

  // If today has no completions, check if yesterday does (streak might still be active)
  if (!dateSet.has(today)) {
    const yesterday = subtractDays(today, 1);
    if (dateSet.has(yesterday)) {
      checkDate = yesterday;
    } else {
      // No recent completions — streak is 0
      const longestStreak = calculateLongestStreak(rows);
      return { currentStreak: 0, longestStreak, lastCompletionDate, milestoneReached: null };
    }
  }

  while (dateSet.has(checkDate)) {
    currentStreak++;
    checkDate = subtractDays(checkDate, 1);
  }

  const longestStreak = calculateLongestStreak(rows);

  // Check milestones
  const milestones = [100, 30, 7];
  let milestoneReached: number | null = null;
  for (const m of milestones) {
    if (currentStreak === m) {
      milestoneReached = m;
      break;
    }
  }

  return { currentStreak, longestStreak, lastCompletionDate, milestoneReached };
}

function calculateLongestStreak(rows: Array<{ day: string }>): number {
  if (rows.length === 0) return 0;

  // Sort ascending
  const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day));
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].day;
    const curr = sorted[i].day;
    const expectedNext = subtractDays(curr, -0); // curr itself
    const dayAfterPrev = subtractDays(prev, -1); // prev + 1

    if (dayAfterPrev === curr) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export function getFocusGoalProgress(): FocusGoalProgress {
  const db = getDb();
  const today = getToday();
  const settings = getSettings();
  const dailyGoalMinutes = settings.analytics?.dailyFocusGoalMinutes ?? 120;

  const focus = db.prepare(
    `SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions WHERE date(started_at) = ? AND completed = 1`
  ).get(today) as { total: number };

  const progressPercent = dailyGoalMinutes > 0
    ? Math.round((focus.total / dailyGoalMinutes) * 100)
    : 0;

  return {
    dailyGoalMinutes,
    todayMinutes: focus.total,
    progressPercent,
  };
}

export function getDashboardData(): DashboardData {
  log.info('Getting dashboard data');
  return {
    todaySummary: getTodaySummary(),
    weeklyTrend: getWeeklyTrend(),
    streak: getStreakInfo(),
    focusGoal: getFocusGoalProgress(),
  };
}

export function checkAllDailyTasksCompleted(): boolean {
  const db = getDb();
  const today = getToday();

  const result = db.prepare(`
    SELECT COUNT(*) as total,
           COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0) as done
    FROM tasks WHERE due_date = ?
  `).get(today) as { total: number; done: number };

  return result.total > 0 && result.done === result.total;
}
