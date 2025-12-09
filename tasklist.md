# UpTier - Build Tasklist

## Overview
MCP-powered To-Do application with Electron desktop UI and Claude Desktop integration for intelligent task prioritization.

## Configuration
- **UI Framework**: Full shadcn/ui component library with Tailwind CSS
- **Startup Behavior**: Window state persistence, system tray support
- **Database Location**: `%APPDATA%\.uptier\tasks.db`
- **Source Location**: `C:\Users\Hello\Documents\UpTier\`

---

## Phase 1: Project Foundation [COMPLETED]

- [x] Initialize pnpm workspace at root
- [x] Create `pnpm-workspace.yaml`
- [x] Create root `package.json` with workspace scripts
- [x] Create root `tsconfig.json`
- [x] Create `.gitignore`
- [x] Create directory structure (`apps/electron`, `apps/mcp-server`, `packages/shared`)

---

## Phase 2: Shared Package [COMPLETED]

- [x] Create `packages/shared/package.json`
- [x] Create `packages/shared/tsconfig.json`
- [x] Create type definitions (`src/types.ts`):
  - List, Goal, Task, TaskGoal, Subtask, Tag interfaces
  - Priority enums and types
  - Input/Output types for CRUD operations
- [x] Create constants (`src/constants.ts`):
  - Priority scales (effort, impact, urgency, importance)
  - Prioritization strategies
  - Smart list configurations
- [x] Create database schema (`src/schema.sql`)
- [x] Create index exports (`src/index.ts`)

---

## Phase 3: MCP Server [COMPLETED]

- [x] Create `apps/mcp-server/package.json`
- [x] Create `apps/mcp-server/tsconfig.json`
- [x] Create database module (`src/database.ts`)
- [x] Create list tools (`src/tools/lists.ts`):
  - create_list, get_lists, update_list, delete_list, reorder_lists
- [x] Create task tools (`src/tools/tasks.ts`):
  - create_task, get_tasks, update_task, delete_task
  - complete_task, uncomplete_task, move_task, bulk_create_tasks
- [x] Create priority tools (`src/tools/priorities.ts`):
  - bulk_set_priorities, prioritize_list, get_prioritization_summary
- [x] Create goal tools (`src/tools/goals.ts`):
  - create_goal, get_goals, update_goal, delete_goal
  - link_tasks_to_goal, unlink_tasks_from_goal, get_goal_progress
- [x] Create subtask tools (`src/tools/subtasks.ts`)
- [x] Create server entry point (`src/index.ts`)

---

## Phase 4: Electron App [COMPLETED]

### Configuration
- [x] Create `apps/electron/package.json`
- [x] Create `apps/electron/tsconfig.json` (main + renderer)
- [x] Create `apps/electron/vite.config.ts`
- [x] Create `apps/electron/tailwind.config.js`
- [x] Create `apps/electron/postcss.config.js`
- [x] Create `apps/electron/components.json` (shadcn/ui)

### Main Process
- [x] Create entry point (`src/main/index.ts`)
- [x] Create database module (`src/main/database.ts`)
- [x] Create window state management (`src/main/window-state.ts`)
- [x] Create IPC handlers (`src/main/ipc-handlers.ts`)
- [x] Create system tray (`src/main/tray.ts`)

### Preload
- [x] Create preload script (`src/preload/index.ts`)

### Renderer
- [x] Create `src/renderer/index.html`
- [x] Create `src/renderer/main.tsx`
- [x] Create `src/renderer/App.tsx`
- [x] Create `src/renderer/styles/globals.css`
- [x] Create `src/renderer/lib/utils.ts`

### UI Components
- [x] Create shadcn/ui components:
  - Button, Input, Checkbox, ScrollArea
  - Tooltip, Badge, Toaster
- [x] Create custom components:
  - Sidebar, TaskList, TaskItem
  - QuickAdd, PriorityBadge, TierHeader
  - TaskDetail

---

## Phase 5: Integration & Testing [COMPLETED]

- [x] Create README.md with setup instructions
- [x] Create Claude Desktop config example
- [x] Document MCP tools usage

---

## Phase 6: Packaging & Distribution [IN PROGRESS]

### Completed Tasks

- [x] Install dependencies (`pnpm install`)
- [x] Build shared package (`pnpm --filter @uptier/shared build`)
- [x] Build MCP server (`pnpm --filter @uptier/mcp-server build`)
- [x] Fix TypeScript errors
- [x] Rename TaskForge to UpTier throughout codebase

### Remaining Tasks

- [ ] Run Electron app in dev mode (`pnpm dev:electron`)
- [ ] Test MCP server with Claude Desktop
- [ ] Test full workflow (create tasks, prioritize, complete)

### Future Enhancements

- [ ] Create app icon (.ico)
- [ ] Build Windows installer (`pnpm package`)
- [ ] Add keyboard shortcuts (Ctrl+N, Ctrl+Shift+N, etc.)
- [ ] Implement smart list filters (My Day, Important, Planned)
- [ ] Add drag-and-drop task reordering
- [ ] Add search functionality
- [ ] Add settings panel
- [ ] Add recurrence support
- [ ] Add tags system

---

## Key Files Created

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Workspace definition |
| `package.json` | Root workspace config |
| `packages/shared/src/types.ts` | TypeScript interfaces |
| `packages/shared/src/constants.ts` | Priority scales, strategies |
| `packages/shared/src/schema.sql` | SQLite DDL |
| `apps/mcp-server/src/index.ts` | MCP server entry |
| `apps/mcp-server/src/tools/priorities.ts` | Key prioritization tools |
| `apps/electron/src/main/index.ts` | Electron main process |
| `apps/electron/src/renderer/App.tsx` | React root component |
| `apps/electron/src/renderer/components/TaskList.tsx` | Main task view |

---

## Next Steps

1. Run `pnpm install` to install all dependencies
2. Build the shared package: `pnpm --filter @uptier/shared build`
3. Build the MCP server: `pnpm --filter @uptier/mcp-server build`
4. Copy `claude_desktop_config.example.json` content to your Claude Desktop config
5. Restart Claude Desktop to load the MCP server
6. Test by asking Claude to create a list and some tasks
7. Run the Electron app: `pnpm dev:electron`
8. Watch Claude's prioritizations sync to the desktop app
