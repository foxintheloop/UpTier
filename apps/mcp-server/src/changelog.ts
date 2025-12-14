import { appendFileSync, existsSync, mkdirSync, statSync, truncateSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CHANGELOG_DIR = join(homedir(), '.uptier');
const CHANGELOG_PATH = join(CHANGELOG_DIR, 'db.changelog');
const MAX_SIZE_BYTES = 100 * 1024; // 100KB max, then truncate

export type ChangeType = 'task' | 'list' | 'goal' | 'subtask' | 'tag';
export type ChangeOp = 'create' | 'update' | 'delete' | 'complete' | 'bulk';

interface ChangeEntry {
  ts: string;
  type: ChangeType;
  op: ChangeOp;
  id?: string;
}

/**
 * Notify the Electron app that data has changed.
 * Writes a changelog entry that the Electron app watches for near-instant updates.
 */
export function notifyChange(type: ChangeType, op: ChangeOp, id?: string): void {
  try {
    // Ensure directory exists
    if (!existsSync(CHANGELOG_DIR)) {
      mkdirSync(CHANGELOG_DIR, { recursive: true });
    }

    // Create file if it doesn't exist
    if (!existsSync(CHANGELOG_PATH)) {
      writeFileSync(CHANGELOG_PATH, '');
    }

    // Truncate if too large (prevents unbounded growth)
    const stats = statSync(CHANGELOG_PATH);
    if (stats.size > MAX_SIZE_BYTES) {
      truncateSync(CHANGELOG_PATH, 0);
    }

    const entry: ChangeEntry = {
      ts: new Date().toISOString(),
      type,
      op,
      id,
    };

    appendFileSync(CHANGELOG_PATH, JSON.stringify(entry) + '\n');
  } catch {
    // Silent fail - don't break MCP operations for changelog
    // The database file watcher is a fallback anyway
  }
}
