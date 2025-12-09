# UpTier

MCP-powered To-Do application with intelligent task prioritization via Claude Desktop.

## Architecture

- **MCP Server**: Node.js server providing task management tools via MCP protocol
- **Electron App**: Desktop application with React UI similar to Microsoft To Do
- **SQLite Database**: Shared database with WAL mode for concurrent access

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Claude Desktop (for MCP integration)

### Installation

```bash
# Install dependencies
pnpm install

# Build shared package
pnpm --filter @uptier/shared build

# Build MCP server
pnpm --filter @uptier/mcp-server build
```

### Running the Electron App

```bash
# Development mode
pnpm dev:electron

# Or run both (if needed)
cd apps/electron
pnpm dev
```

### Configuring Claude Desktop

Add UpTier to your Claude Desktop MCP configuration:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "uptier": {
      "command": "node",
      "args": ["C:/Users/Hello/Documents/UpTier/apps/mcp-server/dist/index.js"]
    }
  }
}
```

## MCP Tools Available

### List Management
- `create_list` - Create a new task list
- `get_lists` - Get all lists with task counts
- `update_list` - Update list properties
- `delete_list` - Delete a list

### Task Management
- `create_task` - Create a new task
- `get_tasks` - Get tasks with filters
- `update_task` - Update task properties
- `delete_task` - Delete a task
- `complete_task` - Mark task as completed
- `bulk_create_tasks` - Create multiple tasks at once

### Prioritization (Key Feature)
- `prioritize_list` - Analyze tasks and get prioritization guidance
- `bulk_set_priorities` - Set priority scores for multiple tasks
- `get_prioritization_summary` - Get overview of task priorities

### Goal Management
- `create_goal` - Create a goal
- `get_goals` - Get all goals
- `link_tasks_to_goal` - Associate tasks with goals
- `get_goal_progress` - Get completion stats for a goal

### Subtasks
- `add_subtask` - Add subtask to a task
- `complete_subtask` - Mark subtask as completed
- `delete_subtask` - Delete a subtask

## Prioritization Strategies

When using `prioritize_list`, you can choose from:

- **balanced**: Weighs all factors equally
- **urgent_first**: Prioritizes by deadline and urgency
- **quick_wins**: Low effort, high impact tasks first
- **high_impact**: Maximum impact regardless of effort
- **eisenhower**: Classic urgent/important matrix

## Priority Scoring

Each task can have scores (1-5) for:

- **Effort**: How much work is required
- **Impact**: How valuable the outcome is
- **Urgency**: How time-sensitive it is
- **Importance**: How critical to goals/values (Eisenhower)

Tasks are grouped into tiers:
- **Tier 1 (Do Now)**: High impact, urgent, or blocking
- **Tier 2 (Do Soon)**: Important but not urgent
- **Tier 3 (Backlog)**: Lower priority, someday/maybe

## Data Location

- **Database**: `%APPDATA%\.uptier\tasks.db`
- Uses SQLite with WAL mode for concurrent access between MCP server and Electron app

## Project Structure

```
uptier/
├── apps/
│   ├── electron/          # Desktop application
│   │   ├── src/main/      # Electron main process
│   │   ├── src/preload/   # IPC bridge
│   │   └── src/renderer/  # React UI
│   └── mcp-server/        # MCP server
│       └── src/tools/     # MCP tool implementations
├── packages/
│   └── shared/            # Shared types and schema
└── pnpm-workspace.yaml
```

## License

MIT
