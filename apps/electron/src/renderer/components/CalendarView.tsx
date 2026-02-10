import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  format,
  isToday,
  isSameMonth,
} from 'date-fns';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TaskWithGoals } from '@uptier/shared';

// ============================================================================
// Types
// ============================================================================

type CalendarViewMode = 'business-week' | 'week' | 'month';

interface CalendarViewProps {
  onSelectTask: (task: TaskWithGoals) => void;
  selectedTaskId?: string;
}

// ============================================================================
// Constants
// ============================================================================

const CALENDAR_VIEW_MODE_KEY = 'uptier-calendar-view-mode';
const WEEK_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BUSINESS_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const VIEW_MODE_OPTIONS: { value: CalendarViewMode; label: string; shortLabel: string }[] = [
  { value: 'business-week', label: 'Business Week', shortLabel: 'BW' },
  { value: 'week', label: 'Week', shortLabel: 'W' },
  { value: 'month', label: 'Month', shortLabel: 'M' },
];

const MAX_MONTH_VISIBLE_TASKS = 3;

// ============================================================================
// CalendarTaskItem (draggable)
// ============================================================================

interface CalendarTaskItemProps {
  task: TaskWithGoals;
  isSelected: boolean;
  onSelect: () => void;
  compact: boolean;
  isOverlay?: boolean;
}

function CalendarTaskItem({ task, isSelected, onSelect, compact, isOverlay }: CalendarTaskItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        'rounded px-1.5 py-0.5 text-xs cursor-pointer truncate transition-colors',
        isSelected
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50',
        task.priority_tier === 1 && 'border-l-2 border-red-500',
        task.priority_tier === 2 && 'border-l-2 border-amber-500',
        task.priority_tier === 3 && 'border-l-2 border-gray-500',
        !task.priority_tier && 'border-l-2 border-transparent',
        isDragging && !isOverlay && 'opacity-30',
        isOverlay && 'bg-accent shadow-lg opacity-90',
      )}
    >
      <span className="truncate">{task.title}</span>
      {!compact && task.due_time && (
        <span className="text-muted-foreground ml-1">{task.due_time}</span>
      )}
    </div>
  );
}

// ============================================================================
// CalendarDayCell (droppable)
// ============================================================================

interface CalendarDayCellProps {
  dateKey: string;
  date: Date;
  tasks: TaskWithGoals[];
  isCurrentMonth: boolean;
  viewMode: CalendarViewMode;
  onSelectTask: (task: TaskWithGoals) => void;
  selectedTaskId?: string;
}

