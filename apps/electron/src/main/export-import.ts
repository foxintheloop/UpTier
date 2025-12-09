import { dialog } from 'electron';
import { writeFileSync, readFileSync } from 'fs';
import { getDb } from './database';
import { createScopedLogger } from './logger';
import type {
  List,
  Task,
  Goal,
  Subtask,
  Tag,
} from '@uptier/shared';

const log = createScopedLogger('export-import');

// Export format version for future compatibility
const EXPORT_VERSION = '1.0';

interface TaskGoalRelation {
  task_id: string;
  goal_id: string;
  alignment_strength: number;
}

interface TaskTagRelation {
  task_id: string;
  tag_id: string;
}

export interface UpTierExport {
  version: string;
  exportedAt: string;
  appVersion: string;
  data: {
    lists: List[];
    tasks: Task[];
    goals: Goal[];
    subtasks: Subtask[];
    tags: Tag[];
    task_goals: TaskGoalRelation[];
    task_tags: TaskTagRelation[];
  };
  metadata: {
    listCount: number;
    taskCount: number;
    goalCount: number;
    subtaskCount: number;
    tagCount: number;
  };
}

export interface ImportPreview {
  format: 'uptier' | 'todoist' | 'unknown';
  valid: boolean;
  error?: string;
  counts: {
    lists: number;
    tasks: number;
    goals: number;
    subtasks: number;
    tags: number;
  };
}

export interface ImportResult {
  success: boolean;
  error?: string;
  imported: {
    lists: number;
    tasks: number;
    goals: number;
    subtasks: number;
    tags: number;
  };
}

/**
 * Export all data to JSON format
 */
export function exportToJson(): UpTierExport {
  log.info('Starting JSON export');
  const db = getDb();

  const lists = db.prepare('SELECT * FROM lists WHERE is_smart_list = 0').all() as List[];
  const tasks = db.prepare('SELECT * FROM tasks').all() as Task[];
  const goals = db.prepare('SELECT * FROM goals').all() as Goal[];
  const subtasks = db.prepare('SELECT * FROM subtasks').all() as Subtask[];
  const tags = db.prepare('SELECT * FROM tags').all() as Tag[];
  const task_goals = db.prepare('SELECT * FROM task_goals').all() as TaskGoalRelation[];
  const task_tags = db.prepare('SELECT * FROM task_tags').all() as TaskTagRelation[];

  const exportData: UpTierExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    data: {
      lists,
      tasks,
      goals,
      subtasks,
      tags,
      task_goals,
      task_tags,
    },
    metadata: {
      listCount: lists.length,
      taskCount: tasks.length,
      goalCount: goals.length,
      subtaskCount: subtasks.length,
      tagCount: tags.length,
    },
  };

  log.info('JSON export complete', exportData.metadata);
  return exportData;
}

/**
 * Export tasks to CSV format (flattened)
 */
