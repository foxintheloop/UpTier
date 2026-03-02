import { getDb } from './database';
import { createScopedLogger } from './logger';
import type { Task } from '@uptier/shared';

const log = createScopedLogger('ai-suggestions');

export interface DueDateSuggestion {
  suggestedDate: string;
  confidence: number; // 0-1
  reasoning: string;
  basedOn: string[]; // similar task IDs
}

export interface SubtaskSuggestion {
  title: string;
  estimatedMinutes?: number;
}

export interface BreakdownSuggestion {
  subtasks: SubtaskSuggestion[];
  totalEstimatedMinutes: number;
  reasoning: string;
}

// Common task patterns and their typical breakdowns
const TASK_PATTERNS: Record<string, { keywords: string[]; subtasks: SubtaskSuggestion[] }> = {
  meeting: {
    keywords: ['meeting', 'call', 'sync', 'standup', 'review meeting', '1:1', 'one-on-one'],
    subtasks: [
      { title: 'Prepare agenda and talking points', estimatedMinutes: 15 },
      { title: 'Review relevant documents/materials', estimatedMinutes: 10 },
      { title: 'Attend the meeting', estimatedMinutes: 30 },
      { title: 'Send follow-up notes and action items', estimatedMinutes: 10 },
    ],
  },
  presentation: {
    keywords: ['presentation', 'present', 'demo', 'showcase', 'pitch'],
    subtasks: [
      { title: 'Outline key points and structure', estimatedMinutes: 20 },
      { title: 'Create slides/visual aids', estimatedMinutes: 60 },
      { title: 'Prepare speaker notes', estimatedMinutes: 15 },
      { title: 'Practice run-through', estimatedMinutes: 30 },
      { title: 'Final review and polish', estimatedMinutes: 15 },
    ],
  },
  document: {
    keywords: ['document', 'write', 'draft', 'report', 'proposal', 'spec', 'documentation'],
    subtasks: [
      { title: 'Create outline and structure', estimatedMinutes: 20 },
      { title: 'Write first draft', estimatedMinutes: 60 },
      { title: 'Review and edit', estimatedMinutes: 30 },
      { title: 'Get feedback from stakeholders', estimatedMinutes: 15 },
      { title: 'Finalize and publish', estimatedMinutes: 15 },
    ],
  },
  research: {
    keywords: ['research', 'investigate', 'explore', 'analyze', 'study', 'evaluate'],
    subtasks: [
      { title: 'Define research questions/goals', estimatedMinutes: 15 },
      { title: 'Gather sources and information', estimatedMinutes: 45 },
      { title: 'Analyze findings', estimatedMinutes: 30 },
      { title: 'Summarize conclusions', estimatedMinutes: 20 },
    ],
  },
  feature: {
    keywords: ['implement', 'build', 'develop', 'create feature', 'add feature', 'code'],
    subtasks: [
      { title: 'Define requirements and acceptance criteria', estimatedMinutes: 20 },
      { title: 'Design solution approach', estimatedMinutes: 30 },
      { title: 'Implement core functionality', estimatedMinutes: 90 },
      { title: 'Write tests', estimatedMinutes: 30 },
      { title: 'Code review and refinement', estimatedMinutes: 20 },
    ],
  },
  bugfix: {
    keywords: ['fix', 'bug', 'debug', 'issue', 'resolve', 'troubleshoot'],
    subtasks: [
      { title: 'Reproduce the issue', estimatedMinutes: 15 },
      { title: 'Investigate root cause', estimatedMinutes: 30 },
      { title: 'Implement fix', estimatedMinutes: 30 },
      { title: 'Test the fix', estimatedMinutes: 15 },
      { title: 'Update documentation if needed', estimatedMinutes: 10 },
    ],
  },
  review: {
    keywords: ['review', 'audit', 'check', 'assess', 'inspect'],
    subtasks: [
      { title: 'Gather materials to review', estimatedMinutes: 10 },
      { title: 'Go through each item systematically', estimatedMinutes: 45 },
      { title: 'Note issues and suggestions', estimatedMinutes: 20 },
      { title: 'Compile feedback summary', estimatedMinutes: 15 },
    ],
  },
  planning: {
    keywords: ['plan', 'roadmap', 'strategy', 'schedule', 'organize', 'prioritize'],
    subtasks: [
      { title: 'Review current state and constraints', estimatedMinutes: 20 },
      { title: 'Identify goals and milestones', estimatedMinutes: 25 },
      { title: 'Break down into actionable items', estimatedMinutes: 30 },
      { title: 'Assign timelines and resources', estimatedMinutes: 20 },
      { title: 'Document and share the plan', estimatedMinutes: 15 },
    ],
  },
  email: {
    keywords: ['email', 'respond', 'reply', 'message', 'outreach', 'follow up', 'follow-up'],
    subtasks: [
      { title: 'Review context and previous correspondence', estimatedMinutes: 10 },
      { title: 'Draft response', estimatedMinutes: 15 },
      { title: 'Review and polish before sending', estimatedMinutes: 5 },
      { title: 'Send and log any follow-up actions', estimatedMinutes: 5 },
    ],
  },
  design: {
    keywords: ['design', 'wireframe', 'mockup', 'prototype', 'UI', 'UX', 'layout'],
    subtasks: [
      { title: 'Gather requirements and references', estimatedMinutes: 20 },
      { title: 'Create initial wireframes/sketches', estimatedMinutes: 30 },
      { title: 'Build high-fidelity mockup', estimatedMinutes: 60 },
      { title: 'Get feedback and iterate', estimatedMinutes: 20 },
      { title: 'Finalize and hand off assets', estimatedMinutes: 15 },
    ],
  },
  testing: {
    keywords: ['test', 'QA', 'quality', 'verify', 'validate', 'regression'],
    subtasks: [
      { title: 'Define test cases and scenarios', estimatedMinutes: 20 },
      { title: 'Set up test environment', estimatedMinutes: 15 },
      { title: 'Execute test cases', estimatedMinutes: 45 },
      { title: 'Document results and file bugs', estimatedMinutes: 15 },
      { title: 'Verify fixes and retest', estimatedMinutes: 15 },
    ],
  },
  setup: {
    keywords: ['setup', 'install', 'configure', 'deploy', 'migration', 'infrastructure'],
    subtasks: [
      { title: 'Review documentation and prerequisites', estimatedMinutes: 15 },
      { title: 'Install and configure dependencies', estimatedMinutes: 30 },
      { title: 'Run setup and verify functionality', estimatedMinutes: 20 },
      { title: 'Document configuration for the team', estimatedMinutes: 15 },
    ],
  },
};

