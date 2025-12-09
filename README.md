# UpTier

> MCP-powered task management with intelligent prioritization via Claude Desktop

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

UpTier is a desktop to-do application that combines a clean Microsoft To Do-style interface with the power of Claude AI for intelligent task prioritization. Through the Model Context Protocol (MCP), Claude can analyze your tasks and help you focus on what matters most.

## Features

- **Smart Task Management** - Create lists, tasks, subtasks, and organize your work
- **AI-Powered Prioritization** - Let Claude analyze and prioritize your tasks using proven strategies
- **Goal Tracking** - Link tasks to goals and track progress toward what matters
- **Priority Scoring** - Rate tasks by effort, impact, urgency, and importance
- **Multiple Strategies** - Choose from Eisenhower matrix, quick wins, high impact, and more
- **Concurrent Access** - SQLite with WAL mode lets both the app and Claude work simultaneously
- **Modern UI** - Clean, familiar interface inspired by Microsoft To Do

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
| **MCP Server** | Node.js server providing 20+ task management tools via MCP |
| **Electron App** | Desktop application with React UI |
| **SQLite Database** | Shared database with WAL mode for concurrent access |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Claude Desktop (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/foxintheloop/uptier.git
cd uptier

# Install dependencies
pnpm install

# Build shared package
pnpm --filter @uptier/shared build

# Build MCP server
pnpm --filter @uptier/mcp-server build
```

### Running the App

```bash
# Development mode
pnpm dev:electron
```

### Configuring Claude Desktop

Add UpTier to your Claude Desktop MCP configuration:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "uptier": {
      "command": "node",
      "args": ["/path/to/uptier/apps/mcp-server/dist/index.js"]
    }
  }
}
```

> Replace `/path/to/uptier` with your actual installation path.

## MCP Tools

UpTier exposes powerful tools to Claude for managing your tasks:

### Lists & Tasks
| Tool | Description |
|------|-------------|
| `create_list` | Create a new task list |
| `get_lists` | Get all lists with task counts |
| `create_task` | Create a new task |
| `get_tasks` | Get tasks with filters |
| `complete_task` | Mark task as completed |
| `bulk_create_tasks` | Create multiple tasks at once |

### Prioritization
| Tool | Description |
|------|-------------|
| `prioritize_list` | Analyze tasks and get prioritization guidance |
| `bulk_set_priorities` | Set priority scores for multiple tasks |
| `get_prioritization_summary` | Get overview of task priorities |

### Goals & Subtasks
| Tool | Description |
|------|-------------|
| `create_goal` | Create a goal |
| `link_tasks_to_goal` | Associate tasks with goals |
| `get_goal_progress` | Get completion stats for a goal |
| `add_subtask` | Add subtask to a task |

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

The database uses SQLite with WAL mode, allowing the Electron app and MCP server to access it simultaneously without conflicts.

## Roadmap

- [ ] Recurring tasks
- [ ] Smart lists with custom filters
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Mobile companion app
- [ ] Calendar integration
- [ ] Task templates

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the app to test (`pnpm dev:electron`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built with [Electron](https://electronjs.org), [React](https://react.dev), and [Claude](https://claude.ai)**
