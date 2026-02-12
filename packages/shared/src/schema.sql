-- UpTier Database Schema
-- SQLite with WAL mode for concurrent access

-- Enable WAL mode (run as PRAGMA, not in schema)
-- PRAGMA journal_mode = WAL;
-- PRAGMA busy_timeout = 5000;

-- ============================================================================
-- Lists Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'list',
    color TEXT DEFAULT '#3b82f6',
    position INTEGER DEFAULT 0,
    is_smart_list INTEGER DEFAULT 0,
    smart_filter TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- Goals Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    timeframe TEXT CHECK(timeframe IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    target_date TEXT,
    parent_goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'abandoned')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- Tasks Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,

    -- Basic fields
    title TEXT NOT NULL,
    notes TEXT,
    due_date TEXT,
    due_time TEXT,
    reminder_at TEXT,

    -- Completion
    completed INTEGER DEFAULT 0,
    completed_at TEXT,

    -- Ordering
    position INTEGER DEFAULT 0,

    -- Priority scores (1-5 scale)
    effort_score INTEGER CHECK(effort_score IS NULL OR (effort_score BETWEEN 1 AND 5)),
    impact_score INTEGER CHECK(impact_score IS NULL OR (impact_score BETWEEN 1 AND 5)),
    urgency_score INTEGER CHECK(urgency_score IS NULL OR (urgency_score BETWEEN 1 AND 5)),
    importance_score INTEGER CHECK(importance_score IS NULL OR (importance_score BETWEEN 1 AND 5)),

    -- Computed priority
    priority_tier INTEGER CHECK(priority_tier IS NULL OR (priority_tier BETWEEN 1 AND 3)),
    priority_reasoning TEXT,

    -- Context
    estimated_minutes INTEGER,
    energy_required TEXT CHECK(energy_required IS NULL OR energy_required IN ('low', 'medium', 'high')),
    context_tags TEXT,

    -- Recurrence
    recurrence_rule TEXT,
    recurrence_end_date TEXT,

    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    prioritized_at TEXT
);

-- ============================================================================
-- Task-Goal Junction Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_goals (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    alignment_strength INTEGER DEFAULT 3 CHECK(alignment_strength BETWEEN 1 AND 5),
    PRIMARY KEY (task_id, goal_id)
);

-- ============================================================================
-- Subtasks Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- Tags Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6b7280'
);

-- ============================================================================
-- Task-Tag Junction Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_tags (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_tier ON tasks(priority_tier);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(list_id, position);
CREATE INDEX IF NOT EXISTS idx_task_goals_goal_id ON task_goals(goal_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_goals_parent ON goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- ============================================================================
-- Focus Sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_task ON focus_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_date ON focus_sessions(started_at);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
CREATE TRIGGER IF NOT EXISTS update_lists_timestamp
    AFTER UPDATE ON lists
    FOR EACH ROW
BEGIN
    UPDATE lists SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_goals_timestamp
    AFTER UPDATE ON goals
    FOR EACH ROW
BEGIN
    UPDATE goals SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp
    AFTER UPDATE ON tasks
    FOR EACH ROW
BEGIN
    UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
END;
