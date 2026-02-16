# UpTier User Guide

UpTier is a desktop task management app with AI-powered prioritization, daily planning rituals, focus timers, and deep Claude integration. Everything runs locally on your machine — no cloud, no accounts, your data stays yours.

---

## Getting Started

### Layout

The app has three main areas:

- **Sidebar** (left) — Navigation between lists, smart views, and goals. Also contains the "Plan My Day" button and search.
- **Task List** (center) — Tasks in the selected list, grouped by priority tier. Includes a quick-add bar at the top and search.
- **Detail Panel** (right) — Opens when you click a task. Shows all properties, subtasks, tags, goals, and AI suggestions.

---

## Feature Tiers & Onboarding

UpTier uses a progressive feature system so you can start simple and add complexity as needed.

### Onboarding Wizard

New users see a 3-step onboarding wizard on first launch:

1. **Welcome** — Introduction to UpTier
2. **Choose Your Level** — Select a feature preset (Basic, Intermediate, or Advanced)
3. **Confirmation** — Review your choice and start using the app

### Feature Presets

| Feature | Basic | Intermediate | Advanced |
|---------|:-----:|:------------:|:--------:|
| Tasks, Lists, Search, Themes | always | always | always |
| Due dates, Tags, Subtasks | always | always | always |
| Priority Tiers & Scoring | - | yes | yes |
| Focus Timer | - | yes | yes |
| Calendar View | - | yes | yes |
| Custom Smart Filters | - | yes | yes |
| Notifications | - | yes | yes |
| Export / Import | - | yes | yes |
| Goals System | - | yes | yes |
| Productivity Dashboard | - | - | yes |
| Daily Planning Ritual | - | - | yes |
| AI Suggestions | - | - | yes |
| Deadline Alerts | - | - | yes |
| Streaks & Celebrations | - | - | yes |
| Database Profiles | - | - | yes |

### Customizing Features

You can change your tier or toggle individual features at any time:

1. Open **Settings** (gear icon in the sidebar)
2. Go to the **Features** section
3. Click a preset button (Basic, Intermediate, Advanced) to switch all at once, or toggle individual features on and off

Disabled features are hidden from the sidebar, task detail panel, command palette, and all overlays.

> **Existing users** who upgrade to a version with the tier system will have all features enabled by default (Advanced) and will not see the onboarding wizard.

---

## Lists

### Built-in Smart Lists

Six smart lists appear at the top of the sidebar:

| Smart List | What It Shows |
|------------|---------------|
| **My Day** | Tasks due today |
| **Important** | Tasks with priority tier 1 or 2 |
| **Planned** | Tasks with any due date set |
| **Calendar** | Calendar view of all scheduled tasks |
| **Dashboard** | Productivity analytics and stats |
| **Completed** | All completed tasks |

### Regular Lists

Create your own lists to organize tasks by project, area, or however you like.

- Click the **+** button in the sidebar to create a new list
- Each list has a name, color, and icon
- Right-click a list to rename, change color, or delete it
- Drag lists to reorder them in the sidebar
- Deleting a list also deletes all its tasks

### Custom Smart Lists (Filters)

Build custom filtered views using a rule builder:

- Click the filter icon in the sidebar to create a custom smart list
- Combine rules like: due date is this week, priority is tier 1, energy is low, estimated time is under 30 minutes
- All rules are combined with AND logic
- Example: Create a "Quick Wins" filter for low-effort, high-priority tasks

**Available filter fields:** due date, priority tier, tags, energy level, list, estimated minutes, completion status.

---

## Tasks

### Creating Tasks

Use the **quick-add bar** at the top of any task list. Type a task title and press Enter.

#### Natural Language Input

The quick-add bar understands natural language. You can include dates, times, priorities, tags, and duration all in one line:

| Syntax | Example | Result |
|--------|---------|--------|
| Dates | `tomorrow`, `next friday`, `dec 25` | Sets due date |
| Times | `at 3pm`, `at 14:30`, `at noon` | Sets due time |
| Priority | `!1`, `!2`, `!3`, `!high`, `!low` | Sets priority tier |
| Tags | `#work`, `#shopping`, `#urgent` | Creates/links tags |
| Duration | `30min`, `2h`, `1.5h`, `90m` | Sets estimated time |

