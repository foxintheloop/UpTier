import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import type { TaskWithGoals } from '@uptier/shared';

// ============================================================================
// Constants
// ============================================================================

const DAY_START_HOUR = 0;
const DAY_END_HOUR = 24;
const HOUR_HEIGHT_PX = 80;
const SNAP_MINUTES = 15;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR;
const TOTAL_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT_PX;
const DEFAULT_DURATION = 30;
const BLOCK_GAP_PX = 2;

// Panel resize constants
const MIN_PANEL_WIDTH = 150;
const MAX_PANEL_WIDTH = 500;
const DEFAULT_PANEL_WIDTH = 224; // matches w-56

// ============================================================================
// Helpers
// ============================================================================

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function minutesToTop(minutes: number): number {
  return ((minutes - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT_PX;
}

function durationToHeight(duration: number): number {
  return (duration / 60) * HOUR_HEIGHT_PX;
}

function snapToGrid(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function formatTimeRange(startTime: string, durationMinutes: number): string {
  const startMins = timeToMinutes(startTime);
  const endMins = startMins + durationMinutes;
  return `${startTime} – ${minutesToTime(endMins)}`;
}

// ============================================================================
// TimeGridBlock (draggable task block on the grid)
// ============================================================================

interface TimeGridBlockProps {
  task: TaskWithGoals;
  isSelected: boolean;
  onSelect: () => void;
  onResizeStart: (taskId: string) => void;
}

function TimeGridBlock({ task, isSelected, onSelect, onResizeStart }: TimeGridBlockProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const startMinutes = task.due_time ? timeToMinutes(task.due_time) : 0;
  const duration = task.estimated_minutes || DEFAULT_DURATION;
  const top = minutesToTop(startMinutes);
  const rawHeight = Math.max(durationToHeight(duration), 20 + BLOCK_GAP_PX);
  const height = rawHeight - BLOCK_GAP_PX;

  const paddingClass = height <= 24 ? 'py-px' : height <= 36 ? 'py-0.5' : 'py-1';

  return (
    <div
      ref={setNodeRef}
      data-resize-id={task.id}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        'absolute left-14 right-2 rounded-md px-2 cursor-grab active:cursor-grabbing transition-shadow overflow-hidden group',
        paddingClass,
        isSelected
          ? 'bg-primary/20 ring-1 ring-primary shadow-md'
          : 'bg-accent/80 hover:bg-accent shadow-sm',
        task.priority_tier === 1 && 'border-l-3 border-red-500',
        task.priority_tier === 2 && 'border-l-3 border-amber-500',
        task.priority_tier === 3 && 'border-l-3 border-gray-500',
        !task.priority_tier && 'border-l-3 border-transparent',
        isDragging && 'opacity-30',
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        zIndex: isSelected ? 10 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-1 h-full">
        <div className="min-w-0 flex-1">
          <div className={cn('text-xs font-medium truncate', height <= 24 && 'leading-tight')}>{task.title}</div>
          {height >= 36 && (
            <div className="text-xs text-muted-foreground truncate">
              {formatTimeRange(task.due_time!, duration)}
            </div>
          )}
        </div>
        {height >= 28 && (
          <span className="text-xs text-muted-foreground shrink-0">{formatDuration(duration)}</span>
        )}
      </div>

      {/* Resize handle at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-primary/30 rounded-b-md"
        onPointerDown={(e) => {
          e.stopPropagation();
          onResizeStart(task.id);
        }}
      />
    </div>
  );
}

// ============================================================================
// TimeGridOverlayBlock (for DragOverlay)
// ============================================================================

interface TimeGridOverlayBlockProps {
  task: TaskWithGoals;
}

export function TimeGridOverlayBlock({ task }: TimeGridOverlayBlockProps) {
  const duration = task.estimated_minutes || DEFAULT_DURATION;
  const rawHeight = Math.max(durationToHeight(duration), 20 + BLOCK_GAP_PX);
  const height = rawHeight - BLOCK_GAP_PX;

  const paddingClass = height <= 24 ? 'py-px' : height <= 36 ? 'py-0.5' : 'py-1';

  return (
    <div
      className={cn(
        'rounded-md px-2 shadow-lg opacity-90 w-64',
        paddingClass,
        'bg-accent',
        task.priority_tier === 1 && 'border-l-3 border-red-500',
        task.priority_tier === 2 && 'border-l-3 border-amber-500',
        task.priority_tier === 3 && 'border-l-3 border-gray-500',
      )}
      style={{ height: `${height}px` }}
    >
      <div className={cn('text-xs font-medium truncate', height <= 24 && 'leading-tight')}>{task.title}</div>
      {height >= 28 && (
        <span className="text-xs text-muted-foreground">{formatDuration(duration)}</span>
      )}
    </div>
  );
}

// ============================================================================
// UnscheduledTaskItem (draggable item in the sidebar)
// ============================================================================

interface UnscheduledTaskItemProps {
  task: TaskWithGoals;
  isSelected: boolean;
  onSelect: () => void;
}

function UnscheduledTaskItem({ task, isSelected, onSelect }: UnscheduledTaskItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        'rounded-md px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing transition-colors',
        isSelected
          ? 'bg-primary/20 ring-1 ring-primary'
          : 'bg-accent/50 hover:bg-accent',
        task.priority_tier === 1 && 'border-l-2 border-red-500',
        task.priority_tier === 2 && 'border-l-2 border-amber-500',
        task.priority_tier === 3 && 'border-l-2 border-gray-500',
        !task.priority_tier && 'border-l-2 border-transparent',
        isDragging && 'opacity-30',
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-medium">{task.title}</span>
        {task.estimated_minutes && (
          <span className="text-muted-foreground shrink-0 flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {formatDuration(task.estimated_minutes)}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// UnscheduledSidebar (droppable)
// ============================================================================

interface UnscheduledSidebarProps {
  tasks: TaskWithGoals[];
  selectedTaskId?: string;
  onSelectTask: (task: TaskWithGoals) => void;
  width: number;
}

function UnscheduledSidebar({ tasks, selectedTaskId, onSelectTask, width }: UnscheduledSidebarProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unscheduled' });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'shrink-0 border-r border-border flex flex-col',
        isOver && 'bg-primary/5',
      )}
      style={{ width: `${width}px` }}
    >
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Unscheduled ({tasks.length})
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {tasks.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              All tasks scheduled
            </div>
          ) : (
            tasks.map((task) => (
              <UnscheduledTaskItem
                key={task.id}
                task={task}
                isSelected={task.id === selectedTaskId}
                onSelect={() => onSelectTask(task)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// TimeSlotDropZone (individual 15-min droppable slot)
// ============================================================================

interface TimeSlotDropZoneProps {
  timeStr: string;
  minutes: number;
}

function TimeSlotDropZone({ timeStr, minutes }: TimeSlotDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `time:${timeStr}` });
  const top = minutesToTop(minutes);
  const height = (SNAP_MINUTES / 60) * HOUR_HEIGHT_PX;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute left-14 right-0 transition-colors',
        isOver && 'bg-primary/15',
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    />
  );
}

// ============================================================================
// CurrentTimeIndicator
// ============================================================================

function CurrentTimeIndicator() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < DAY_START_HOUR * 60 || minutes > DAY_END_HOUR * 60) return null;

  const top = minutesToTop(minutes);

  return (
    <div className="absolute left-10 right-0 z-20 pointer-events-none" style={{ top: `${top}px` }}>
      <div className="flex items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
        <div className="flex-1 h-px bg-red-500" />
      </div>
    </div>
  );
}

// ============================================================================
// DayView (main export)
// ============================================================================

export interface DayViewProps {
  date: Date;
  tasks: TaskWithGoals[];
  onSelectTask: (task: TaskWithGoals) => void;
  selectedTaskId?: string;
}

export function DayView({ date, tasks, onSelectTask, selectedTaskId }: DayViewProps) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [resizingTaskId, setResizingTaskId] = useState<string | null>(null);
  const resizeStartY = useRef(0);
  const resizeStartMinutes = useRef(0);

  // Panel resize state
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('dayView:unscheduledWidth');
      if (stored) {
        const w = parseInt(stored, 10);
        if (w >= MIN_PANEL_WIDTH && w <= MAX_PANEL_WIDTH) return w;
      }
    } catch { /* ignore */ }
    return DEFAULT_PANEL_WIDTH;
  });
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const panelResizeStartX = useRef(0);
  const panelResizeStartWidth = useRef(0);

  const dateKey = format(date, 'yyyy-MM-dd');

  // Split tasks into scheduled (have due_time) and unscheduled
  const { scheduled, unscheduled } = useMemo(() => {
    const s: TaskWithGoals[] = [];
    const u: TaskWithGoals[] = [];
    for (const task of tasks) {
      if (task.due_date === dateKey && task.due_time) {
        s.push(task);
      } else if (task.due_date === dateKey && !task.due_time) {
        u.push(task);
      }
    }
    // Sort scheduled by time
    s.sort((a, b) => (a.due_time ?? '').localeCompare(b.due_time ?? ''));
    return { scheduled: s, unscheduled: u };
  }, [tasks, dateKey]);

  // Generate 15-min time slot drop zones
  const timeSlots = useMemo(() => {
    const slots: { minutes: number; timeStr: string }[] = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
      for (let m = 0; m < 60; m += SNAP_MINUTES) {
        const totalMinutes = h * 60 + m;
        slots.push({ minutes: totalMinutes, timeStr: minutesToTime(totalMinutes) });
      }
    }
    return slots;
  }, []);

  // Hour labels
  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = DAY_START_HOUR; i < DAY_END_HOUR; i++) {
      h.push(i);
    }
    return h;
  }, []);

  // Auto-scroll to current time on mount
  useEffect(() => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    if (minutes >= DAY_START_HOUR * 60 && minutes <= DAY_END_HOUR * 60) {
      const scrollTop = minutesToTop(minutes) - 200; // offset to show some context above
      scrollRef.current?.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
    }
  }, [dateKey]);

  // Resize handling via pointer events
  const handleResizeStart = useCallback((taskId: string) => {
    setResizingTaskId(taskId);
  }, []);

  useEffect(() => {
    if (!resizingTaskId) return;

    const task = scheduled.find((t) => t.id === resizingTaskId);
    if (!task) return;

    const initialMinutes = task.estimated_minutes || DEFAULT_DURATION;
    let currentMinutes = initialMinutes;

    const handlePointerMove = (e: PointerEvent) => {
      const deltaY = e.clientY - resizeStartY.current;
      const deltaMinutes = (deltaY / HOUR_HEIGHT_PX) * 60;
      const newMinutes = snapToGrid(Math.max(SNAP_MINUTES, resizeStartMinutes.current + deltaMinutes));
      currentMinutes = newMinutes;

      // Visual feedback: update block height directly for responsiveness
      const block = document.querySelector(`[data-resize-id="${resizingTaskId}"]`) as HTMLElement;
      if (block) {
        block.style.height = `${durationToHeight(newMinutes)}px`;
      }
    };

    const handlePointerUp = async () => {
      setResizingTaskId(null);
      if (currentMinutes !== initialMinutes) {
        await window.electronAPI.tasks.update(resizingTaskId, { estimated_minutes: currentMinutes });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    // Capture initial position
    resizeStartMinutes.current = initialMinutes;
    const handleInitMove = (e: PointerEvent) => {
      if (resizeStartY.current === 0) resizeStartY.current = e.clientY;
      handlePointerMove(e);
    };

    document.addEventListener('pointermove', handleInitMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handleInitMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizingTaskId, scheduled, queryClient]);

  // Panel resize handling
  const handlePanelResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    panelResizeStartX.current = e.clientX;
    panelResizeStartWidth.current = panelWidth;
    setIsResizingPanel(true);
  }, [panelWidth]);

  useEffect(() => {
    if (!isResizingPanel) return;

    const handlePointerMove = (e: PointerEvent) => {
      const delta = e.clientX - panelResizeStartX.current;
      const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, panelResizeStartWidth.current + delta));
      setPanelWidth(newWidth);
    };

    const handlePointerUp = () => {
      setIsResizingPanel(false);
      localStorage.setItem('dayView:unscheduledWidth', String(panelWidth));
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isResizingPanel, panelWidth]);

  return (
    <div className={cn('flex h-full overflow-hidden', isResizingPanel && 'select-none cursor-col-resize')}>
      {/* Unscheduled sidebar */}
      <UnscheduledSidebar
        tasks={unscheduled}
        selectedTaskId={selectedTaskId}
        onSelectTask={onSelectTask}
        width={panelWidth}
      />

      {/* Resize handle */}
      <div
        className={cn(
          'w-1 shrink-0 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors',
          isResizingPanel && 'bg-primary/50',
        )}
        onPointerDown={handlePanelResizeStart}
      />

      {/* Time grid */}
      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div className="relative" style={{ height: `${TOTAL_HEIGHT}px`, minWidth: '300px' }}>
          {/* Hour grid lines and labels */}
          {hours.map((hour) => {
            const top = (hour - DAY_START_HOUR) * HOUR_HEIGHT_PX;
            return (
              <div key={hour} className="absolute left-0 right-0" style={{ top: `${top}px` }}>
                {/* Hour label */}
                <div className="absolute left-1 -top-2.5 text-xs text-muted-foreground w-12 text-right pr-2">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                {/* Full hour line */}
                <div className="absolute left-14 right-0 border-t border-border" />
                {/* Half hour line */}
                <div
                  className="absolute left-14 right-0 border-t border-border/30 border-dashed"
                  style={{ top: `${HOUR_HEIGHT_PX / 2}px` }}
                />
              </div>
            );
          })}

          {/* Droppable 15-min slots */}
          {timeSlots.map((slot) => (
            <TimeSlotDropZone key={slot.timeStr} timeStr={slot.timeStr} minutes={slot.minutes} />
          ))}

          {/* Scheduled task blocks */}
          {scheduled.map((task) => (
            <TimeGridBlock
              key={task.id}
              task={task}
              isSelected={task.id === selectedTaskId}
              onSelect={() => onSelectTask(task)}
              onResizeStart={() => {
                resizeStartY.current = 0;
                handleResizeStart(task.id);
              }}
            />
          ))}

          {/* Current time indicator */}
          <CurrentTimeIndicator />
        </div>
      </div>
    </div>
  );
}
