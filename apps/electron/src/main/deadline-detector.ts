import { getDb } from './database';
import { createScopedLogger } from './logger';

const log = createScopedLogger('deadline-detector');

export interface AtRiskTask {
  id: string;
  title: string;
  due_date: string;
  due_time: string | null;
  estimated_minutes: number;
  remaining_minutes: number;
  risk_level: 'warning' | 'critical';
  reason: string;
}

/**
 * Get tasks that are at risk of missing their deadlines.
 * - critical: remaining time < estimated time
 * - warning: remaining time < 2x estimated time
 */
export function getAtRiskTasks(): AtRiskTask[] {
  log.info('Checking for at-risk tasks');
  const db = getDb();

  const rows = db.prepare(`
    SELECT id, title, due_date, due_time, estimated_minutes
    FROM tasks
    WHERE completed = 0
      AND due_date IS NOT NULL
      AND estimated_minutes IS NOT NULL
      AND due_date <= date('now', '+7 days')
  `).all() as Array<{
    id: string;
    title: string;
    due_date: string;
    due_time: string | null;
    estimated_minutes: number;
  }>;

  const now = Date.now();
  const atRisk: AtRiskTask[] = [];

  for (const row of rows) {
    // Build the deadline timestamp
    let deadlineStr = `${row.due_date}T`;
    if (row.due_time) {
      deadlineStr += row.due_time;
    } else {
      deadlineStr += '23:59';
    }

    const deadline = new Date(deadlineStr).getTime();
    const remainingMinutes = Math.max(0, Math.floor((deadline - now) / (1000 * 60)));

    if (remainingMinutes >= row.estimated_minutes * 2) {
      continue; // Plenty of buffer, not at risk
    }

    let riskLevel: 'warning' | 'critical';
    let reason: string;

    if (remainingMinutes < row.estimated_minutes) {
      riskLevel = 'critical';
      reason = `Only ${formatDuration(remainingMinutes)} left but task needs ~${formatDuration(row.estimated_minutes)}`;
    } else {
      riskLevel = 'warning';
      reason = `${formatDuration(remainingMinutes)} left for a ~${formatDuration(row.estimated_minutes)} task — tight buffer`;
    }

    atRisk.push({
      id: row.id,
      title: row.title,
      due_date: row.due_date,
      due_time: row.due_time,
      estimated_minutes: row.estimated_minutes,
      remaining_minutes: remainingMinutes,
      risk_level: riskLevel,
      reason,
    });
  }

  log.info('At-risk check complete', { total: rows.length, atRisk: atRisk.length });
  return atRisk;
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}