**Example:**
```
Review PR for auth module tomorrow at 2pm !1 #code-review 30min
```
This creates a task titled "Review PR for auth module" due tomorrow at 2:00 PM, priority tier 1, tagged "code-review", estimated at 30 minutes.

As you type, parsed tokens appear as colored badges below the input so you can see what's being recognized.

#### Smart List Context

When adding a task from a smart list view, the task inherits context:
- From **My Day**: due date is automatically set to today
- From **Important**: priority is automatically set to tier 1

### Task Properties

Open the detail panel by clicking any task. Available properties:

| Property | Description |
|----------|-------------|
| **Title** | Task name |
| **Notes** | Rich text notes for details |
| **Due Date** | When the task is due |
| **Due Time** | Specific time on the due date (for day planner scheduling) |
| **Priority Tier** | Do Now (1), Do Soon (2), or Backlog (3) |
| **Estimated Time** | How long you think it will take (in minutes) |
| **Energy Level** | Low, Medium, or High — how much energy it requires |
| **Recurrence** | Repeat daily, on weekdays, weekly, or monthly |
| **Tags** | Color-coded labels (see Tags section) |
| **Goals** | Link to higher-level goals (see Goals section) |
| **Subtasks** | Checklist items within the task (see Subtasks section) |

### Priority Tiers

Tasks are organized into three priority tiers, shown as collapsible sections in the task list:

| Tier | Label | Meaning |
|------|-------|---------|
| 1 | **Do Now** | Urgent and important — work on immediately |
| 2 | **Do Soon** | Important but not urgent — schedule for soon |
| 3 | **Backlog** | Low priority — do when time permits |

Each tier also has four 1-5 scoring dimensions (effort, impact, urgency, importance) that Claude can set via AI prioritization.

### Drag-and-Drop Reordering

Drag tasks within a list to reorder them. A drag handle appears when you hover over a task.

### Completing and Deleting Tasks

- **Complete**: Click the checkbox next to a task in the list, or select a task and press Space
- **Complete from Detail Panel**: Use the circular checkbox next to the task title in the detail panel
- **Uncomplete**: Click the checkbox again to mark it incomplete
- **Delete**: Select a task and press Delete, or use the delete button in the detail panel
- **Recurring tasks**: Completing a recurring task automatically creates the next instance with the next due date

### Searching Tasks

- Press **Ctrl+F** to focus the search bar in the task list
- Search matches against task titles and notes
- The **Command Palette** (Ctrl+K) also searches tasks across all lists

---

## Subtasks

Subtasks are checklist items within a task, visible in the detail panel.

- **Add**: Type in the input field at the bottom of the subtask list and press Enter
- **Complete**: Click the checkbox next to any subtask
- **Edit**: Click a subtask title to edit it inline
- **Reorder**: Drag subtasks to rearrange them
- **Delete**: Hover over a subtask and click the trash icon
- **Progress**: A counter shows completion progress (e.g., "3/5 subtasks")

### AI Task Breakdown

Click **"Suggest Task Breakdown"** in the detail panel to get AI-generated subtask suggestions. The system analyzes your task title and notes, matches against common task patterns (meetings, presentations, coding, research, etc.), and suggests relevant subtasks. Click **"Add Subtasks"** to apply them.

---

## Tags

Tags are color-coded labels for categorizing tasks across lists.

- **Create**: Open the tag picker in the task detail panel, or use `#tagname` in the quick-add bar
- **Color**: Each tag has a customizable color — click the color swatch to change it
- **Auto-creation**: Using `#newtagname` in the quick-add bar automatically creates the tag if it doesn't exist
- **Remove**: Click the X on a tag badge in the detail panel to remove it from a task
- **Filter**: Use tags in custom smart list filters to create views like "all #work tasks" or "everything except #personal"

---

## Goals

Goals are higher-level objectives that tasks can be linked to.

### Creating Goals

- Click the **+** button in the Goals section of the sidebar
- Set a name, description, timeframe (daily/weekly/monthly/quarterly/yearly), and target date
- Goals support **hierarchy** — nest goals under parent goals (e.g., Yearly > Quarterly > Monthly > Weekly)

