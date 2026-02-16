import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sun,
  Star,
  Calendar,
  CalendarDays,
  CheckCircle2,
  List,
  Target,
  Settings,
  Plus,
  FileText,
  Keyboard,
  Moon,
  SunMedium,
  Leaf,
  Monitor,
  Zap,
  AlertCircle,
  Sunrise,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from './ui/command';
import type { ListWithCount, GoalWithProgress, TaskWithGoals } from '@uptier/shared';
import { useFeatures } from '../hooks/useFeatures';

// ============================================================================
// Types
// ============================================================================

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToList: (listId: string) => void;
  onNavigateToGoal: (goal: GoalWithProgress) => void;
  onSelectTask: (task: TaskWithGoals) => void;
  onOpenSettings: () => void;
  onShowShortcuts?: () => void;
  onChangeTheme?: (theme: string) => void;
  onPlanDay?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const SMART_LISTS = [
  { id: 'smart:my_day', name: 'My Day', icon: Sun, color: '#f59e0b' },
  { id: 'smart:important', name: 'Important', icon: Star, color: '#ef4444' },
  { id: 'smart:planned', name: 'Planned', icon: Calendar, color: '#3b82f6' },
  { id: 'smart:calendar', name: 'Calendar', icon: CalendarDays, color: '#8b5cf6' },
  { id: 'smart:completed', name: 'Completed', icon: CheckCircle2, color: '#22c55e' },
];

const THEMES = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: SunMedium },
  { value: 'earth-dark', label: 'Earth Dark', icon: Leaf },
  { value: 'earth-light', label: 'Earth Light', icon: Leaf },
  { value: 'cyberpunk', label: 'Cyberpunk', icon: Zap },
  { value: 'system', label: 'System', icon: Monitor },
];

// ============================================================================
// CommandPalette
// ============================================================================

export function CommandPalette({
  open,
  onOpenChange,
  onNavigateToList,
  onNavigateToGoal,
  onSelectTask,
  onOpenSettings,
  onShowShortcuts,
  onChangeTheme,
  onPlanDay,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const features = useFeatures();

  // Reset search when closing
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  // Fetch lists
  const { data: lists = [] } = useQuery<ListWithCount[]>({
    queryKey: ['lists'],
    queryFn: () => window.electronAPI.lists.getAll(),
    enabled: open,
  });

  // Fetch goals
  const { data: goals = [] } = useQuery<GoalWithProgress[]>({
    queryKey: ['goals'],
    queryFn: () => window.electronAPI.goals.getAllWithProgress(),
    enabled: open,
  });

  // Search tasks (only when query >= 2 chars)
  const { data: searchResults = [] } = useQuery<TaskWithGoals[]>({
    queryKey: ['tasks', 'search', search],
    queryFn: () => window.electronAPI.tasks.search(search, 15),
    enabled: open && search.length >= 2,
  });

  const handleSelect = useCallback((callback: () => void) => {
    callback();
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search tasks, lists, goals..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Task search results */}
        {search.length >= 2 && searchResults.length > 0 && (
          <>
            <CommandGroup heading="Tasks">
              {searchResults.map((task) => (
                <CommandItem
                  key={task.id}
                  value={`task-${task.title}`}
                  onSelect={() => handleSelect(() => onSelectTask(task))}
                >
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{task.title}</span>
                  {task.due_date && (
                    <span className="text-xs text-muted-foreground ml-2">{task.due_date}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Smart lists */}
        <CommandGroup heading="Views">
          {SMART_LISTS.filter((sl) => {
            if (sl.id === 'smart:calendar') return features.calendarView;
            if (sl.id === 'smart:dashboard') return features.dashboard;
            return true;
          }).map((list) => {
            const Icon = list.icon;
            return (
              <CommandItem
                key={list.id}
                value={list.name}
                onSelect={() => handleSelect(() => onNavigateToList(list.id))}
              >
                <Icon className="mr-2 h-4 w-4" style={{ color: list.color }} />
                <span>{list.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {/* User lists */}
        {lists.length > 0 && (
          <CommandGroup heading="Lists">
            {lists.map((list) => (
              <CommandItem
                key={list.id}
                value={`list-${list.name}`}
                onSelect={() => handleSelect(() => onNavigateToList(list.id))}
              >
                <List className="mr-2 h-4 w-4" style={{ color: list.color }} />
                <span className="flex-1">{list.name}</span>
                {list.incomplete_count > 0 && (
                  <span className="text-xs text-muted-foreground">{list.incomplete_count}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Goals */}
        {features.goalsSystem && goals.length > 0 && (
          <CommandGroup heading="Goals">
            {goals.map((goal) => (
              <CommandItem
                key={goal.id}
                value={`goal-${goal.name}`}
                onSelect={() => handleSelect(() => onNavigateToGoal(goal))}
              >
                <Target className="mr-2 h-4 w-4 text-primary" />
                <span className="flex-1">{goal.name}</span>
                <span className="text-xs text-muted-foreground">
                  {goal.progress_percentage}%
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Priority Filters */}
        <CommandGroup heading="Filter by Priority">
          <CommandItem
            value="Show Do Now tasks"
            onSelect={() => handleSelect(() => onNavigateToList('smart:important'))}
          >
            <AlertCircle className="mr-2 h-4 w-4 text-red-400" />
            <span>Show Do Now tasks</span>
          </CommandItem>
          <CommandItem
            value="Show Planned tasks"
            onSelect={() => handleSelect(() => onNavigateToList('smart:planned'))}
          >
            <Calendar className="mr-2 h-4 w-4 text-blue-400" />
            <span>Show Planned tasks</span>
          </CommandItem>
        </CommandGroup>

        {/* Theme Switching */}
        {onChangeTheme && (
          <CommandGroup heading="Themes">
            {THEMES.map((theme) => {
              const Icon = theme.icon;
              return (
                <CommandItem
                  key={theme.value}
                  value={`theme-${theme.label}`}
                  onSelect={() => handleSelect(() => onChangeTheme(theme.value))}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{theme.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Actions */}
        <CommandGroup heading="Actions">
          <CommandItem
            value="Open Settings"
            onSelect={() => handleSelect(onOpenSettings)}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Open Settings</span>
          </CommandItem>
          <CommandItem
            value="Create New Task"
            onSelect={() => handleSelect(() => {
              // Navigate to My Day and let user use quick add
              onNavigateToList('smart:my_day');
            })}
          >
            <Plus className="mr-2 h-4 w-4" />
            <span>Create New Task</span>
          </CommandItem>
          {onShowShortcuts && (
            <CommandItem
              value="Keyboard Shortcuts"
              onSelect={() => handleSelect(onShowShortcuts)}
            >
              <Keyboard className="mr-2 h-4 w-4" />
              <span>Keyboard Shortcuts</span>
            </CommandItem>
          )}
          {features.dailyPlanning && onPlanDay && (
            <>
              <CommandItem
                value="Plan My Day"
                onSelect={() => handleSelect(onPlanDay)}
              >
                <Sunrise className="mr-2 h-4 w-4" />
                <span>Plan My Day</span>
              </CommandItem>
              <CommandItem
                value="Plan Another Day"
                onSelect={() => handleSelect(onPlanDay)}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Plan Another Day...</span>
              </CommandItem>
            </>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
