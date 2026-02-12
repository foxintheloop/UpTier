# UpTier

> MCP-powered task management with intelligent prioritization via Claude Desktop

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey)]()
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-green)](https://registry.modelcontextprotocol.io/?q=uptier)

UpTier is a desktop to-do application that combines a clean Microsoft To Do-style interface with the power of Claude AI for intelligent task prioritization. Through the Model Context Protocol (MCP), Claude can analyze your tasks and help you focus on what matters most.

## Demo

https://github.com/user-attachments/assets/71264f79-3f54-4b45-9d7e-dcef26f54f94

## Download

**[Download UpTier for Windows](https://github.com/foxintheloop/uptier/releases/latest)**

Pre-built installer available. No build required.

## Features

### Task Management
- **Lists & Tasks** - Create custom lists, tasks with subtasks, and organize your work
- **Smart Lists** - Built-in views for My Day, Important, Planned, and Completed tasks
- **Tags** - Categorize tasks with colored tags for easy filtering
- **Due Dates** - Set due dates with notifications and overdue tracking
- **Drag & Drop** - Reorder tasks within lists

### AI-Powered Features
- **Intelligent Prioritization** - Let Claude analyze and prioritize your tasks
- **Multiple Strategies** - Eisenhower matrix, quick wins, high impact, and more
- **Auto-Suggestions** - Get AI recommendations for task organization

### Organization
- **Goal Tracking** - Link tasks to goals and track progress
- **Priority Tiers** - Three-tier system (Do Now, Do Soon, Backlog)
- **Priority Scoring** - Rate tasks by effort, impact, urgency, and importance
- **Data Export** - Export your data for backup or analysis

### Multi-Database Support
- **Multiple Profiles** - Create separate databases for work, personal, projects
- **Easy Switching** - Switch between database profiles from the sidebar
- **Isolated Data** - Each profile maintains its own lists, tasks, and settings

### Focus Timer
- **Distraction-Free Mode** - Full-screen timer overlay to help you stay focused
- **Flexible Durations** - Preset options (30, 45, 60, 90 min) or custom duration
- **Task Context** - See task title and notes while working
- **Keyboard Controls** - Space to pause/resume, Esc to end session

### User Experience
- **Dark Mode** - Modern dark theme interface
- **Keyboard Shortcuts** - Quick actions with Ctrl+F (search), Ctrl+N (new task)
- **System Tray** - Minimize to tray for quick access
- **Concurrent Access** - SQLite with WAL mode lets both the app and Claude work simultaneously

## Architecture

```
uptier/
├── apps/
│   ├── electron/          # Desktop application (React + Electron)
│   └── mcp-server/        # MCP server for Claude Desktop
├── packages/
│   └── shared/            # Shared types and database schema
└── pnpm-workspace.yaml
```

| Component | Description |
|-----------|-------------|
| **MCP Server** | Node.js server providing 25+ task management tools via MCP |
| **Electron App** | Desktop application with React UI |
| **SQLite Database** | Shared database with WAL mode for concurrent access |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ (LTS recommended)
- pnpm 8+
- Claude Desktop (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/foxintheloop/uptier.git
cd uptier

# Install pnpm (if not already installed)
npm install -g pnpm

# Install dependencies
pnpm install

# Approve build scripts for native modules (canvas, sharp, electron)
pnpm approve-builds

# Rebuild native modules
pnpm rebuild

# Rebuild better-sqlite3 for Electron's bundled Node.js
npx electron-rebuild -f -w better-sqlite3

# Build packages
pnpm --filter @uptier/shared build
pnpm --filter @uptier/mcp-server build
```

> **Note:** The Electron app bundles its own Node.js runtime (v20.x), which differs from your system Node.js. The `electron-rebuild` step compiles `better-sqlite3` for Electron's version. The MCP server deployment (below) compiles it separately for your system Node.js used by Claude Desktop.

### Running the App

```bash
# Development mode
pnpm dev:electron

# Production build
pnpm --filter @uptier/electron build
```

### Claude Desktop Integration

Deploy the MCP server for Claude Desktop:

```bash
# Deploy MCP server to standalone directory
pnpm --filter @uptier/mcp-server deploy
```

This deploys the MCP server to `~/.uptier/mcp-server/` with its own `node_modules`, automatically compiled for your current Node.js version. The Claude Desktop config is updated automatically.

> **Why standalone?** The Electron app uses Node.js 22 (bundled), while Claude Desktop may use a different Node.js version. The standalone deployment compiles native modules (like `better-sqlite3`) for the correct version, preventing conflicts.

After deployment:
1. Restart Claude Desktop
2. The UpTier tools will be available in Claude

#### Manual Configuration (Alternative)

If the automatic deployment doesn't work, add UpTier manually to your Claude Desktop config:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "uptier": {
      "command": "node",
      "args": ["/path/to/.uptier/mcp-server/index.js"]
    }
  }
}
```

## MCP Tools

UpTier exposes powerful tools to Claude for managing your tasks:

### Lists
| Tool | Description |
|------|-------------|
| `create_list` | Create a new task list |
| `get_lists` | Get all lists with task counts |
| `update_list` | Update list name, color, or icon |
| `delete_list` | Delete a list |
| `reorder_lists` | Change list positions |

### Tasks
| Tool | Description |
|------|-------------|
| `create_task` | Create a new task with optional attributes |
| `get_tasks` | Get tasks with filtering options |
| `update_task` | Update task properties |
| `complete_task` | Mark task as completed |
| `delete_task` | Delete a task |
| `bulk_create_tasks` | Create multiple tasks at once |
| `move_task` | Move task to a different list |

### Prioritization
| Tool | Description |
|------|-------------|
| `prioritize_list` | Analyze tasks and get prioritization guidance |
| `bulk_set_priorities` | Set priority tiers for multiple tasks |
| `get_prioritization_summary` | Get overview of task priorities |
| `suggest_next_task` | Get AI recommendation for what to work on next |

### Goals
| Tool | Description |
|------|-------------|
| `create_goal` | Create a goal |
| `get_goals` | Get all goals with progress |
| `update_goal` | Update goal properties |
| `link_tasks_to_goal` | Associate tasks with goals |
| `get_goal_progress` | Get completion stats for a goal |

### Subtasks & Tags
| Tool | Description |
|------|-------------|
| `add_subtask` | Add subtask to a task |
| `update_subtask` | Update subtask properties |
| `create_tag` | Create a new tag |
| `get_tags` | Get all tags |
| `add_tag_to_task` | Tag a task |

## Prioritization Strategies

When asking Claude to prioritize your tasks, you can request different strategies:

| Strategy | Best For |
|----------|----------|
| **Balanced** | General use - weighs all factors equally |
| **Urgent First** | Deadline-driven work |
| **Quick Wins** | Building momentum with low-effort wins |
| **High Impact** | Maximum results regardless of effort |
| **Eisenhower** | Classic urgent/important decision matrix |

### Priority Tiers

Tasks are organized into three tiers:
- **Tier 1 (Do Now)** - High impact, urgent, or blocking other work
- **Tier 2 (Do Soon)** - Important but not time-sensitive
- **Tier 3 (Backlog)** - Lower priority, someday/maybe items

## Data Storage

Your data is stored locally:
- **Windows:** `%APPDATA%\.uptier\tasks.db`
- **macOS/Linux:** `~/.uptier/tasks.db`

Additional database profiles are stored in the same directory with custom names.

The database uses SQLite with WAL mode, allowing the Electron app and MCP server to access it simultaneously without conflicts.

### Logs

Application logs are stored at:
- **Windows:** `%APPDATA%\UpTier\logs\`
- **macOS:** `~/Library/Application Support/UpTier/logs/`
- **Linux:** `~/.config/UpTier/logs/`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Create new task |
| `Ctrl+F` | Focus search |
| `↑` / `↓` | Navigate tasks |
| `Space` | Toggle task completion |
| `Delete` | Delete selected task |
| `Escape` | Close detail panel |

### Focus Timer Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Pause/Resume timer |
| `Escape` | End focus session |

## Roadmap

- [x] Smart lists (My Day, Important, Planned, Completed)
- [x] Dark mode
- [x] Keyboard shortcuts
- [x] Tags
- [x] Due date notifications
- [x] Multiple database profiles
- [x] Data export
- [x] List rename/delete
- [x] Focus timer
- [x] Resizable panels
- [ ] Recurring tasks
- [ ] Custom smart list filters
- [ ] Calendar integration
- [ ] Task templates
- [ ] Mobile companion app

## Troubleshooting

### "Electron uninstall" error

If you see `Error: Electron uninstall` when running `pnpm dev:electron`, the Electron binary wasn't downloaded. Run:

```bash
node node_modules/electron/install.js
```

### Native module errors with MCP server

If Claude Desktop shows errors about `better-sqlite3` or `NODE_MODULE_VERSION` mismatches, use the standalone deployment:

```bash
pnpm --filter @uptier/mcp-server deploy
```

This creates a separate MCP server installation at `~/.uptier/mcp-server/` with native modules compiled for your current Node.js version, avoiding conflicts with the Electron app.

If you still have issues, ensure you're running the deploy command with the same Node.js version that Claude Desktop uses (typically Node.js 23).

### Build script warnings

If you see warnings about "Ignored build scripts" during `pnpm install`, run:

```bash
pnpm approve-builds
```

Then select the packages that need to run build scripts (canvas, sharp, electron).

### "NODE_MODULE_VERSION mismatch" in Electron app

If the Electron app crashes with `NODE_MODULE_VERSION` mismatch (e.g., "was compiled against a different Node.js version"), rebuild `better-sqlite3` for Electron:

```bash
npx electron-rebuild -f -w better-sqlite3
```

This typically happens after upgrading Node.js or running `pnpm install`, which recompiles native modules for your system Node.js rather than Electron's bundled version.

### "Schema not found" error in Claude Desktop

If the MCP server reports that `schema.sql` cannot be found, the deployed files are stale. Rebuild and redeploy:

```bash
pnpm --filter @uptier/shared build
pnpm --filter @uptier/mcp-server build
pnpm --filter @uptier/mcp-server deploy
```

### After upgrading Node.js

When you upgrade your system Node.js version, native modules need to be recompiled:

1. **Electron app:** `npx electron-rebuild -f -w better-sqlite3`
2. **MCP server:** Rebuild and redeploy:
   ```bash
   pnpm --filter @uptier/shared build
   pnpm --filter @uptier/mcp-server build
   pnpm --filter @uptier/mcp-server deploy
   ```

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the app to test (`pnpm dev:electron`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Help Wanted: macOS & Linux Testing

UpTier is currently only tested on Windows. If you're on macOS or Linux, we'd love your help testing and reporting any platform-specific issues!

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with [Electron](https://electronjs.org), [React](https://react.dev), and [Claude](https://claude.ai)**