### Linking Tasks to Goals

- In the task detail panel, use the goal picker to link a task to one or more goals
- Set an **alignment strength** (1-5) to indicate how directly the task supports the goal
- Claude can also link tasks to goals via the MCP integration

### Progress Tracking

- Click a goal in the sidebar to see its detail panel
- Progress is calculated as: `completed linked tasks / total linked tasks`
- A progress bar and percentage show how close you are to achieving the goal

---

## Calendar & Scheduling

### Calendar Views

Select **Calendar** from the smart lists in the sidebar. Four view modes are available:

| View | Description |
|------|-------------|
| **Day** | Single day with an hourly time grid |
| **Business Week** | Monday through Friday |
| **Full Week** | Sunday through Saturday |
| **Month** | Monthly grid with task indicators |

Click any task on the calendar to open its detail panel. Drag tasks between days to reschedule them.

### Day Planner

The Day view provides a detailed hourly scheduling grid:

- **Time grid**: 6:00 AM to 10:00 PM with hourly rows
- **Task blocks**: Scheduled tasks appear as colored blocks, sized by their estimated duration
- **Unscheduled sidebar**: Tasks due today but without a specific time appear in a sidebar
- **Drag-and-drop**: Drag tasks from the sidebar onto the time grid to schedule them, or drag between time slots to reschedule
- **15-minute snap**: Tasks snap to 15-minute intervals when dragged

### Recurring Tasks

Set a task to repeat on a schedule:

| Frequency | Description |
|-----------|-------------|
| Daily | Every N days |
| Weekdays | Every weekday (Mon-Fri) |
| Weekly | Every N weeks |
| Monthly | Every N months |

When you complete a recurring task, the next instance is automatically created with the appropriate due date. Set a recurrence end date to stop the cycle.

---

## Daily Planning

A guided 4-step planning ritual that helps you prepare for your day. Inspired by Sunsama.

### Opening the Planner

- **Auto-launch**: The planning overlay automatically appears on your first app open each day (can be disabled in settings)
- **Sidebar**: Click "Plan My Day"
- **Command Palette**: Ctrl+K, then search for "Plan My Day" or "Plan Another Day..."

### Choosing a Date

A date picker in the planning overlay header lets you plan any date:

- **Quick presets**: Today, Tomorrow, Next Monday
- **Week presets**: "Rest of This Week" (shown Mon-Thu) or "Plan Next Week" — plans Mon through Fri in sequence
- **Calendar**: Pick any future date from a calendar widget

### Week Mode

When you select a week preset, the planner enters week mode:

- A day tab bar appears showing each day (e.g., Mon 17, Tue 18, Wed 19...)
- The 4-step flow runs for each day independently
- Completing one day auto-advances to the next
- Click any tab to jump to a specific day
- Completed days show a checkmark

### The 4 Steps

**Step 1 — Review Previous Day**
See what you completed and what's left over. For incomplete tasks, you can:
- **Reschedule** — Move it to your target date
- **Defer** — Remove the due date for later
- **Drop** — Mark it as complete (abandon it)

The label is dynamic: "Review Yesterday" when planning today, "Review Today" when planning tomorrow, "Review Friday" when planning Monday.

**Step 2 — Build Your List**
A two-column layout shows available tasks on the left and your selected tasks on the right. Click **+** to add tasks to your plan, or **-** to remove them. A capacity meter at the bottom shows how much of your working hours you've filled:
- Green: under 80% — plenty of room
- Amber: 80-100% — getting full
- Red: over 100% — overbooked

**Step 3 — Schedule**
Assign specific times to your planned tasks. Click time slots from 8 AM to 6 PM to schedule each task. A capacity summary shows total planned hours vs available hours.

**Step 4 — Confirm**
Review your plan with summary cards showing task count, estimated hours, and expected finish time. Then:
- **"Start My Day"** — when planning today
- **"Save Plan"** — when planning a future date
- **"Next Day"** — when in week mode with days remaining

### Planning Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Auto-launch | On | Show the planner on first open each day |
| Working hours per day | 8 | Used for capacity calculations |

