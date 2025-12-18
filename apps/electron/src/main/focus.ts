import { getDb, generateId, nowISO } from './database';
import { createScopedLogger } from './logger';
import type { FocusSession, StartFocusSessionInput, FocusSessionWithTask } from '@uptier/shared';

const focusLog = createScopedLogger('focus');

// ============================================================================
// Focus Sessions
// ============================================================================

export function startFocusSession(input: StartFocusSessionInput): FocusSession {
  const db = getDb();
  const id = generateId();
  const now = nowISO();

  focusLog.debug('Starting focus session', { taskId: input.task_id, duration: input.duration_minutes });

  db.prepare(`
    INSERT INTO focus_sessions (id, task_id, duration_minutes, started_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, input.task_id, input.duration_minutes, now, now);

  focusLog.info('Focus session started', { id, taskId: input.task_id, duration: input.duration_minutes });

  const session = db.prepare('SELECT * FROM focus_sessions WHERE id = ?').get(id) as FocusSession;
  return {
    ...session,
    completed: Boolean(session.completed),
  };
}

export function endFocusSession(id: string, completed: boolean): FocusSession | null {
  const db = getDb();
  const now = nowISO();

  focusLog.debug('Ending focus session', { id, completed });

  db.prepare(`
    UPDATE focus_sessions
    SET ended_at = ?, completed = ?
    WHERE id = ?
  `).run(now, completed ? 1 : 0, id);

  focusLog.info('Focus session ended', { id, completed });

  const session = db.prepare('SELECT * FROM focus_sessions WHERE id = ?').get(id) as FocusSession | undefined;
  if (!session) return null;

  return {
    ...session,
    completed: Boolean(session.completed),
  };
}

export function getActiveFocusSession(): FocusSessionWithTask | null {
  const db = getDb();

  const session = db.prepare(`
    SELECT fs.*, t.title as task_title
    FROM focus_sessions fs
    JOIN tasks t ON t.id = fs.task_id
    WHERE fs.ended_at IS NULL
    ORDER BY fs.started_at DESC
    LIMIT 1
  `).get() as (FocusSession & { task_title: string }) | undefined;

  if (!session) return null;

  return {
    ...session,
    completed: Boolean(session.completed),
  };
}

export function getFocusSessions(taskId?: string): FocusSessionWithTask[] {
  const db = getDb();

  let sql = `
    SELECT fs.*, t.title as task_title
    FROM focus_sessions fs
    JOIN tasks t ON t.id = fs.task_id
  `;
  const params: unknown[] = [];

  if (taskId) {
    sql += ' WHERE fs.task_id = ?';
    params.push(taskId);
  }

  sql += ' ORDER BY fs.started_at DESC LIMIT 100';

  const sessions = db.prepare(sql).all(...params) as Array<FocusSession & { task_title: string }>;

  return sessions.map((session) => ({
    ...session,
    completed: Boolean(session.completed),
  }));
}

export function deleteFocusSession(id: string): boolean {
  const db = getDb();
  focusLog.debug('Deleting focus session', { id });

  const result = db.prepare('DELETE FROM focus_sessions WHERE id = ?').run(id);
  const success = result.changes > 0;

  if (success) {
    focusLog.info('Focus session deleted', { id });
  }

  return success;
}