function CalendarDayCell({
  dateKey,
  date,
  tasks,
  isCurrentMonth,
  viewMode,
  onSelectTask,
  selectedTaskId,
}: CalendarDayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  const today = isToday(date);
  const isMonthView = viewMode === 'month';
  const visibleTasks = isMonthView ? tasks.slice(0, MAX_MONTH_VISIBLE_TASKS) : tasks;
  const overflowCount = isMonthView ? Math.max(0, tasks.length - MAX_MONTH_VISIBLE_TASKS) : 0;

  const taskList = (
    <div className="flex-1 min-h-0 space-y-0.5">
      {visibleTasks.map((task) => (
        <CalendarTaskItem
          key={task.id}
          task={task}
          isSelected={task.id === selectedTaskId}
          onSelect={() => onSelectTask(task)}
          compact={isMonthView}
        />
      ))}
      {overflowCount > 0 && (
        <div className="text-xs text-muted-foreground px-1.5">
          +{overflowCount} more
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-r border-b border-border p-1 flex flex-col min-h-0 overflow-hidden transition-colors',
        !isCurrentMonth && 'bg-muted/20',
        isOver && 'bg-primary/10 ring-1 ring-inset ring-primary/40',
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between px-1 mb-1 flex-shrink-0">
        <span
          className={cn(
            'text-xs font-medium',
            today &&
              'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center',
            !isCurrentMonth && !today && 'text-muted-foreground/40',
          )}
        >
          {format(date, 'd')}
        </span>
        {tasks.length > 0 && isMonthView && (
          <span className="text-xs text-muted-foreground">{tasks.length}</span>
        )}
      </div>

      {/* Tasks */}
      {isMonthView ? (
        taskList
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          {taskList}
        </ScrollArea>
      )}
    </div>
  );
}

// ============================================================================
// CalendarToolbar
// ============================================================================

interface CalendarToolbarProps {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  periodLabel: string;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onNavigateToday: () => void;
}

function CalendarToolbar({
  viewMode,
  onViewModeChange,
  periodLabel,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
}: CalendarToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onNavigatePrev} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onNavigateToday} className="h-8 px-3 text-xs">
          Today
        </Button>
        <Button variant="ghost" size="sm" onClick={onNavigateNext} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold ml-2">{periodLabel}</span>
      </div>

      {/* Right: View mode toggle */}
      <div className="flex items-center gap-0.5 bg-secondary/50 rounded-md p-0.5">
        {VIEW_MODE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onViewModeChange(option.value)}
            className={cn(
              'px-3 py-1 text-xs rounded transition-colors',
              viewMode === option.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title={option.label}
          >
            {option.shortLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CalendarView (main component)
// ============================================================================

export function CalendarView({ onSelectTask, selectedTaskId }: CalendarViewProps) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    const saved = localStorage.getItem(CALENDAR_VIEW_MODE_KEY);
    if (saved === 'business-week' || saved === 'week' || saved === 'month') return saved;
    return 'week';
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeDragTask, setActiveDragTask] = useState<TaskWithGoals | null>(null);

  // Drag-and-drop sensors (8px distance to prevent click-vs-drag ambiguity)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Persist view mode
  useEffect(() => {
    localStorage.setItem(CALENDAR_VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  // Compute date range and days array
  const { startDate, endDate, days } = useMemo(() => {
    let start: Date, end: Date;

    switch (viewMode) {
      case 'business-week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
        start = addDays(weekStart, 1); // Monday
        end = addDays(weekStart, 5); // Friday
        break;
      }
      case 'week': {
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        end = endOfWeek(currentDate, { weekStartsOn: 0 });
        break;
      }
      case 'month': {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        start = startOfWeek(monthStart, { weekStartsOn: 0 });
        end = endOfWeek(monthEnd, { weekStartsOn: 0 });
        break;
      }
    }

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      days: eachDayOfInterval({ start, end }),
    };
  }, [viewMode, currentDate]);

  // Fetch tasks for the date range
  const { data: tasks = [] } = useQuery<TaskWithGoals[]>({
    queryKey: ['tasks', 'calendar', startDate, endDate],
    queryFn: () => window.electronAPI.tasks.getByDateRange(startDate, endDate),
  });

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskWithGoals[]>();
    for (const day of days) {
      map.set(format(day, 'yyyy-MM-dd'), []);
    }
    for (const task of tasks) {
      if (task.due_date) {
        const existing = map.get(task.due_date);
        if (existing) {
          existing.push(task);
        }
      }
    }
    return map;
  }, [tasks, days]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as TaskWithGoals | undefined;
    setActiveDragTask(task ?? null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;

    const task = active.data.current?.task as TaskWithGoals | undefined;
    if (!task) return;

    const newDate = over.id as string; // dateKey in yyyy-MM-dd format
    if (newDate === task.due_date) return; // dropped on same day

    await window.electronAPI.tasks.update(task.id, { due_date: newDate });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  }, [queryClient]);

  // Navigation handlers
  const navigatePrev = () => {
    setCurrentDate((prev) =>
      viewMode === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1),
    );
  };

  const navigateNext = () => {
    setCurrentDate((prev) =>
      viewMode === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1),
    );
  };

  const navigateToday = () => setCurrentDate(new Date());

  // Period label
  const periodLabel = useMemo(() => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy');
    }
    const start = days[0];
    const end = days[days.length - 1];
    if (!start || !end) return '';
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
    }
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }, [viewMode, currentDate, days]);

  // Day header names
  const dayNames = viewMode === 'business-week' ? BUSINESS_DAY_NAMES : WEEK_DAY_NAMES;

  // Grid columns
  const gridCols = viewMode === 'business-week' ? 'grid-cols-5' : 'grid-cols-7';

  // Number of week rows for month view
  const weekRows = viewMode === 'month' ? Math.ceil(days.length / 7) : 1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CalendarToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        periodLabel={periodLabel}
        onNavigatePrev={navigatePrev}
        onNavigateNext={navigateNext}
        onNavigateToday={navigateToday}
      />

      {/* Calendar Grid */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Day name headers */}
          <div className={cn('grid border-b border-border flex-shrink-0', gridCols)}>
            {dayNames.map((name) => (
              <div
                key={name}
                className="text-xs font-medium text-muted-foreground text-center py-2 border-r border-border last:border-r-0"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Day cells grid */}
          <div
            className={cn('grid flex-1 min-h-0 overflow-hidden', gridCols)}
            style={{
              gridTemplateRows: viewMode === 'month'
                ? `repeat(${weekRows}, minmax(0, 1fr))`
                : 'minmax(0, 1fr)',
            }}
          >
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              return (
                <CalendarDayCell
                  key={dateKey}
                  dateKey={dateKey}
                  date={day}
                  tasks={tasksByDay.get(dateKey) || []}
                  isCurrentMonth={viewMode !== 'month' || isSameMonth(day, currentDate)}
                  viewMode={viewMode}
                  onSelectTask={onSelectTask}
                  selectedTaskId={selectedTaskId}
                />
              );
            })}
          </div>
        </div>

        {/* Drag overlay - floating task preview */}
        <DragOverlay dropAnimation={null}>
          {activeDragTask && (
            <CalendarTaskItem
              task={activeDragTask}
              isSelected={false}
              onSelect={() => {}}
              compact={viewMode === 'month'}
              isOverlay
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