---

## Focus Timer

A Pomodoro-style timed work session linked to a specific task.

### How to Use

1. Open a task's detail panel
2. Click the focus/timer button
3. Choose a duration (default 90 minutes)
4. A fullscreen overlay appears with:
   - Your task title
   - A circular progress ring showing time remaining
   - A countdown timer (MM:SS)
   - Pause/Resume and End buttons

### Controls

| Action | How |
|--------|-----|
| Pause/Resume | Click the Pause button, or press **Space** |
| End session | Click End, or press **Escape** |

When the timer completes (or you end it early), the session is recorded. You can view past focus sessions for any task in its detail panel.

---

## Dashboard & Analytics

Select **Dashboard** from the smart lists in the sidebar to view your productivity metrics.

### Today Summary

Four cards at the top show your daily stats:

| Card | What It Shows |
|------|---------------|
| **Completed** | Number of tasks completed today |
| **Completion Rate** | Percentage of today's tasks completed |
| **Focus Time** | Total focus timer minutes logged today |
| **Planned** | Number of tasks due today |

### Weekly Completion Chart

A bar chart showing your daily completion counts for the past 7 days. Today's bar is highlighted.

### Streak Tracking

Your current streak (consecutive days with at least one completed task) and your longest streak are displayed. A flame icon indicates an active streak.

### Focus Goal Progress

A circular progress ring shows how much of your daily focus goal you've completed. Set your daily focus goal in **Settings > Productivity** (default: 120 minutes).

### Priority Distribution

A breakdown of your active tasks by priority tier (Do Now, Do Soon, Backlog) showing the count in each category.

### Streaks & Celebrations

UpTier celebrates your productivity milestones:

- **All daily tasks complete** — Confetti animation with a congratulatory message
- **Streak milestones** (e.g., 10-day, 30-day streaks) — Confetti with the milestone count

Celebrations appear as a brief overlay and dismiss automatically.

---

## AI Features

### Due Date Suggestions

When viewing a task without a due date, UpTier can suggest one based on:
- How long similar tasks in the same list typically take
- The task's priority tier (higher priority = shorter timeframe)
- Avoids suggesting weekends

Click the suggestion to apply it.

### Task Breakdown Suggestions

Click **"Suggest Task Breakdown"** to get AI-generated subtasks. The system recognizes 12 common task types (meetings, presentations, coding features, bug fixes, research, design, testing, etc.) and suggests relevant steps. Click **"Add Subtasks"** to create them all at once.

### At-Risk Deadline Warnings

Tasks that might miss their deadline are flagged with warning indicators:

