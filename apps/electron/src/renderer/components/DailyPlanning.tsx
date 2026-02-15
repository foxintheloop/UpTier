import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sunrise,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  Minus,
  CalendarCheck,
  Rocket,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { TaskWithGoals } from '@uptier/shared';

interface DailyPlanningProps {
  onClose: () => void;
  onComplete: () => void;
}

type PlanningStep = 'review' | 'build' | 'schedule' | 'confirm';

const STEPS: PlanningStep[] = ['review', 'build', 'schedule', 'confirm'];

const STEP_LABELS: Record<PlanningStep, string> = {
  review: 'Review Yesterday',
  build: "Build Today's List",
  schedule: 'Schedule',
  confirm: 'Confirm',
};

export function DailyPlanning({ onClose, onComplete }: DailyPlanningProps) {
  const [step, setStep] = useState<PlanningStep>('review');
  const [todayTaskIds, setTodayTaskIds] = useState<Set<string>>(new Set());
  const [scheduledTasks, setScheduledTasks] = useState<Map<string, string>>(new Map()); // taskId -> time
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Step 1 data
  const { data: yesterday } = useQuery({
    queryKey: ['planning', 'yesterday'],
    queryFn: () => window.electronAPI.planning.getYesterdaySummary(),
  });

  // Step 2 data
  const { data: availableTasks = [] } = useQuery<TaskWithGoals[]>({
    queryKey: ['planning', 'available'],
    queryFn: () => window.electronAPI.planning.getAvailableTasks(),
  });

  // Step 2/3 data
  const { data: todayOverview } = useQuery({
    queryKey: ['planning', 'today'],
    queryFn: () => window.electronAPI.planning.getTodayOverview(),
  });

  // Settings
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.electronAPI.settings.get(),
  });

  const workingHours = (settings as { planning?: { workingHoursPerDay?: number } })?.planning?.workingHoursPerDay ?? 8;

  // Initialize today tasks from existing scheduled tasks
  useEffect(() => {
    if (todayOverview) {
      const ids = new Set<string>();
      const times = new Map<string, string>();
      for (const t of [...todayOverview.scheduled, ...todayOverview.unscheduled]) {
        ids.add(t.id);
        if (t.due_time) {
          times.set(t.id, t.due_time);
        }
      }
      setTodayTaskIds(ids);
      setScheduledTasks(times);
    }
  }, [todayOverview]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        handleNext();
      } else if (e.key === 'Backspace' && !isInputFocused()) {
        handleBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const isInputFocused = () => {
    const el = document.activeElement;
    return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
  };

  const stepIndex = STEPS.indexOf(step);

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1]);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1]);
    }
  };

  // Step 1 actions
  const handleReschedule = async (taskId: string) => {
    await window.electronAPI.tasks.update(taskId, { due_date: today });
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleDefer = async (taskId: string) => {
    await window.electronAPI.tasks.update(taskId, { due_date: null });
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleDrop = async (taskId: string) => {
    await window.electronAPI.tasks.complete(taskId);
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // Step 2 actions
  const addToToday = async (task: TaskWithGoals) => {
    if (todayTaskIds.has(task.id)) return;
    await window.electronAPI.tasks.update(task.id, { due_date: today });
    setTodayTaskIds((prev) => new Set(prev).add(task.id));
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const removeFromToday = async (task: TaskWithGoals) => {
    await window.electronAPI.tasks.update(task.id, { due_date: null });
    setTodayTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // Step 3 actions
  const handleScheduleTime = async (taskId: string, time: string) => {
    await window.electronAPI.tasks.update(taskId, { due_date: today, due_time: time });
    setScheduledTasks((prev) => new Map(prev).set(taskId, time));
    queryClient.invalidateQueries({ queryKey: ['planning'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // Computed values
  const todayTasks = useMemo(() => {
    return availableTasks.filter((t) => todayTaskIds.has(t.id));
  }, [availableTasks, todayTaskIds]);

  const totalPlannedMinutes = useMemo(() => {
    return todayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  }, [todayTasks]);

  const capacityPercent = Math.min(100, (totalPlannedMinutes / (workingHours * 60)) * 100);

  const formatMinutes = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${mins}m`;
  };

  // Finish planning
  const handleFinish = async () => {
    await window.electronAPI.planning.setLastPlanningDate(today);
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <Sunrise className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Plan My Day</h1>
          <span className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 py-4">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors',
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : i < stepIndex
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground'
              )}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium border border-current">
                {i < stepIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('w-8 h-0.5', i < stepIndex ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-8">
        <ScrollArea className="h-full">
          <div className="max-w-3xl mx-auto py-6">
            {step === 'review' && (
              <ReviewStep
                completed={yesterday?.completed ?? []}
                incomplete={yesterday?.incomplete ?? []}
                onReschedule={handleReschedule}
                onDefer={handleDefer}
                onDrop={handleDrop}
              />
            )}
            {step === 'build' && (
              <BuildStep
                availableTasks={availableTasks}
                todayTaskIds={todayTaskIds}
                onAddToToday={addToToday}
                onRemoveFromToday={removeFromToday}
                totalMinutes={totalPlannedMinutes}
                capacityPercent={capacityPercent}
                workingHours={workingHours}
              />
            )}
            {step === 'schedule' && (
              <ScheduleStep
                todayTasks={todayTasks}
                scheduledTasks={scheduledTasks}
                onScheduleTime={handleScheduleTime}
                totalMinutes={totalPlannedMinutes}
                workingHours={workingHours}
              />
            )}
            {step === 'confirm' && (
              <ConfirmStep
                taskCount={todayTasks.length}
                totalMinutes={totalPlannedMinutes}
                workingHours={workingHours}
                scheduledCount={scheduledTasks.size}
              />
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={stepIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          className="gap-2"
        >
          {stepIndex === STEPS.length - 1 ? (
            <>
              <Rocket className="h-4 w-4" />
              Start My Day
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Step 1: Review Yesterday
// ============================================================================

function ReviewStep({
  completed,
  incomplete,
  onReschedule,
  onDefer,
  onDrop,
}: {
  completed: TaskWithGoals[];
  incomplete: TaskWithGoals[];
  onReschedule: (id: string) => void;
  onDefer: (id: string) => void;
  onDrop: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Review Yesterday</h2>
        <p className="text-muted-foreground">Let's see how yesterday went</p>
      </div>

      {/* Completed celebration */}
      {completed.length > 0 && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <span className="font-medium text-green-400">
              You completed {completed.length} task{completed.length !== 1 ? 's' : ''}!
            </span>
          </div>
          <div className="space-y-1.5">
            {completed.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                <span className="line-through">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed.length === 0 && incomplete.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tasks from yesterday to review.</p>
          <p className="text-sm mt-1">Let's plan a productive day!</p>
        </div>
      )}

      {/* Incomplete tasks */}
      {incomplete.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Incomplete ({incomplete.length})
          </h3>
          <div className="space-y-2">
            {incomplete.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-md border border-border bg-card"
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="text-sm font-medium truncate">{task.title}</div>
                  {task.estimated_minutes && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      {task.estimated_minutes}m
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReschedule(task.id)}
                    className="h-7 text-xs"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDefer(task.id)}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Defer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDrop(task.id)}
                    className="h-7 text-xs text-muted-foreground"
                  >
                    Drop
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step 2: Build Today's List
// ============================================================================

function BuildStep({
  availableTasks,
  todayTaskIds,
  onAddToToday,
  onRemoveFromToday,
  totalMinutes,
  capacityPercent,
  workingHours,
}: {
  availableTasks: TaskWithGoals[];
  todayTaskIds: Set<string>;
  onAddToToday: (task: TaskWithGoals) => void;
  onRemoveFromToday: (task: TaskWithGoals) => void;
  totalMinutes: number;
  capacityPercent: number;
  workingHours: number;
}) {
  const notSelectedTasks = availableTasks.filter((t) => !todayTaskIds.has(t.id));
  const selectedTasks = availableTasks.filter((t) => todayTaskIds.has(t.id));

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Build Today's List</h2>
        <p className="text-muted-foreground">Choose which tasks to tackle today</p>
      </div>

      {/* Capacity meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Capacity</span>
          <span className={cn(
            'font-medium',
            capacityPercent > 80 ? 'text-amber-400' : 'text-foreground'
          )}>
            {totalMinutes > 0 ? formatMinutesCompact(totalMinutes) : '0m'} / {workingHours}h
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              capacityPercent > 80 ? 'bg-amber-400' : 'bg-primary'
            )}
            style={{ width: `${Math.min(100, capacityPercent)}%` }}
          />
        </div>
        {capacityPercent > 80 && (
          <div className="flex items-center gap-1 text-xs text-amber-400">
            <AlertCircle className="h-3 w-3" />
            You may be over-committing — consider removing some tasks
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Available tasks */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Available ({notSelectedTasks.length})
          </h3>
          <div className="space-y-1.5">
            {notSelectedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">All tasks added</p>
            ) : (
              notSelectedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  action={
                    <button
                      onClick={() => onAddToToday(task)}
                      className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Today's tasks */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Today ({selectedTasks.length})
          </h3>
          <div className="space-y-1.5">
            {selectedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">Add tasks from the left</p>
            ) : (
              selectedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  action={
                    <button
                      onClick={() => onRemoveFromToday(task)}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 3: Schedule
// ============================================================================

const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => {
  const hour = 6 + i;
  return {
    value: `${hour.toString().padStart(2, '0')}:00`,
    label: `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`,
  };
});

function ScheduleStep({
  todayTasks,
  scheduledTasks,
  onScheduleTime,
  totalMinutes,
  workingHours,
}: {
  todayTasks: TaskWithGoals[];
  scheduledTasks: Map<string, string>;
  onScheduleTime: (taskId: string, time: string) => void;
  totalMinutes: number;
  workingHours: number;
}) {
  const unscheduled = todayTasks.filter((t) => !scheduledTasks.has(t.id));
  const scheduled = todayTasks
    .filter((t) => scheduledTasks.has(t.id))
    .sort((a, b) => (scheduledTasks.get(a.id) || '').localeCompare(scheduledTasks.get(b.id) || ''));

  const estimateFinishTime = () => {
    if (totalMinutes === 0) return null;
    const now = new Date();
    const startHour = Math.max(now.getHours(), 6);
    const finishTime = new Date();
    finishTime.setHours(startHour, now.getMinutes() + totalMinutes, 0, 0);
    return format(finishTime, 'h:mm a');
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Schedule Your Day</h2>
        <p className="text-muted-foreground">
          {formatMinutesCompact(totalMinutes)} planned / {workingHours}h available
          {estimateFinishTime() && ` — Finish by ${estimateFinishTime()}`}
        </p>
      </div>

      {/* Scheduled tasks */}
      {scheduled.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Scheduled
          </h3>
          <div className="space-y-1.5">
            {scheduled.map((task) => {
              const time = scheduledTasks.get(task.id)!;
              const hour = parseInt(time.split(':')[0]);
              const label = `${hour > 12 ? hour - 12 : hour}:${time.split(':')[1]} ${hour >= 12 ? 'PM' : 'AM'}`;
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-md border border-border bg-card"
                >
                  <span className="text-sm font-medium text-primary w-20">{label}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{task.title}</div>
                    {task.estimated_minutes && (
                      <span className="text-xs text-muted-foreground">{task.estimated_minutes}m</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unscheduled tasks */}
      {unscheduled.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Unscheduled ({unscheduled.length})
          </h3>
          <div className="space-y-2">
            {unscheduled.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-md border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{task.title}</div>
                  {task.estimated_minutes && (
                    <span className="text-xs text-muted-foreground">{task.estimated_minutes}m</span>
                  )}
                </div>
                <select
                  className="text-sm bg-secondary border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onScheduleTime(task.id, e.target.value);
                    }
                  }}
                >
                  <option value="" disabled>
                    Pick time...
                  </option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {todayTasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tasks to schedule.</p>
          <p className="text-sm mt-1">Go back and add some tasks first.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step 4: Confirm
// ============================================================================

function ConfirmStep({
  taskCount,
  totalMinutes,
  workingHours,
  scheduledCount,
}: {
  taskCount: number;
  totalMinutes: number;
  workingHours: number;
  scheduledCount: number;
}) {
  const estimateFinishTime = () => {
    if (totalMinutes === 0) return null;
    const now = new Date();
    const startHour = Math.max(now.getHours(), 6);
    const finishTime = new Date();
    finishTime.setHours(startHour, now.getMinutes() + totalMinutes, 0, 0);
    return format(finishTime, 'h:mm a');
  };

  return (
    <div className="space-y-8 py-8">
      <div className="text-center space-y-2">
        <CalendarCheck className="h-12 w-12 text-primary mx-auto" />
        <h2 className="text-2xl font-semibold">Ready to Go!</h2>
        <p className="text-muted-foreground">Here's your day at a glance</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <SummaryCard label="Tasks" value={`${taskCount}`} />
        <SummaryCard label="Total Time" value={totalMinutes > 0 ? formatMinutesCompact(totalMinutes) : '—'} />
        <SummaryCard label="Scheduled" value={`${scheduledCount}`} />
        <SummaryCard
          label="Finish by"
          value={estimateFinishTime() || '—'}
        />
      </div>

      {totalMinutes > workingHours * 60 && (
        <div className="flex items-center justify-center gap-2 text-sm text-amber-400">
          <AlertCircle className="h-4 w-4" />
          You have more planned than available hours — pace yourself!
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 text-xs bg-secondary border border-border rounded">Enter</kbd> or click "Start My Day" to begin
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Shared Components
// ============================================================================

function TaskCard({ task, action }: { task: TaskWithGoals; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-md border border-border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{task.title}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {task.priority_tier && (
            <span className={cn(
              task.priority_tier === 1 && 'text-red-400',
              task.priority_tier === 2 && 'text-amber-400',
            )}>
              P{task.priority_tier}
            </span>
          )}
          {task.estimated_minutes && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {task.estimated_minutes}m
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-0.5">
              <Calendar className="h-3 w-3" />
              {format(new Date(task.due_date + 'T00:00'), 'MMM d')}
            </span>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card text-center">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function formatMinutesCompact(mins: number): string {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}