export function exportToCsv(): string {
  log.info('Starting CSV export');
  const db = getDb();

  // Get tasks with list names, goal names, and tag names
  const tasks = db.prepare(`
    SELECT
      t.*,
      l.name as list_name,
      GROUP_CONCAT(DISTINCT g.name) as goal_names,
      GROUP_CONCAT(DISTINCT tag.name) as tag_names
    FROM tasks t
    LEFT JOIN lists l ON l.id = t.list_id
    LEFT JOIN task_goals tg ON tg.task_id = t.id
    LEFT JOIN goals g ON g.id = tg.goal_id
    LEFT JOIN task_tags tt ON tt.task_id = t.id
    LEFT JOIN tags tag ON tag.id = tt.tag_id
    GROUP BY t.id
    ORDER BY l.position, t.position
  `).all() as Array<Task & { list_name: string; goal_names: string | null; tag_names: string | null }>;

  // CSV header
  const headers = [
    'id', 'list_name', 'title', 'notes', 'due_date', 'due_time',
    'completed', 'completed_at', 'priority_tier', 'priority_reasoning',
    'effort_score', 'impact_score', 'urgency_score', 'importance_score',
    'estimated_minutes', 'energy_required', 'goals', 'tags',
    'created_at', 'updated_at'
  ];

  const rows = tasks.map(task => [
    task.id,
    task.list_name,
    escapeCsvField(task.title),
    escapeCsvField(task.notes || ''),
    task.due_date || '',
    task.due_time || '',
    task.completed ? 'true' : 'false',
    task.completed_at || '',
    task.priority_tier?.toString() || '',
    escapeCsvField(task.priority_reasoning || ''),
    task.effort_score?.toString() || '',
    task.impact_score?.toString() || '',
    task.urgency_score?.toString() || '',
    task.importance_score?.toString() || '',
    task.estimated_minutes?.toString() || '',
    task.energy_required || '',
    escapeCsvField(task.goal_names || ''),
    escapeCsvField(task.tag_names || ''),
    task.created_at,
    task.updated_at,
  ]);

  const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

  log.info('CSV export complete', { taskCount: tasks.length });
  return csv;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export to file with save dialog
 */
export async function exportToFile(format: 'json' | 'csv'): Promise<{ success: boolean; filePath?: string }> {
  log.info('Starting export to file', { format });

  const result = await dialog.showSaveDialog({
    title: `Export Tasks as ${format.toUpperCase()}`,
    defaultPath: `uptier-export-${new Date().toISOString().split('T')[0]}.${format}`,
    filters: [
      format === 'json'
        ? { name: 'JSON Files', extensions: ['json'] }
        : { name: 'CSV Files', extensions: ['csv'] }
    ],
  });

  if (result.canceled || !result.filePath) {
    log.info('Export cancelled by user');
    return { success: false };
  }

  try {
    const data = format === 'json'
      ? JSON.stringify(exportToJson(), null, 2)
      : exportToCsv();

    writeFileSync(result.filePath, data, 'utf-8');
    log.info('Export saved to file', { filePath: result.filePath });
    return { success: true, filePath: result.filePath };
  } catch (error) {
    log.error('Failed to save export file', error as Error);
    return { success: false };
  }
}

/**
 * Preview import file before committing
 */
export async function previewImport(filePath: string): Promise<ImportPreview> {
  log.info('Previewing import file', { filePath });

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Detect format
    if (data.version && data.data && data.data.lists && data.data.tasks) {
      // UpTier format
      return {
        format: 'uptier',
        valid: true,
        counts: {
          lists: data.data.lists?.length || 0,
          tasks: data.data.tasks?.length || 0,
          goals: data.data.goals?.length || 0,
          subtasks: data.data.subtasks?.length || 0,
          tags: data.data.tags?.length || 0,
        },
      };
    }

    // Try Todoist format (has projects and items)
    if (data.projects && data.items) {
      return {
        format: 'todoist',
        valid: true,
        counts: {
          lists: data.projects?.length || 0,
          tasks: data.items?.length || 0,
          goals: 0,
          subtasks: 0,
          tags: data.labels?.length || 0,
        },
      };
    }

    return {
      format: 'unknown',
      valid: false,
      error: 'Unrecognized file format',
      counts: { lists: 0, tasks: 0, goals: 0, subtasks: 0, tags: 0 },
    };
  } catch (error) {
    log.error('Failed to preview import', error as Error);
    return {
      format: 'unknown',
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to parse file',
      counts: { lists: 0, tasks: 0, goals: 0, subtasks: 0, tags: 0 },
    };
  }
}

/**
 * Execute import
 */