- **Amber triangle**: Tight buffer — remaining time is less than 2x the estimated duration
- **Red triangle**: Critical — remaining time is less than the estimated duration (can't finish in time)

These indicators appear next to the due date on task items. Hover for a tooltip explaining the risk (e.g., "Only 2h left but task needs ~4h"). The sidebar also shows an amber badge count on My Day and Planned when at-risk tasks exist.

### AI Prioritization (via Claude)

With the Claude MCP integration, you can ask Claude to prioritize your tasks using five strategies:

| Strategy | Description |
|----------|-------------|
| Balanced | Weighted combination of effort, impact, urgency, importance |
| Urgent First | Prioritizes by urgency |
| Quick Wins | Low effort + high impact first |
| High Impact | Prioritizes by impact |
| Eisenhower | Classic urgent vs important matrix |

Claude sets priority tiers, scores, and reasoning for each task.

---

## Claude Integration (MCP)

UpTier includes a Model Context Protocol (MCP) server that lets Claude Desktop manage your tasks through natural conversation.

### Setup

Add UpTier to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "uptier": {
      "command": "node",
      "args": ["path/to/apps/mcp-server/dist/index.js"]
    }
  }
}
```

### What Claude Can Do

With the MCP integration, Claude has access to 34 tools across 6 categories:

| Category | Capabilities |
|----------|-------------|
| **Tasks** | Create, update, delete, complete, move, and bulk-create tasks |
| **Lists** | Create, update, delete, and reorder lists |
| **Goals** | Create, update, delete goals; link/unlink tasks; check progress |
| **Priorities** | Analyze and prioritize tasks using 5 strategies; bulk-set priority tiers and scores |
| **Subtasks** | Add, update, delete, complete, reorder subtasks; decompose tasks into subtasks |
| **Schedule** | View day schedules, schedule/unschedule tasks, get full daily planning context for any date |

Changes made by Claude through the MCP server appear in the app in real-time.

---

## Settings

Open settings via the gear icon in the sidebar or through the command palette.

### Themes

Six themes are available:

| Theme | Description |
|-------|-------------|
| Dark | Default dark theme |
| Light | Light theme |
| Earth Dark | Warm dark earth tones |
| Earth Light | Warm light earth tones |
| Cyberpunk | Neon/cyber aesthetic |
| System | Follows your OS dark/light preference |

Switch themes in Settings or via the command palette (Ctrl+K, then search for a theme name).

### Features

Control which features are active in the app:

- **Preset buttons** — Click Basic, Intermediate, or Advanced to switch all features at once
- **Individual toggles** — Turn each feature on or off independently
- **Tier indicator** — Shows your current tier (or "Custom" if you've mixed features from different presets)

See the [Feature Tiers & Onboarding](#feature-tiers--onboarding) section for the full feature matrix.

### Notifications

Desktop notifications remind you of upcoming tasks:

| Setting | Default | Description |
|---------|---------|-------------|
| Enabled | On | Master toggle for all notifications |
| Default reminder | 15 min | Minutes before due time to notify |
| Snooze duration | 10 min | How long snoozing postpones a reminder |
| Sound | On | Play a sound with notifications |

Reminders are set automatically from a task's due date and time. Click a notification to jump to the task.

### Productivity

Set your daily focus time goal:

| Option | Duration |
|--------|----------|
| Light | 30 min |
| Moderate | 60 min |
| Standard | 90 min |
| Full (default) | 120 min |
| Extended | 180 min |
| Maximum | 240 min |

This goal is displayed on the Dashboard as a progress ring.

### Database Profiles

Manage multiple separate databases (e.g., work vs personal):

- **Create** a new database profile with a custom name and color
- **Switch** between databases at any time
- **Delete** profiles you no longer need (the default profile can't be deleted)

### Export & Import

**Export formats:**
- **JSON** — Full data export (lists, tasks, goals, subtasks, tags, and all relationships)
- **CSV** — Flat task export for spreadsheets

**Import formats:**
- **UpTier JSON** — Import a previous UpTier export
- **Todoist CSV** — Import tasks from a Todoist export

Import flow: select a file, preview what will be imported, then choose merge (add to existing data) or replace (clear and reimport).

---

## Keyboard Shortcuts

### Navigation

| Shortcut | Action |
|----------|--------|
| Ctrl+K | Open command palette |
| Arrow Up / Down | Navigate between tasks |
| Escape | Close panel / clear selection |

### Tasks

| Shortcut | Action |
|----------|--------|
| Ctrl+N | Focus quick-add input |
| Space | Toggle task completion |
| Delete | Delete selected task |

### Search

| Shortcut | Action |
|----------|--------|
| Ctrl+F | Focus search input |

### Focus Timer

| Shortcut | Action |
|----------|--------|
| Space | Pause / resume timer |
| Escape | End focus session |

### Daily Planning

| Shortcut | Action |
|----------|--------|
| Escape | Close planning overlay |
| Enter | Advance to next step |
| Backspace | Go back to previous step |

### Help

| Shortcut | Action |
|----------|--------|
| ? | Show keyboard shortcuts dialog |

### Command Palette

Press **Ctrl+K** to open the command palette. From there you can:

- Search for tasks by name across all lists
- Jump to any list or goal
- Switch between themes
- Filter by priority (Do Now / Planned)
- Open the daily planner ("Plan My Day" or "Plan Another Day...")
- Open settings or keyboard shortcuts reference

---

## Data & Privacy

- All data is stored **locally** in a SQLite database on your machine
- There is **no cloud sync** and **no account required**
- The MCP server shares the same local database — Claude reads and writes to your local data only
- Use **Export** (Settings > Export) to back up your data at any time
- Database files can be found in your system's app data directory
