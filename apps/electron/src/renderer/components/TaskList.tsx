import { useMemo, useState, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Search, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { TaskItem } from './TaskItem';
import { QuickAdd } from './QuickAdd';
import type { QuickAddHandle } from './QuickAdd';
import { TierHeader } from './TierHeader';
import type { TaskWithGoals, PriorityTier } from '@uptier/shared';

interface TaskListProps {
  listId: string;
  selectedTaskId?: string;
  onSelectTask: (task: TaskWithGoals | null) => void;
  onStartFocus?: (task: TaskWithGoals) => void;
  isFilterList?: boolean;
}

export interface TaskListHandle {
  focusQuickAdd: () => void;
  focusSearch: () => void;
  getAllTasks: () => TaskWithGoals[];
  selectTaskByIndex: (index: number) => void;
}

// Smart list detection helper
const isSmartList = (id: string) => id.startsWith('smart:');

const SMART_LIST_EMPTY_STATES: Record<string, { title: string; subtitle: string }> = {
  'smart:my_day': { title: 'No tasks due today', subtitle: 'Tasks with today\'s due date will appear here' },
  'smart:important': { title: 'No important tasks', subtitle: 'Tier 1 priority tasks will appear here' },
  'smart:planned': { title: 'No planned tasks', subtitle: 'Tasks with due dates will appear here' },
  'smart:completed': { title: 'No completed tasks', subtitle: 'Completed tasks will appear here' },
};

export const TaskList = forwardRef<TaskListHandle, TaskListProps>(function TaskList(
  { listId, selectedTaskId, onSelectTask, onStartFocus, isFilterList },
  ref
) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const quickAddRef = useRef<QuickAddHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSmartListView = isSmartList(listId) || !!isFilterList;

  const { data: tasks = [], isLoading } = useQuery<TaskWithGoals[]>({
    queryKey: ['tasks', listId],
    queryFn: () => window.electronAPI.tasks.getByList({ list_id: listId }),
    enabled: !!listId,
  });

  // Query at-risk tasks for deadline warning indicators
  const { data: atRiskTasks = [] } = useQuery<Array<{
    id: string;
    risk_level: 'warning' | 'critical';
    reason: string;
  }>>({
    queryKey: ['deadlines', 'atRisk'],
    queryFn: () => window.electronAPI.deadlines.getAtRisk(),
    staleTime: 60_000,
  });

  const atRiskMap = useMemo(() => {
    const map = new Map<string, { risk_level: 'warning' | 'critical'; reason: string }>();
    for (const t of atRiskTasks) {
      map.set(t.id, { risk_level: t.risk_level, reason: t.reason });
    }
    return map;
  }, [atRiskTasks]);

  // Filter tasks by search query (matches title, notes, tags, and goals)
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        (task.notes && task.notes.toLowerCase().includes(query)) ||
        task.tags?.some(tag => tag.name.toLowerCase().includes(query)) ||
        task.goals?.some(goal => goal.goal_name.toLowerCase().includes(query))
    );
  }, [tasks, searchQuery]);

  // Group tasks by priority tier
  const groupedTasks = useMemo(() => {
    const tier1: TaskWithGoals[] = [];
    const tier2: TaskWithGoals[] = [];
    const tier3: TaskWithGoals[] = [];
    const unprioritized: TaskWithGoals[] = [];

    for (const task of filteredTasks) {
      if (task.priority_tier === 1) {
        tier1.push(task);
      } else if (task.priority_tier === 2) {
        tier2.push(task);
      } else if (task.priority_tier === 3) {
        tier3.push(task);
      } else {
        unprioritized.push(task);
      }
    }

    return { tier1, tier2, tier3, unprioritized };
  }, [filteredTasks]);

  // Flat list for keyboard navigation
  const flatTaskList = useMemo(() => {
    return [
      ...groupedTasks.tier1,
      ...groupedTasks.tier2,
      ...groupedTasks.tier3,
      ...groupedTasks.unprioritized,
    ];
  }, [groupedTasks]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focusQuickAdd: () => quickAddRef.current?.focus(),
    focusSearch: () => searchInputRef.current?.focus(),
    getAllTasks: () => flatTaskList,
    selectTaskByIndex: (index: number) => {
      if (index >= 0 && index < flatTaskList.length) {
        onSelectTask(flatTaskList[index]);
      }
    },
  }));

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before starting drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - reorder tasks
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        // Find the tasks being moved
        const activeIndex = flatTaskList.findIndex((t) => t.id === active.id);
        const overIndex = flatTaskList.findIndex((t) => t.id === over.id);

        if (activeIndex !== -1 && overIndex !== -1) {
          // Create new order
          const newOrder = [...flatTaskList];
          const [movedTask] = newOrder.splice(activeIndex, 1);
          newOrder.splice(overIndex, 0, movedTask);

          // Send reorder to backend
          await window.electronAPI.tasks.reorder(listId, newOrder.map((t) => t.id));
          queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
        }
      }
    },
    [flatTaskList, listId, queryClient]
  );

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    if (completed) {
      await window.electronAPI.tasks.complete(taskId);
    } else {
      await window.electronAPI.tasks.uncomplete(taskId);
    }
    queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
    queryClient.invalidateQueries({ queryKey: ['lists'] });
  };

  const handleTaskCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
    queryClient.invalidateQueries({ queryKey: ['lists'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Loading tasks...
      </div>
    );
  }

  const renderTaskGroup = (groupTasks: TaskWithGoals[], tier?: PriorityTier) => {
    if (groupTasks.length === 0) return null;

    return (
      <div className="mb-4">
        {tier && <TierHeader tier={tier} count={groupTasks.length} />}
        <div className="space-y-1">
          {groupTasks.map((task) => {
            const risk = atRiskMap.get(task.id);
            return (
              <TaskItem
                key={task.id}
                task={task}
                isSelected={task.id === selectedTaskId}
                onSelect={() => onSelectTask(task)}
                onComplete={(completed) => handleTaskComplete(task.id, completed)}
                onStartFocus={onStartFocus}
                isDraggable={!isSmartListView}
                riskLevel={risk?.risk_level}
                riskReason={risk?.reason}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search tasks... (Ctrl+F)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchQuery('');
                searchInputRef.current?.blur();
              }
            }}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="text-xs text-muted-foreground mt-1 px-1">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'result' : 'results'}
          </div>
        )}
      </div>

      {/* Quick Add - only for regular lists */}
      {!isSmartListView && (
        <div className="px-4 pb-4 border-b border-border">
          <QuickAdd ref={quickAddRef} listId={listId} onTaskCreated={handleTaskCreated} />
        </div>
      )}

      {/* Task List */}
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={flatTaskList.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="p-4">
              {tasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {isSmartListView && SMART_LIST_EMPTY_STATES[listId] ? (
                    <>
                      <p>{SMART_LIST_EMPTY_STATES[listId].title}</p>
                      <p className="text-sm">{SMART_LIST_EMPTY_STATES[listId].subtitle}</p>
                    </>
                  ) : (
                    <>
                      <p>No tasks yet</p>
                      <p className="text-sm">Add a task above to get started</p>
                    </>
                  )}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No matching tasks</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              ) : (
                <>
                  {renderTaskGroup(groupedTasks.tier1, 1)}
                  {renderTaskGroup(groupedTasks.tier2, 2)}
                  {renderTaskGroup(groupedTasks.tier3, 3)}
                  {groupedTasks.unprioritized.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                        UNPRIORITIZED
                      </div>
                      <div className="space-y-1">
                        {groupedTasks.unprioritized.map((task) => {
                          const risk = atRiskMap.get(task.id);
                          return (
                            <TaskItem
                              key={task.id}
                              task={task}
                              isSelected={task.id === selectedTaskId}
                              onSelect={() => onSelectTask(task)}
                              onComplete={(completed) => handleTaskComplete(task.id, completed)}
                              onStartFocus={onStartFocus}
                              isDraggable={!isSmartListView}
                              riskLevel={risk?.risk_level}
                              riskReason={risk?.reason}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </ScrollArea>
    </div>
  );
});
