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
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');

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
          {SMART_LISTS.map((list) => {
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
        {goals.length > 0 && (
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
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