/**
 * Suggest a due date based on similar completed tasks
 */
export function suggestDueDate(taskId: string): DueDateSuggestion | null {
  log.info('Generating due date suggestion', { taskId });
  const db = getDb();

  // Get the target task
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task | undefined;
  if (!task) {
    log.warn('Task not found', { taskId });
    return null;
  }

  // Find similar completed tasks in the same list
  const similarTasks = db.prepare(`
    SELECT
      id,
      title,
      created_at,
      completed_at,
      due_date,
      estimated_minutes,
      priority_tier
    FROM tasks
    WHERE list_id = ?
      AND completed = 1
      AND completed_at IS NOT NULL
      AND id != ?
    ORDER BY completed_at DESC
    LIMIT 20
  `).all(task.list_id, taskId) as Array<{
    id: string;
    title: string;
    created_at: string;
    completed_at: string;
    due_date: string | null;
    estimated_minutes: number | null;
    priority_tier: number | null;
  }>;

  if (similarTasks.length < 2) {
    // Not enough data, suggest based on priority
    const daysFromNow = task.priority_tier === 1 ? 1 : task.priority_tier === 2 ? 3 : 7;
    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + daysFromNow);

    return {
      suggestedDate: suggestedDate.toISOString().split('T')[0],
      confidence: 0.3,
      reasoning: `Based on ${task.priority_tier ? `priority tier ${task.priority_tier}` : 'default timing'}. Not enough similar tasks for data-driven suggestion.`,
      basedOn: [],
    };
  }

  // Calculate average completion time for tasks with due dates
  const tasksWithDueDates = similarTasks.filter(t => t.due_date);

  let avgDaysUntilDue = 7; // default
  const basedOnIds: string[] = [];

  if (tasksWithDueDates.length >= 2) {
    // Calculate days between creation and due date
    const daysUntilDue = tasksWithDueDates.map(t => {
      const created = new Date(t.created_at);
      const due = new Date(t.due_date!);
      return Math.max(1, Math.round((due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    });

    avgDaysUntilDue = Math.round(daysUntilDue.reduce((a, b) => a + b, 0) / daysUntilDue.length);
    basedOnIds.push(...tasksWithDueDates.slice(0, 5).map(t => t.id));
  } else {
    // Calculate days from creation to completion
    const completionTimes = similarTasks.map(t => {
      const created = new Date(t.created_at);
      const completed = new Date(t.completed_at);
      return Math.max(1, Math.round((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    });

    avgDaysUntilDue = Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length);
    basedOnIds.push(...similarTasks.slice(0, 5).map(t => t.id));
  }

  // Adjust based on priority tier
  if (task.priority_tier === 1) {
    avgDaysUntilDue = Math.max(1, Math.round(avgDaysUntilDue * 0.5));
  } else if (task.priority_tier === 3) {
    avgDaysUntilDue = Math.round(avgDaysUntilDue * 1.5);
  }

  const suggestedDate = new Date();
  suggestedDate.setDate(suggestedDate.getDate() + avgDaysUntilDue);

  // Don't suggest weekends for work-like tasks
  const dayOfWeek = suggestedDate.getDay();
  if (dayOfWeek === 0) suggestedDate.setDate(suggestedDate.getDate() + 1);
  if (dayOfWeek === 6) suggestedDate.setDate(suggestedDate.getDate() + 2);

  const confidence = Math.min(0.9, 0.4 + (similarTasks.length / 20) * 0.5);

  log.info('Due date suggestion generated', {
    taskId,
    suggestedDate: suggestedDate.toISOString().split('T')[0],
    confidence,
    basedOn: basedOnIds.length,
  });

  return {
    suggestedDate: suggestedDate.toISOString().split('T')[0],
    confidence,
    reasoning: `Based on ${basedOnIds.length} similar completed tasks in this list. Average completion time is ~${avgDaysUntilDue} days${task.priority_tier ? `, adjusted for priority tier ${task.priority_tier}` : ''}.`,
    basedOn: basedOnIds,
  };
}

/**
 * Suggest a breakdown of subtasks for a complex task
 */
export function suggestBreakdown(taskId: string): BreakdownSuggestion | null {
  log.info('Generating breakdown suggestion', { taskId });
  const db = getDb();

  // Get the target task
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task | undefined;
  if (!task) {
    log.warn('Task not found', { taskId });
    return null;
  }

  const titleLower = task.title.toLowerCase();
  const notesLower = (task.notes || '').toLowerCase();

  // Find matching pattern — title matches weighted 2x vs notes matches
  let bestMatch: { pattern: string; score: number } | null = null;

  for (const [patternName, pattern] of Object.entries(TASK_PATTERNS)) {
    let score = 0;
    for (const keyword of pattern.keywords) {
      const kw = keyword.toLowerCase();
      if (titleLower.includes(kw)) {
        score += kw.length * 2;
      } else if (notesLower.includes(kw)) {
        score += kw.length;
      }
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { pattern: patternName, score };
    }
  }

  if (bestMatch) {
    const pattern = TASK_PATTERNS[bestMatch.pattern];
    const subtasks = pattern.subtasks.map(s => ({
      title: s.title,
      estimatedMinutes: s.estimatedMinutes,
    }));

    const totalMinutes = subtasks.reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);

    log.info('Breakdown suggestion generated from pattern', {
      taskId,
      pattern: bestMatch.pattern,
      subtaskCount: subtasks.length,
    });

    return {
      subtasks,
      totalEstimatedMinutes: totalMinutes,
      reasoning: `This looks like a "${bestMatch.pattern}" type task. Breaking it down into standard phases can help ensure nothing is missed.`,
    };
  }

  // Generic breakdown for long/complex titles
  if (task.title.length > 30 || task.notes) {
    log.info('Generating generic breakdown', { taskId });
    return {
      subtasks: [
        { title: 'Review requirements and context', estimatedMinutes: 15 },
        { title: 'Complete the main work', estimatedMinutes: 45 },
        { title: 'Review and validate results', estimatedMinutes: 15 },
        { title: 'Clean up and finalize', estimatedMinutes: 10 },
      ],
      totalEstimatedMinutes: 85,
      reasoning: 'Generic breakdown suggested. Consider customizing these subtasks based on the specific requirements.',
    };
  }

  log.info('No breakdown suggested - task appears simple', { taskId });
  return null;
}

/**
 * Get smart suggestions based on task context
 */
export interface TaskSuggestions {
  dueDate?: DueDateSuggestion;
  breakdown?: BreakdownSuggestion;
}

export function getTaskSuggestions(taskId: string): TaskSuggestions {
  log.info('Getting all suggestions for task', { taskId });

  const suggestions: TaskSuggestions = {};

  const dueDateSuggestion = suggestDueDate(taskId);
  if (dueDateSuggestion) {
    suggestions.dueDate = dueDateSuggestion;
  }

  const breakdownSuggestion = suggestBreakdown(taskId);
  if (breakdownSuggestion) {
    suggestions.breakdown = breakdownSuggestion;
  }

  return suggestions;
}