export async function executeImport(
  filePath: string,
  options: { mode: 'merge' | 'replace' } = { mode: 'merge' }
): Promise<ImportResult> {
  log.info('Executing import', { filePath, mode: options.mode });

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Determine format and import
    if (data.version && data.data) {
      return importUpTierFormat(data, options);
    }

    if (data.projects && data.items) {
      return importTodoistFormat(data, options);
    }

    return {
      success: false,
      error: 'Unrecognized file format',
      imported: { lists: 0, tasks: 0, goals: 0, subtasks: 0, tags: 0 },
    };
  } catch (error) {
    log.error('Import failed', error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Import failed',
      imported: { lists: 0, tasks: 0, goals: 0, subtasks: 0, tags: 0 },
    };
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function importUpTierFormat(
  data: UpTierExport,
  options: { mode: 'merge' | 'replace' }
): ImportResult {
  const db = getDb();
  const idMap = new Map<string, string>();
  const counts = { lists: 0, tasks: 0, goals: 0, subtasks: 0, tags: 0 };

  const transaction = db.transaction(() => {
    if (options.mode === 'replace') {
      // Clear existing data
      db.prepare('DELETE FROM task_tags').run();
      db.prepare('DELETE FROM task_goals').run();
      db.prepare('DELETE FROM subtasks').run();
      db.prepare('DELETE FROM tasks').run();
      db.prepare('DELETE FROM goals').run();
      db.prepare('DELETE FROM tags').run();
      db.prepare('DELETE FROM lists WHERE is_smart_list = 0').run();
    }

    // Import lists
    const listStmt = db.prepare(`
      INSERT INTO lists (id, name, description, icon, color, position, is_smart_list, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);
    for (const list of data.data.lists) {
      const newId = generateId();
      idMap.set(list.id, newId);
      listStmt.run(
        newId, list.name, list.description, list.icon, list.color,
        list.position, list.created_at, list.updated_at
      );
      counts.lists++;
    }

    // Import tags
    const tagStmt = db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)');
    for (const tag of data.data.tags) {
      const newId = generateId();
      idMap.set(tag.id, newId);
      tagStmt.run(newId, tag.name, tag.color);
      counts.tags++;
    }

    // Import goals
    const goalStmt = db.prepare(`
      INSERT INTO goals (id, name, description, timeframe, target_date, parent_goal_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const goal of data.data.goals) {
      const newId = generateId();
      idMap.set(goal.id, newId);
      const parentId = goal.parent_goal_id ? idMap.get(goal.parent_goal_id) : null;
      goalStmt.run(
        newId, goal.name, goal.description, goal.timeframe, goal.target_date,
        parentId, goal.status, goal.created_at, goal.updated_at
      );
      counts.goals++;
    }

    // Import tasks
    const taskStmt = db.prepare(`
      INSERT INTO tasks (
        id, list_id, title, notes, due_date, due_time, reminder_at,
        completed, completed_at, position,
        effort_score, impact_score, urgency_score, importance_score,
        priority_tier, priority_reasoning, prioritized_at,
        estimated_minutes, energy_required, context_tags,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const task of data.data.tasks) {
      const newId = generateId();
      idMap.set(task.id, newId);
      const listId = idMap.get(task.list_id);
      if (!listId) continue; // Skip if list wasn't imported

      taskStmt.run(
        newId, listId, task.title, task.notes, task.due_date, task.due_time,
        task.reminder_at, task.completed ? 1 : 0, task.completed_at, task.position,
        task.effort_score, task.impact_score, task.urgency_score, task.importance_score,
        task.priority_tier, task.priority_reasoning, task.prioritized_at,
        task.estimated_minutes, task.energy_required, task.context_tags,
        task.created_at, task.updated_at
      );
      counts.tasks++;
    }

    // Import subtasks
    const subtaskStmt = db.prepare(`
      INSERT INTO subtasks (id, task_id, title, completed, position, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const subtask of data.data.subtasks) {
      const newId = generateId();
      const taskId = idMap.get(subtask.task_id);
      if (!taskId) continue;

      subtaskStmt.run(
        newId, taskId, subtask.title, subtask.completed ? 1 : 0,
        subtask.position, subtask.created_at
      );
      counts.subtasks++;
    }

    // Import task_goals relations
    const taskGoalStmt = db.prepare(
      'INSERT INTO task_goals (task_id, goal_id, alignment_strength) VALUES (?, ?, ?)'
    );
    for (const relation of data.data.task_goals) {
      const taskId = idMap.get(relation.task_id);
      const goalId = idMap.get(relation.goal_id);
      if (taskId && goalId) {
        taskGoalStmt.run(taskId, goalId, relation.alignment_strength);
      }
    }

    // Import task_tags relations
    const taskTagStmt = db.prepare(
      'INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)'
    );
    for (const relation of data.data.task_tags) {
      const taskId = idMap.get(relation.task_id);
      const tagId = idMap.get(relation.tag_id);
      if (taskId && tagId) {
        taskTagStmt.run(taskId, tagId);
      }
    }
  });

  transaction();

  log.info('UpTier import complete', counts);
  return { success: true, imported: counts };
}

function importTodoistFormat(
  data: { projects: Array<{ id: string; name: string; color?: string }>; items: Array<{ id: string; project_id: string; content: string; description?: string; due?: { date: string }; checked?: boolean }> },
  options: { mode: 'merge' | 'replace' }
): ImportResult {
  const db = getDb();
  const idMap = new Map<string, string>();
  const counts = { lists: 0, tasks: 0, goals: 0, subtasks: 0, tags: 0 };

  const transaction = db.transaction(() => {
    if (options.mode === 'replace') {
      db.prepare('DELETE FROM task_tags').run();
      db.prepare('DELETE FROM task_goals').run();
      db.prepare('DELETE FROM subtasks').run();
      db.prepare('DELETE FROM tasks').run();
      db.prepare('DELETE FROM lists WHERE is_smart_list = 0').run();
    }

    const now = new Date().toISOString();

    // Import projects as lists
    const listStmt = db.prepare(`
      INSERT INTO lists (id, name, description, icon, color, position, is_smart_list, created_at, updated_at)
      VALUES (?, ?, NULL, 'list', ?, ?, 0, ?, ?)
    `);
    let position = 0;
    for (const project of data.projects) {
      const newId = generateId();
      idMap.set(project.id, newId);
      listStmt.run(newId, project.name, project.color || '#6b7280', position++, now, now);
      counts.lists++;
    }

    // Import items as tasks
    const taskStmt = db.prepare(`
      INSERT INTO tasks (
        id, list_id, title, notes, due_date, completed, position, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const taskPositions = new Map<string, number>();
    for (const item of data.items) {
      const listId = idMap.get(item.project_id);
      if (!listId) continue;

      const newId = generateId();
      const pos = taskPositions.get(listId) || 0;
      taskPositions.set(listId, pos + 1);

      taskStmt.run(
        newId, listId, item.content, item.description || null,
        item.due?.date || null, item.checked ? 1 : 0, pos, now, now
      );
      counts.tasks++;
    }
  });

  transaction();

  log.info('Todoist import complete', counts);
  return { success: true, imported: counts };
}

/**
 * Show open dialog for import
 */
export async function selectImportFile(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Import Data',
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}
